using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("store_orders")]
    public class StoreOrder
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tenant_id")]
        public long TenantId { get; set; }

        [Column("customer_id")]
        public long? CustomerId { get; set; }

        [MaxLength(64)]
        [Column("number")]
        public string Number { get; set; } = string.Empty;

        [MaxLength(32)]
        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("subtotal")] public decimal Subtotal { get; set; }
        [Column("tax_total")] public decimal TaxTotal { get; set; }
        [Column("shipping_total")] public decimal ShippingTotal { get; set; }
        [Column("discount_total")] public decimal DiscountTotal { get; set; }
        [Column("total")] public decimal Total { get; set; }

        [MaxLength(8)]
        [Column("currency")]
        public string Currency { get; set; } = "NIO";

        [Column("placed_at")]
        public DateTime PlacedAt { get; set; }

        [MaxLength(160)] [Column("guest_name")] public string? GuestName { get; set; }
        [MaxLength(160)] [Column("guest_email")] public string? GuestEmail { get; set; }
        [MaxLength(32)]  [Column("guest_phone")] public string? GuestPhone { get; set; }
        [MaxLength(280)] [Column("shipping_address")] public string? ShippingAddress { get; set; }
    }
}
