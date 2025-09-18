using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("purchase_items")]
    public class PurchaseItem
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("invoice_id")] public long InvoiceId { get; set; }

        [Column("product_id")] public long ProductId { get; set; }

        [MaxLength(160)]
        [Column("description")]
        public string? Description { get; set; }

        [Column("quantity", TypeName = "decimal(18,6)")] public decimal Quantity { get; set; }
        [Column("unit_cost", TypeName = "decimal(18,6)")] public decimal UnitCost { get; set; }

        // Por si manejas bodega de ingreso (opcional)
        [Column("warehouse_id")] public long? WarehouseId { get; set; }

        [Column("tax_rate", TypeName = "decimal(5,2)")] public decimal TaxRate { get; set; }   // %
        [Column("discount_rate", TypeName = "decimal(5,2)")] public decimal DiscountRate { get; set; } // %

        [Column("total", TypeName = "decimal(18,2)")] public decimal Total { get; set; }

        [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
