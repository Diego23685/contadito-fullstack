using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    // ---------- TENANT ----------
    [Table("tenants")]
    public class Tenant
    {
        [Key] [Column("id")] public long Id { get; set; }

        [Required, MaxLength(120)] [Column("name")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(160)] [Column("legal_name")] public string? LegalName { get; set; }
        [MaxLength(64)]  [Column("tax_id")]    public string? TaxId { get; set; }

        // País (ya lo tenías). Mantén 2 letras ISO-3166-1 alfa-2.
        [MaxLength(2)]   [Column("country")]   public string? Country { get; set; } = "NI";

        // 💡 NUEVO: Moneda (3 letras ISO-4217). Opcional.
        [MaxLength(8)]   [Column("currency")]  public string? Currency { get; set; } = "NIO";

        [MaxLength(32)]  [Column("phone")]     public string? Phone { get; set; }
        [MaxLength(160)] [Column("email")]     public string? Email { get; set; }
        [MaxLength(16)]  [Column("plan")]      public string? Plan { get; set; } = "free";
        [MaxLength(16)]  [Column("status")]    public string? Status { get; set; } = "active";

        [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("updated_at")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        [Column("deleted_at")] public DateTime? DeletedAt { get; set; }
    }

    // ---------- USER ----------
    [Table("users")]
    public class User
    {
        [Key] [Column("id")] public long Id { get; set; }
        [Column("tenant_id")] public long TenantId { get; set; }

        [Required, MaxLength(120)] [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(160)] [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(255)] [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [MaxLength(16)] [Column("role")]   public string Role { get; set; } = "viewer";
        [MaxLength(16)] [Column("status")] public string Status { get; set; } = "active";

        [Column("email_verified_at")] public DateTime? EmailVerifiedAt { get; set; }

        [Column("last_login_at")] public DateTime? LastLoginAt { get; set; }
        [Column("created_at")]    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("updated_at")]    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        [Column("deleted_at")]    public DateTime? DeletedAt { get; set; }
    }
}
