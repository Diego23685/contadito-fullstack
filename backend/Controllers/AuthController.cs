using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Linq; // FirstOrDefault
using Contadito.Api.Data;
using Contadito.Api.Domain.DTOs;
using Contadito.Api.Domain.Entities;
using Contadito.Api.Infrastructure.Email;
using Contadito.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
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

        public AuthController(
            AppDbContext db,
            IOptions<JwtOptions> jwt,
            IEmailSender emailSender)
        {
            _db = db;
            _jwt = jwt.Value;
            _emailSender = emailSender;
        }

        // ===== Helpers =====

        private async Task SendWelcomeEmailAsync(User user, Tenant tenant)
        {
            // Evita duplicados si ya se envió
            if (user.WelcomeEmailSentAt != null) return;

            // Asegura un nombre para saludo
            var friendly = user.Name ?? user.Email ?? "amigo/a";
            var firstName = (friendly.Split(' ').FirstOrDefault() ?? friendly).Trim();
            var subject = $"¡Bienvenido a Contadito, {firstName}!";

            // ✅ Garantiza email no-nulo (si tu modelo permite null)
            var to = user.Email ?? throw new InvalidOperationException("User.Email es null; no se puede enviar correo de bienvenida.");

            var html = $@"
<div style='font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.45;color:#0f172a'>
  <div style='max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px'>
    <h1 style='margin:0 0 8px 0;font-size:22px'>¡Tu cuenta está lista!</h1>
    <p style='margin:0 0 14px 0'>Hola <strong>{System.Net.WebUtility.HtmlEncode(firstName)}</strong>, gracias por unirte a <strong>Contadito</strong>.</p>
    <p style='margin:0 0 12px 0'>Creamos tu espacio <strong>{System.Net.WebUtility.HtmlEncode(tenant.Name)}</strong>. Desde aquí podrás registrar ventas, gastos e inventario, y ver paneles claros para tus decisiones.</p>
    <div style='margin:18px 0'>
      <a href='#' style='display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600'>
        Abrir mi panel
      </a>
    </div>
    <p style='margin:14px 0 0 0;color:#475569;font-size:13px'>Sugerencias para arrancar:</p>
    <ul style='margin:8px 0 0 18px;color:#334155;font-size:14px'>
      <li>Configura tu país y moneda en el onboarding.</li>
      <li>Crea tus primeros productos/servicios.</li>
      <li>Registra una venta de prueba para ver el dashboard.</li>
    </ul>
    <hr style='border:none;border-top:1px solid #e5e7eb;margin:18px 0'/>
    <p style='margin:0;color:#64748b;font-size:12px'>Si no fuiste tú, te recomendamos tomar medidas de seguridad.</p>
  </div>
  <p style='text-align:center;color:#94a3b8;font-size:11px;margin-top:10px'>© {DateTime.UtcNow.Year} Contadito by PapuThink</p>
</div>";

            var text = $@"¡Tu cuenta está lista!

Hola {firstName},

Gracias por unirte a Contadito. Creamos tu espacio {tenant.Name}.
Sugerencias para arrancar:
• Configura tu país y moneda
• Crea tus primeros productos/servicios
• Registra una venta de prueba

© {DateTime.UtcNow.Year} Contadito";

            await _emailSender.SendAsync(to, subject, html, text);

            user.WelcomeEmailSentAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        private async Task CreateAndSendOtpAsync(User user, string purpose)
        {
            // Invalida códigos previos no consumidos del mismo propósito
            var old = _db.EmailVerifications.Where(x => x.UserId == user.Id && x.Purpose == purpose && x.ConsumedAt == null);
            _db.EmailVerifications.RemoveRange(old);
            await _db.SaveChangesAsync();

            var code = Otp.GenerateNumeric(6);

            // ✅ Email no-nulo
            var to = user.Email ?? throw new InvalidOperationException("User.Email es null; no se puede enviar OTP.");

            var ev = new EmailVerification
            {
                TenantId = user.TenantId,
                UserId = user.Id,
                Email = to,
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

            await _emailSender.SendAsync(to, subject, html, $"Tu código es: {code}");
        }

        private string GenerateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("tenant_id", user.TenantId.ToString()),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
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

        // ===== End Helpers =====

        // === Google Sign-In con auto-alta y flag de onboarding ===
        [HttpPost("google")]
        public async Task<ActionResult<AuthResponse>> GoogleSignIn([FromBody] GoogleSignInDto payload)
        {
            if (string.IsNullOrWhiteSpace(payload.Email) || string.IsNullOrWhiteSpace(payload.Subject))
                return BadRequest("Email y Subject son obligatorios.");

            var now = DateTime.UtcNow;

            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Email == payload.Email && u.DeletedAt == null);

            if (user == null)
            {
                using var tx = await _db.Database.BeginTransactionAsync();

                // 1) Crear tenant trial
                var tenant = new Tenant
                {
                    Name = $"Negocio de {payload.Name ?? payload.Email}",
                    Plan = "free",
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _db.Tenants.Add(tenant);
                await _db.SaveChangesAsync();

                // 2) Usuario owner verificado por Google, en estado 'onboarding'
                user = new User
                {
                    Email = payload.Email,
                    Name = payload.Name ?? payload.Email,
                    TenantId = tenant.Id,
                    Role = "owner",
                    Status = "onboarding",
                    EmailVerifiedAt = now,
                    LastLoginAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                    // contraseña random (por si luego quiere setear una)
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"))
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                // 3) Enlaza external_login google
                _db.ExternalLogins.Add(new ExternalLogin
                {
                    TenantId = tenant.Id,
                    UserId = user.Id,
                    Provider = "google",
                    ProviderUserId = payload.Subject,
                    CreatedAt = now
                });
                await _db.SaveChangesAsync();

                await tx.CommitAsync();

                // 4) Enviar welcome una sola vez
                await SendWelcomeEmailAsync(user, tenant);

                var token = GenerateToken(user);
                return Ok(new AuthResponse
                {
                    Token = token,
                    ExpiresInSeconds = _jwt.ExpiresMinutes * 60,
                    OnboardingRequired = true,
                    TenantId = tenant.Id,
                    Name = user.Name
                });
            }

            // Usuario ya existe → asegura vínculo y actualiza último login
            var hasLogin = await _db.ExternalLogins.AnyAsync(x =>
                x.UserId == user.Id && x.Provider == "google" && x.ProviderUserId == payload.Subject);

            if (!hasLogin)
            {
                _db.ExternalLogins.Add(new ExternalLogin
                {
                    TenantId = user.TenantId,
                    UserId = user.Id,
                    Provider = "google",
                    ProviderUserId = payload.Subject,
                    CreatedAt = now
                });
                await _db.SaveChangesAsync();
            }

            if (user.EmailVerifiedAt == null)
                user.EmailVerifiedAt = now;

            user.LastLoginAt = now;
            user.UpdatedAt = now;
            await _db.SaveChangesAsync();

            var tokenOk = GenerateToken(user);
            return Ok(new AuthResponse
            {
                Token = tokenOk,
                ExpiresInSeconds = _jwt.ExpiresMinutes * 60,
                OnboardingRequired = user.Status == "onboarding",
                TenantId = user.TenantId,
                Name = user.Name
            });
        }

        // === Completar onboarding (nombre del tenant, país/moneda, password opcional) ===
        [Authorize]
        [HttpPost("complete-onboarding")]
        public async Task<IActionResult> CompleteOnboarding([FromBody] CompleteOnboardingDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TenantName))
                return BadRequest("TenantName es obligatorio.");

            var uid = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid)) return Unauthorized();

            var userId = long.Parse(uid);
            var user = await _db.Users.FirstAsync(u => u.Id == userId && u.DeletedAt == null);
            var tenant = await _db.Tenants.FirstAsync(t => t.Id == user.TenantId);

            tenant.Name = dto.TenantName.Trim();

            if (!string.IsNullOrWhiteSpace(dto.CountryCode))
                tenant.Country = dto.CountryCode;

            if (!string.IsNullOrWhiteSpace(dto.Currency))
                tenant.Currency = dto.Currency;

            if (!string.IsNullOrWhiteSpace(dto.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            user.Status = "active";
            tenant.UpdatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            if (user.WelcomeEmailSentAt == null)
            {
                await SendWelcomeEmailAsync(user, tenant);
            }

            return NoContent();
        }

        // === Registro tradicional (con verificación por email/OTP) ===
        [HttpPost("register-tenant")]
        public async Task<ActionResult> RegisterTenant([FromBody] RegisterTenantRequest req)
        {
            if (await _db.Tenants.AnyAsync(t => t.Name == req.TenantName))
                return Conflict("Tenant name already exists");

            if (await _db.Users.AnyAsync(u => u.Email == req.OwnerEmail && u.DeletedAt == null))
                return Conflict("Email already exists");

            var now = DateTime.UtcNow;

            var tenant = new Tenant
            {
                Name = req.TenantName,
                Plan = "free",
                CreatedAt = now,
                UpdatedAt = now
            };
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
                CreatedAt = now,
                UpdatedAt = now
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

            // cooldown de 60s
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
            user.UpdatedAt = DateTime.UtcNow;

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

            // bloquear login si no está verificado
            if (user.EmailVerifiedAt == null)
                return Unauthorized("Email not verified");

            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return Ok(new AuthResponse(token, _jwt.ExpiresMinutes * 60));
        }
    }
}
