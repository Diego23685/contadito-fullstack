// Domain/Entities/ExternalLogin.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("external_logins")]
    public class ExternalLogin
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tenant_id")]
        public long TenantId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("provider")]
        [MaxLength(32)]
        public string Provider { get; set; } = string.Empty; // "google"

        [Column("provider_user_id")]
        [MaxLength(128)]
        public string ProviderUserId { get; set; } = string.Empty; // Google sub

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
