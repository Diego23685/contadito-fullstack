using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Contadito.Api.Data;
using Contadito.Api.Domain.DTOs;
using Contadito.Api.Domain.Entities;
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

        public AuthController(AppDbContext db, IOptions<JwtOptions> jwt)
        {
            _db = db;
            _jwt = jwt.Value;
        }

        [HttpPost("register-tenant")]
        public async Task<ActionResult<AuthResponse>> RegisterTenant([FromBody] RegisterTenantRequest req)
        {
            if (await _db.Tenants.AnyAsync(t => t.Name == req.TenantName))
                return Conflict("Tenant name already exists");

            var tenant = new Tenant { Name = req.TenantName };
            await _db.Tenants.AddAsync(tenant);
            await _db.SaveChangesAsync();

            var user = new User
            {
                TenantId = tenant.Id,
                Name = req.OwnerName,
                Email = req.OwnerEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = "owner",
                Status = "active"
            };
            await _db.Users.AddAsync(user);
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

            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = GenerateToken(user);
            return Ok(new AuthResponse(token, _jwt.ExpiresMinutes * 60));
        }

        private string GenerateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim("tenant_id", user.TenantId.ToString()),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(JwtRegisteredClaimNames.Email, user.Email)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwt.ExpiresMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
