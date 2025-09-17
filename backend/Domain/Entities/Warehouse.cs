using System;

namespace Contadito.Api.Domain.Entities
{
    public class Warehouse
    {
        public long Id { get; set; }
        public long TenantId { get; set; }

        public string Name { get; set; } = null!;
        public string? Code { get; set; }      // opcional: código corto
        public string? Address { get; set; }   // opcional: dirección
        public string? Notes { get; set; }     // opcional

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
