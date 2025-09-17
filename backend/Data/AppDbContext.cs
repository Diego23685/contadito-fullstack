using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Contadito.Api.Domain.Entities;
using Contadito.Api.Domain.Views; // <—

namespace Contadito.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

        public DbSet<User> Users => Set<User>();
        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Warehouse> Warehouses => Set<Warehouse>();   // <-- NUEVO
        public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
        public DbSet<SalesItem> SalesItems => Set<SalesItem>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<AvgCostView> AvgCosts => Set<AvgCostView>();
        public DbSet<StockView> Stocks => Set<StockView>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            mb.Entity<Tenant>().HasKey(t => t.Id);
            mb.Entity<User>().HasKey(u => u.Id);
            mb.Entity<Product>().HasKey(p => p.Id);
            mb.Entity<Customer>().HasKey(c => c.Id);

            // ✅ Warehouse
            mb.Entity<Warehouse>().HasKey(w => w.Id);
            mb.Entity<Warehouse>()
                .Property(w => w.Name).IsRequired();
            mb.Entity<Warehouse>()
                .HasIndex(w => new { w.TenantId, w.Name }); // búsqueda rápida

            mb.Entity<User>()
                .HasIndex(u => new { u.TenantId, u.Email }).IsUnique();

             // Vistas keyless
            mb.Entity<AvgCostView>().ToView("v_avg_cost").HasNoKey();
            mb.Entity<StockView>().ToView("v_stock").HasNoKey();

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
                    Id = 1, TenantId = t.Id, Name = "Owner Demo",
                    Email = "owner@demo.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                    Role = "owner", Status = "active",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);

                db.Products.Add(new Product{
                    Id = 1, TenantId = t.Id, Sku="SKU-001", Name="Producto Demo",
                    Unit="unidad", TrackStock=true,
                    CreatedAt=DateTime.UtcNow, UpdatedAt=DateTime.UtcNow
                });

                db.Customers.AddRange(
                    new Customer { Id = 1, TenantId = t.Id, Name = "Juan Pérez",
                                   Email = "juan@example.com", Phone = "+505 5555-0001",
                                   CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Customer { Id = 2, TenantId = t.Id, Name = "María López",
                                   Email = "maria@example.com", Phone = "+505 5555-0002",
                                   CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                );

                // ✅ Semilla de almacenes
                db.Warehouses.AddRange(
                    new Warehouse { Id = 1, TenantId = t.Id, Name = "Principal",
                                    Code = "WH-01", Address = "Bodega central",
                                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Warehouse { Id = 2, TenantId = t.Id, Name = "Sucursal León",
                                    Code = "WH-LEO", Address = "León, NIC",
                                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                );

                db.SaveChanges();
            }
        }
    }
}
