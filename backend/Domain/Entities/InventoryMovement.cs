// Contadito.Api/Domain/Entities/InventoryMovement.cs
using System;

namespace Contadito.Api.Domain.Entities
{
    public class InventoryMovement
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public long ProductId { get; set; }
        public long? WarehouseId { get; set; }   // puede ser NULL
        public string MovementType { get; set; } = "in"; // 'in' | 'out' | 'adjust'
        public string? Reference { get; set; }
        public decimal Quantity { get; set; }     // decimal(18,6)
        public decimal? UnitCost { get; set; }    // decimal(18,6) NULL
        public string? Reason { get; set; }
        public DateTime MovedAt { get; set; } = DateTime.UtcNow;
        public long? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
