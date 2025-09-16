using Microsoft.EntityFrameworkCore;
using Contadito.Api.Domain.Entities;

namespace Contadito.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}
        public DbSet<User> Users => Set<User>();
        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Product> Products => Set<Product>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            mb.Entity<Tenant>().HasKey(t => t.Id);
            mb.Entity<User>().HasKey(u => u.Id);
            mb.Entity<Product>().HasKey(p => p.Id);

            mb.Entity<User>()
                .HasIndex(u => new { u.TenantId, u.Email }).IsUnique();

            base.OnModelCreating(mb);
        }
    }

    public static class Seed
    {
        public static void Run(AppDbContext db)
        {
            if (!db.Tenants.Any())
            {
                var t = new Tenant { Name = "DemoPyme", Id = 1 };
                db.Tenants.Add(t);
                db.SaveChanges();

                var user = new User {
                    Id = 1,
                    TenantId = t.Id,
                    Name = "Owner Demo",
                    Email = "owner@demo.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                    Role = "owner",
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);

                db.Products.Add(new Product{
                    Id = 1, TenantId = t.Id, Sku="SKU-001", Name="Producto Demo", Unit="unidad", TrackStock=true, CreatedAt=DateTime.UtcNow, UpdatedAt=DateTime.UtcNow
                });

                db.SaveChanges();
            }
        }
    }
}
