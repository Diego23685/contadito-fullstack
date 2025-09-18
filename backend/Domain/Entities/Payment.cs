using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("payments")]
    public class Payment
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("invoice_id")] public long InvoiceId { get; set; }
        [Column("method")] public string Method { get; set; } = "cash"; // cash|card|transfer|wallet
        [Column("amount")] public decimal Amount { get; set; }
        [Column("paid_at")] public DateTime PaidAt { get; set; }
        [Column("reference")] public string? Reference { get; set; }
        [Column("created_at")] public DateTime CreatedAt { get; set; }
    }
}
