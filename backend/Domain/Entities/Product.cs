using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("products")]
    public class Product
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }

        [Required, MaxLength(64)]  [Column("sku")]  public string Sku { get; set; } = string.Empty;
        [Required, MaxLength(160)] [Column("name")] public string Name { get; set; } = string.Empty;

        [Column("category_id")] public long? CategoryId { get; set; }
        [Column("description", TypeName = "TEXT")] public string? Description { get; set; }

        [MaxLength(24)] [Column("unit")] public string Unit { get; set; } = "unidad";
        [MaxLength(64)] [Column("barcode")] public string? Barcode { get; set; }

        [Column("is_service")] public bool IsService { get; set; } = false;
        [Column("track_stock")] public bool TrackStock { get; set; } = true;

        [Column("list_price", TypeName = "decimal(18,2)")]
        public decimal ListPrice { get; set; } = 0m;

        [Column("std_cost", TypeName = "decimal(18,6)")]
        public decimal? StdCost { get; set; }

        // 🔹 NUEVO: campos para tienda pública
        [Column("is_public")] public bool IsPublic { get; set; } = false;
        [Column("public_price", TypeName = "decimal(18,2)")] public decimal? PublicPrice { get; set; }
        [Column("public_description", TypeName = "TEXT")] public string? PublicDescription { get; set; }
        [MaxLength(160)] [Column("public_slug")] public string? PublicSlug { get; set; }

        [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        [Column("deleted_at")] public DateTime? DeletedAt { get; set; }
    }
}
