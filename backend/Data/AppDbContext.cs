using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Contadito.Api.Domain.Entities;
using Contadito.Api.Domain.Views; // v_avg_cost y v_stock

namespace Contadito.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

        public DbSet<User> Users => Set<User>();
        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Warehouse> Warehouses => Set<Warehouse>();
        public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
        public DbSet<SalesItem> SalesItems => Set<SalesItem>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<AvgCostView> AvgCosts => Set<AvgCostView>();
        public DbSet<StockView> Stocks => Set<StockView>();

        // Compras
        public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
        public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();

        // Precios especiales (si los usas)
        public DbSet<SpecialPrice> SpecialPrices => Set<SpecialPrice>();

        protected override void OnModelCreating(ModelBuilder mb)
        {
            mb.Entity<Tenant>().HasKey(t => t.Id);
            mb.Entity<User>().HasKey(u => u.Id);
            mb.Entity<Product>().HasKey(p => p.Id);
            mb.Entity<Customer>().HasKey(c => c.Id);

            // Warehouse
            mb.Entity<Warehouse>().HasKey(w => w.Id);
            mb.Entity<Warehouse>().Property(w => w.Name).IsRequired();
            mb.Entity<Warehouse>().HasIndex(w => new { w.TenantId, w.Name });

            // Users
            mb.Entity<User>().HasIndex(u => new { u.TenantId, u.Email }).IsUnique();

            // Product
            mb.Entity<Product>().HasIndex(p => new { p.TenantId, p.Sku }).IsUnique();
            mb.Entity<Product>().Property(p => p.ListPrice).HasColumnType("decimal(18,2)");
            mb.Entity<Product>().Property(p => p.StdCost).HasColumnType("decimal(18,6)");

            // SpecialPrice
            mb.Entity<SpecialPrice>().HasKey(sp => sp.Id);
            mb.Entity<SpecialPrice>()
                .HasIndex(sp => new { sp.TenantId, sp.CustomerId, sp.ProductId, sp.ActiveTo })
                .IsUnique();
            mb.Entity<SpecialPrice>().Property(sp => sp.Price).HasColumnType("decimal(18,2)");

            // ✅ Compras
            mb.Entity<PurchaseInvoice>().HasKey(pi => pi.Id);
            mb.Entity<PurchaseInvoice>().HasIndex(pi => new { pi.TenantId, pi.ReceivedAt });
            mb.Entity<PurchaseInvoice>().Property(pi => pi.Subtotal).HasColumnType("decimal(18,2)");
            mb.Entity<PurchaseInvoice>().Property(pi => pi.TaxTotal).HasColumnType("decimal(18,2)");
            mb.Entity<PurchaseInvoice>().Property(pi => pi.DiscountTotal).HasColumnType("decimal(18,2)");
            mb.Entity<PurchaseInvoice>().Property(pi => pi.Total).HasColumnType("decimal(18,2)");

            mb.Entity<PurchaseItem>().HasKey(i => i.Id);
            mb.Entity<PurchaseItem>().HasIndex(i => new { i.TenantId, i.InvoiceId });
            mb.Entity<PurchaseItem>().Property(i => i.Quantity).HasColumnType("decimal(18,6)");
            mb.Entity<PurchaseItem>().Property(i => i.UnitCost).HasColumnType("decimal(18,6)");
            mb.Entity<PurchaseItem>().Property(i => i.TaxRate).HasColumnType("decimal(5,2)");
            mb.Entity<PurchaseItem>().Property(i => i.DiscountRate).HasColumnType("decimal(5,2)");
            mb.Entity<PurchaseItem>().Property(i => i.Total).HasColumnType("decimal(18,2)");

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

                var user = new User
                {
                    Id = 1, TenantId = t.Id, Name = "Owner Demo",
                    Email = "owner@demo.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
                    Role = "owner", Status = "active",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                };
                db.Users.Add(user);

                db.Products.Add(new Product
                {
                    Id = 1, TenantId = t.Id, Sku = "SKU-001", Name = "Producto Demo",
                    Unit = "unidad", TrackStock = true,
                    ListPrice = 250.00m, StdCost = 120.123456m,
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                });

                db.Customers.AddRange(
                    new Customer { Id = 1, TenantId = t.Id, Name = "Juan Pérez",
                                   Email = "juan@example.com", Phone = "+505 5555-0001",
                                   CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                    new Customer { Id = 2, TenantId = t.Id, Name = "María López",
                                   Email = "maria@example.com", Phone = "+505 5555-0002",
                                   CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
                );

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
