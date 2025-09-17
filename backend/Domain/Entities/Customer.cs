using System;

namespace Contadito.Api.Domain.Entities
{
    public class Customer
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? DocumentId { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
