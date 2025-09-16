using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Contadito.Api.Data;
using Contadito.Api.Infrastructure;
using Contadito.Api.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

// CORS (dev): permitir todos los metodos, headers y origenes
builder.Services.AddCors(o => o.AddPolicy("allow-all", p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// DB: usa MySQL si hay cadena de conexion; si no, InMemory para desarrollo
var mySql = builder.Configuration.GetConnectionString("MySql");
if (!string.IsNullOrWhiteSpace(mySql))
{
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseMySql(mySql, ServerVersion.AutoDetect(mySql)));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(opt =>
        opt.UseInMemoryDatabase("contadito"));
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
// Clave de 32+ bytes para HS256
var rawKey = string.IsNullOrWhiteSpace(jwt.Key) ? "super-secret-dev-key-32bytes-minimo" : jwt.Key!;
if (rawKey.Length < 32)
{
    // asegurar longitud minima en dev
    rawKey = rawKey.PadRight(32, 'x');
}
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(rawKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Pipeline
app.UseRouting();
app.UseCors("allow-all");
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

// Seed rapido si InMemory
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsInMemory())
    {
        Seed.Run(db);
    }
}

app.Run();

namespace Contadito.Api.Infrastructure
{
    public class TenantMiddleware
    {
        private readonly RequestDelegate _next;
        public TenantMiddleware(RequestDelegate next) { _next = next; }

        public async Task Invoke(HttpContext ctx)
        {
            var tid = ctx.User?.Claims?.FirstOrDefault(c => c.Type == "tenant_id")?.Value;
            if (!string.IsNullOrEmpty(tid) && long.TryParse(tid, out var tlong))
            {
                ctx.Items["TenantId"] = tlong;
            }
            await _next(ctx);
        }
    }
}
