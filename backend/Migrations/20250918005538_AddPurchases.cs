using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Contadito.Api.Migrations
{
    public partial class AddPurchases : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Si existían con un esquema viejo, las borramos primero
            migrationBuilder.Sql("DROP TABLE IF EXISTS `purchase_items`;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS `purchase_invoices`;");

            // ===== Encabezado de compra =====
            migrationBuilder.Sql(@"
                CREATE TABLE `purchase_invoices` (
                    `id` BIGINT NOT NULL AUTO_INCREMENT,
                    `tenant_id` BIGINT NOT NULL,
                    `number` VARCHAR(40) NULL,
                    `supplier_name` VARCHAR(160) NULL,
                    `status` VARCHAR(16) NOT NULL,
                    `subtotal` DECIMAL(18,2) NOT NULL,
                    `tax_total` DECIMAL(18,2) NOT NULL,
                    `discount_total` DECIMAL(18,2) NOT NULL,
                    `total` DECIMAL(18,2) NOT NULL,
                    `currency` VARCHAR(8) NOT NULL,
                    `received_at` DATETIME(6) NULL,
                    `created_at` DATETIME(6) NOT NULL,
                    `updated_at` DATETIME(6) NOT NULL,
                    `deleted_at` DATETIME(6) NULL,
                    PRIMARY KEY (`id`)
                ) CHARACTER SET = utf8mb4;
            ");

            // ===== Ítems de compra =====
            migrationBuilder.Sql(@"
                CREATE TABLE `purchase_items` (
                    `id` BIGINT NOT NULL AUTO_INCREMENT,
                    `tenant_id` BIGINT NOT NULL,
                    `invoice_id` BIGINT NOT NULL,
                    `product_id` BIGINT NOT NULL,
                    `description` VARCHAR(160) NULL,
                    `quantity` DECIMAL(18,6) NOT NULL,
                    `unit_cost` DECIMAL(18,6) NOT NULL,
                    `warehouse_id` BIGINT NULL,
                    `tax_rate` DECIMAL(5,2) NOT NULL,
                    `discount_rate` DECIMAL(5,2) NOT NULL,
                    `total` DECIMAL(18,2) NOT NULL,
                    `created_at` DATETIME(6) NOT NULL,
                    PRIMARY KEY (`id`)
                ) CHARACTER SET = utf8mb4;
            ");

            // Índices (opcionales pero recomendados)
            migrationBuilder.Sql("CREATE INDEX `IX_purchase_invoices_tenant_id` ON `purchase_invoices` (`tenant_id`);");
            migrationBuilder.Sql("CREATE INDEX `IX_purchase_items_invoice_id` ON `purchase_items` (`invoice_id`);");
            migrationBuilder.Sql("CREATE INDEX `IX_purchase_items_tenant_id` ON `purchase_items` (`tenant_id`);");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS `purchase_items`;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS `purchase_invoices`;");
        }
    }
}
