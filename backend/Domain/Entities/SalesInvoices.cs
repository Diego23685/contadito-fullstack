using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("sales_invoices")]
    public class SalesInvoice
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("customer_id")] public long? CustomerId { get; set; }
        [Column("number")] public string Number { get; set; } = null!;
        [Column("status")] public string Status { get; set; } = "draft"; // draft|issued|paid|cancelled
        [Column("subtotal")] public decimal Subtotal { get; set; }
        [Column("tax_total")] public decimal TaxTotal { get; set; }
        [Column("discount_total")] public decimal DiscountTotal { get; set; }
        [Column("total")] public decimal Total { get; set; }
        [Column("currency")] public string? Currency { get; set; }
        [Column("issued_at")] public DateTime? IssuedAt { get; set; }
        [Column("due_at")] public DateTime? DueAt { get; set; }
        [Column("created_by")] public long? CreatedBy { get; set; }
        [Column("created_at")] public DateTime CreatedAt { get; set; }
        [Column("updated_at")] public DateTime UpdatedAt { get; set; }
        [Column("deleted_at")] public DateTime? DeletedAt { get; set; }
    }
}
