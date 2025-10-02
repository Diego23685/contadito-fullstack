using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Contadito.Api.Data;
using Contadito.Api.Domain.DTOs;
using Contadito.Api.Domain.Entities;
using Contadito.Api.Infrastructure.Email;
using Contadito.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly JwtOptions _jwt;
        private readonly IEmailSender _emailSender;

        public AuthController(AppDbContext db, IOptions<JwtOptions> jwt, IEmailSender emailSender)
        {
            _db = db;
            _jwt = jwt.Value;
            _emailSender = emailSender;
        }

        [HttpPost("register-tenant")]
        public async Task<ActionResult> RegisterTenant([FromBody] RegisterTenantRequest req)
        {
            if (await _db.Tenants.AnyAsync(t => t.Name == req.TenantName))
                return Conflict("Tenant name already exists");

            if (await _db.Users.AnyAsync(u => u.Email == req.OwnerEmail && u.DeletedAt == null))
                return Conflict("Email already exists");

            var tenant = new Tenant { Name = req.TenantName };
            _db.Tenants.Add(tenant);
            await _db.SaveChangesAsync();

            var user = new User
            {
                TenantId = tenant.Id,
                Name = req.OwnerName,
                Email = req.OwnerEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = "owner",
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await CreateAndSendOtpAsync(user, "register");

            // 202: se requiere verificación
            return Accepted(new { message = "Verification code sent to email", email = user.Email });
        }

        [HttpPost("request-email-code")]
        public async Task<ActionResult> RequestEmailCode([FromBody] RequestEmailCodeDto req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.DeletedAt == null);
            if (user is null) return NotFound("User not found");
            if (user.EmailVerifiedAt != null) return BadRequest("Email already verified");

            // cooldown simple de 60s
            var last = await _db.EmailVerifications
                .Where(x => x.UserId == user.Id && x.Purpose == req.Purpose && x.ConsumedAt == null)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (last?.LastSentAt != null && (DateTime.UtcNow - last.LastSentAt.Value).TotalSeconds < 60)
                return StatusCode(429, "Please wait before requesting another code");

            await CreateAndSendOtpAsync(user, req.Purpose);
            return Ok(new { message = "Code sent" });
        }

        [HttpPost("verify-email-code")]
        public async Task<ActionResult<AuthResponse>> VerifyEmailCode([FromBody] VerifyEmailCodeDto req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.DeletedAt == null);
            if (user is null) return NotFound("User not found");
            if (user.EmailVerifiedAt != null) return BadRequest("Email already verified");

            var ev = await _db.EmailVerifications
                .Where(x => x.UserId == user.Id && x.Purpose == req.Purpose && x.ConsumedAt == null)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (ev is null) return BadRequest("No active code. Request a new one.");
            if (DateTime.UtcNow > ev.ExpiresAt) return BadRequest("Code expired");
            if (ev.Attempts >= ev.MaxAttempts) return BadRequest("Max attempts exceeded");

            ev.Attempts++;

            if (!Otp.Verify(req.Code, ev.CodeHash))
            {
                await _db.SaveChangesAsync();
                return Unauthorized("Invalid code");
            }

            // OK
            ev.ConsumedAt = DateTime.UtcNow;
            user.EmailVerifiedAt = DateTime.UtcNow;
            user.Status = "active";
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return Ok(new AuthResponse(token, _jwt.ExpiresMinutes * 60));
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && u.DeletedAt == null);
            if (user == null) return Unauthorized("Invalid credentials");
            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials");

            // 🔒 bloquear login si no está verificado
            if (user.EmailVerifiedAt == null)
                return Unauthorized("Email not verified");

            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return Ok(new AuthResponse(token, _jwt.ExpiresMinutes * 60));
        }

        private async Task CreateAndSendOtpAsync(User user, string purpose)
        {
            // Invalida códigos previos no consumidos (opcional pero recomendable)
            var old = _db.EmailVerifications.Where(x => x.UserId == user.Id && x.Purpose == purpose && x.ConsumedAt == null);
            _db.EmailVerifications.RemoveRange(old);
            await _db.SaveChangesAsync();

            var code = Otp.GenerateNumeric(6);
            var ev = new EmailVerification
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Email = user.Email,
                Purpose = purpose,
                CodeHash = Otp.Hash(code),
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                Attempts = 0,
                MaxAttempts = 5,
                LastSentAt = DateTime.UtcNow
            };
            _db.EmailVerifications.Add(ev);
            await _db.SaveChangesAsync();

            var subject = "Tu código de verificación";
            var html = $@"
<div style='font-family:system-ui,-apple-system,Segoe UI,Roboto'>
  <h2>Verifica tu correo</h2>
  <p>Tu código es:</p>
  <div style='font-size:28px;font-weight:700;letter-spacing:6px'>{code}</div>
  <p>Expira en 10 minutos. Si no fuiste tú, ignora este mensaje.</p>
</div>";

            await _emailSender.SendAsync(user.Email, subject, html, $"Tu código es: {code}");
        }

        private string GenerateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("tenant_id", user.TenantId.ToString()),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("email_verified", user.EmailVerifiedAt != null ? "true" : "false")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
