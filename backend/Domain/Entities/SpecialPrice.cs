using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("special_prices")]
    public class SpecialPrice
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tenant_id")]
        public long TenantId { get; set; }

        [Column("customer_id")]
        public long CustomerId { get; set; }

        [Column("product_id")]
        public long ProductId { get; set; }

        [Column("price", TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [MaxLength(3)]
        [Column("currency")]
        public string Currency { get; set; } = "NIO";

        [Column("active_from")]
        public DateTime? ActiveFrom { get; set; }

        [Column("active_to")]
        public DateTime? ActiveTo { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
