using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    // Contadito.Api.Domain.Entities/SalesItem.cs
    [Table("sales_items")]
    public class SalesItem
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("invoice_id")] public long InvoiceId { get; set; }
        [Column("product_id")] public long ProductId { get; set; }
        [Column("description")] public string? Description { get; set; }
        [Column("quantity")] public decimal Quantity { get; set; }
        [Column("unit_price")] public decimal UnitPrice { get; set; }

        // Costo unitario “congelado”
        [Column("unit_cost_basis")] public decimal? UnitCostBasis { get; set; }

        // 👇 NUEVO: margen guardado (sin impuestos)
        [Column("line_margin")] public decimal? LineMargin { get; set; }
        [Column("line_margin_pct")] public decimal? LineMarginPct { get; set; }

        [Column("tax_rate")] public decimal? TaxRate { get; set; }
        [Column("discount_rate")] public decimal? DiscountRate { get; set; }
        [Column("total")] public decimal Total { get; set; }
        [Column("created_at")] public DateTime CreatedAt { get; set; }
    }

}
