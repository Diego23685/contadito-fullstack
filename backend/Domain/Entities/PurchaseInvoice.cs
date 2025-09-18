using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("purchase_invoices")]
    public class PurchaseInvoice
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }

        [MaxLength(40)]
        [Column("number")]
        public string Number { get; set; } = string.Empty;

        // Puedes ligar a una futura tabla suppliers; por ahora nombre libre
        [MaxLength(160)]
        [Column("supplier_name")]
        public string? SupplierName { get; set; }

        [MaxLength(16)]
        [Column("status")]
        public string Status { get; set; } = "received"; // received, draft, canceled

        [Column("subtotal", TypeName = "decimal(18,2)")] public decimal Subtotal { get; set; }
        [Column("tax_total", TypeName = "decimal(18,2)")] public decimal TaxTotal { get; set; }
        [Column("discount_total", TypeName = "decimal(18,2)")] public decimal DiscountTotal { get; set; }
        [Column("total", TypeName = "decimal(18,2)")] public decimal Total { get; set; }
        [MaxLength(8)] [Column("currency")] public string Currency { get; set; } = "NIO";

        [Column("received_at")] public DateTime? ReceivedAt { get; set; }

        [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        [Column("deleted_at")] public DateTime? DeletedAt { get; set; }
    }
}
