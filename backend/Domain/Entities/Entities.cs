// Domain/Entities/Entities.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    // ---------- TENANT ----------
    [Table("tenants")]
    public class Tenant
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Required]
        [MaxLength(120)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(160)]
        [Column("legal_name")]
        public string? LegalName { get; set; }

        [MaxLength(64)]
        [Column("tax_id")]
        public string? TaxId { get; set; }

        [MaxLength(2)]
        [Column("country")]
        public string? Country { get; set; } = "NI";

        [MaxLength(32)]
        [Column("phone")]
        public string? Phone { get; set; }

        [MaxLength(160)]
        [Column("email")]
        public string? Email { get; set; }

        [MaxLength(16)]
        [Column("plan")]
        public string? Plan { get; set; } = "free";

        [MaxLength(16)]
        [Column("status")]
        public string? Status { get; set; } = "active";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }
    }

    // ---------- USER ----------
    [Table("users")]
    public class User
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tenant_id")]
        public long TenantId { get; set; }

        [Required]
        [MaxLength(120)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(160)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(16)]
        [Column("role")]
        public string Role { get; set; } = "viewer";

        [MaxLength(16)]
        [Column("status")]
        public string Status { get; set; } = "active";

        [Column("last_login_at")]
        public DateTime? LastLoginAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }
    }

    // ---------- PRODUCT ----------
    [Table("products")]
    public class Product
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tenant_id")]
        public long TenantId { get; set; }

        [Required]
        [MaxLength(64)]
        [Column("sku")]
        public string Sku { get; set; } = string.Empty;

        [Required]
        [MaxLength(160)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("category_id")]
        public long? CategoryId { get; set; }

        [Column("description", TypeName = "TEXT")]
        public string? Description { get; set; }

        [MaxLength(24)]
        [Column("unit")]
        public string Unit { get; set; } = "unidad";

        [MaxLength(64)]
        [Column("barcode")]
        public string? Barcode { get; set; }

        [Column("is_service")]
        public bool IsService { get; set; } = false;

        [Column("track_stock")]
        public bool TrackStock { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }
    }
}
