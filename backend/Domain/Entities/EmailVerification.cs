using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("email_verifications")]
    public class EmailVerification
    {
        [Key] [Column("id")] public long Id { get; set; }

        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("user_id")]   public long UserId { get; set; }

        [MaxLength(160)] [Column("email")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(32)] [Column("purpose")]
        public string Purpose { get; set; } = string.Empty;

        [Column("code_hash")]
        public string CodeHash { get; set; } = string.Empty;

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("attempts")]
        public int Attempts { get; set; } = 0;

        [Column("max_attempts")]
        public int MaxAttempts { get; set; } = 5;

        [MaxLength(16)] [Column("delivery_channel")]
        public string DeliveryChannel { get; set; } = "email";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_sent_at")]
        public DateTime? LastSentAt { get; set; }

        [Column("consumed_at")]
        public DateTime? ConsumedAt { get; set; }
    }
}
