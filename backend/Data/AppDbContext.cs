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
        public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();

        public DbSet<ReportDefinition> ReportDefinitions => Set<ReportDefinition>();

        public DbSet<EmailVerification> EmailVerifications => Set<EmailVerification>();

        public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();

        // Compras
        public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
        public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();

        // Precios especiales (si los usas)
        public DbSet<SpecialPrice> SpecialPrices => Set<SpecialPrice>();

        // (Opción A) ❌ Sin ProductImages (se usa images_json en products)

        protected override void OnModelCreating(ModelBuilder mb)
        {
            mb.Entity<Tenant>().HasKey(t => t.Id);
            mb.Entity<User>().HasKey(u => u.Id);
            mb.Entity<Product>().HasKey(p => p.Id);
            mb.Entity<Customer>().HasKey(c => c.Id);

            mb.Entity<ExternalLogin>(e =>
            {
                e.ToTable("external_logins");
                e.HasKey(x => x.Id);

                e.Property(x => x.TenantId).HasColumnName("tenant_id");
                e.Property(x => x.UserId).HasColumnName("user_id");
                e.Property(x => x.Provider).HasColumnName("provider").HasMaxLength(32);
                e.Property(x => x.ProviderUserId).HasColumnName("provider_user_id").HasMaxLength(128);
                e.Property(x => x.CreatedAt).HasColumnName("created_at")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.HasIndex(x => new { x.UserId, x.Provider, x.ProviderUserId })
                    .HasDatabaseName("idx_extlog_user_provider_sub")
                    .IsUnique();
            });

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
            // Índice recomendado para tienda pública
            mb.Entity<Product>().HasIndex(p => new { p.TenantId, p.IsPublic, p.Name });

            mb.Entity<EmailVerification>(e =>
            {
                e.ToTable("email_verifications");
                e.HasKey(x => x.Id);
                e.Property(x => x.Email).HasMaxLength(160);
                e.Property(x => x.Purpose).HasMaxLength(32);

                e.HasIndex(x => new { x.TenantId, x.UserId, x.Purpose, x.Email, x.ExpiresAt })
                    .HasDatabaseName("idx_email_verif_user_purpose");
            });

            // StoreOrder
            mb.Entity<StoreOrder>(e =>
            {
                e.ToTable("store_orders");
                e.HasKey(o => o.Id);
                e.Property(o => o.Id).HasColumnName("id");
                e.Property(o => o.TenantId).HasColumnName("tenant_id");
                e.Property(o => o.CustomerId).HasColumnName("customer_id");
                e.Property(o => o.Number).HasColumnName("number").HasMaxLength(64);
                e.Property(o => o.Status).HasColumnName("status").HasMaxLength(32);
                e.Property(o => o.Subtotal).HasColumnName("subtotal").HasColumnType("decimal(18,2)");
                e.Property(o => o.TaxTotal).HasColumnName("tax_total").HasColumnType("decimal(18,2)");
                e.Property(o => o.ShippingTotal).HasColumnName("shipping_total").HasColumnType("decimal(18,2)");
                e.Property(o => o.DiscountTotal).HasColumnName("discount_total").HasColumnType("decimal(18,2)");
                e.Property(o => o.Total).HasColumnName("total").HasColumnType("decimal(18,2)");
                e.Property(o => o.Currency).HasColumnName("currency").HasMaxLength(8);
                e.Property(o => o.PlacedAt).HasColumnName("placed_at");
                e.Property(o => o.GuestName).HasColumnName("guest_name").HasMaxLength(160);
                e.Property(o => o.GuestEmail).HasColumnName("guest_email").HasMaxLength(160);
                e.Property(o => o.GuestPhone).HasColumnName("guest_phone").HasMaxLength(32);
                e.Property(o => o.ShippingAddress).HasColumnName("shipping_address").HasMaxLength(280);

                e.HasIndex(o => o.TenantId).HasDatabaseName("idx_so_tenant");
                e.HasIndex(o => o.Number).IsUnique().HasDatabaseName("uq_so_number");
            });

            // StoreOrderItem
            mb.Entity<StoreOrderItem>(e =>
            {
                e.ToTable("store_order_items");
                e.HasKey(i => i.Id);
                e.Property(i => i.Id).HasColumnName("id");
                e.Property(i => i.TenantId).HasColumnName("tenant_id");
                e.Property(i => i.OrderId).HasColumnName("order_id");
                e.Property(i => i.ProductId).HasColumnName("product_id");
                e.Property(i => i.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,6)");
                e.Property(i => i.UnitPrice).HasColumnName("unit_price").HasColumnType("decimal(18,2)");
                e.Property(i => i.Total).HasColumnName("total").HasColumnType("decimal(18,2)");

                e.HasIndex(i => i.OrderId).HasDatabaseName("idx_soi_order");
                e.HasIndex(i => i.TenantId).HasDatabaseName("idx_soi_tenant");
            });

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

            mb.Entity<ReportDefinition>(e =>
            {
                e.ToTable("report_definitions");
                e.HasKey(x => x.Id);
                e.Property(x => x.TenantId).HasColumnName("tenant_id");
                e.Property(x => x.Name).HasColumnName("name").HasMaxLength(160);
                e.Property(x => x.Source).HasColumnName("source").HasMaxLength(32);
                e.Property(x => x.DefinitionJson).HasColumnName("definition_json");
                e.Property(x => x.CreatedAt).HasColumnName("created_at");
                e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
                e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
                e.HasIndex(x => new { x.TenantId, x.Name }).HasDatabaseName("idx_report_tenant_name");
            });


            // InventoryMovement
            mb.Entity<InventoryMovement>(e =>
            {
                e.ToTable("inventory_movements");
                e.HasKey(x => x.Id);

                e.Property(x => x.Id).HasColumnName("id");
                e.Property(x => x.TenantId).HasColumnName("tenant_id");
                e.Property(x => x.ProductId).HasColumnName("product_id");
                e.Property(x => x.WarehouseId).HasColumnName("warehouse_id");

                e.Property(x => x.MovementType).HasColumnName("movement_type").HasMaxLength(10);
                e.Property(x => x.Reference).HasColumnName("reference");
                e.Property(x => x.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,6)");
                e.Property(x => x.UnitCost).HasColumnName("unit_cost").HasColumnType("decimal(18,6)");
                e.Property(x => x.Reason).HasColumnName("reason");
                e.Property(x => x.MovedAt).HasColumnName("moved_at");

                e.Property(x => x.CreatedBy).HasColumnName("created_by");

                e.Property(x => x.CreatedAt)
                    .HasColumnName("created_at")
                    .ValueGeneratedOnAdd()
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                e.HasIndex(x => new { x.TenantId, x.ProductId, x.MovedAt })
                    .HasDatabaseName("idx_inv_mov_tenant_product");
                e.HasIndex(x => new { x.TenantId, x.WarehouseId })
                    .HasDatabaseName("idx_inv_mov_tenant_wh");
            });

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

                var prod = new Product
                {
                    Id = 1, TenantId = t.Id, Sku = "SKU-001", Name = "Producto Demo",
                    Unit = "unidad", TrackStock = true,
                    ListPrice = 250.00m, StdCost = 120.123456m,
                    // Tienda pública
                    IsPublic = true,
                    PublicPrice = 260.00m,
                    PublicSlug = "producto-demo",
                    PublicDescription = "Este es un producto de demostración visible en la tienda pública.",
                    // 🔹 Imagen demo
                    ImagesJson = "[\"https://via.placeholder.com/600x400?text=Producto+Demo\"]",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                };
                db.Products.Add(prod);

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
