// Contadito.Api/Domain/DTOs/PurchaseDto.cs
namespace Contadito.Api.Domain.DTOs
{
    public class PurchaseCreateDto
    {
        // Cabecera
        public string? SupplierName { get; set; }
        public string? Currency { get; set; }          // "NIO" por defecto en el controller
        public decimal? TaxRate { get; set; }          // porcentaje (0..100)
        public decimal? DiscountRate { get; set; }     // porcentaje (0..100)

        // Si quieres permitir setear fecha manual:
        public DateTime? ReceivedAt { get; set; }      // no lo usas ahora; opcional

        public List<PurchaseItemDto> Items { get; set; } = new();
    }

    public class PurchaseItemDto
    {
        public long ProductId { get; set; }
        public decimal Quantity { get; set; }          // usa decimal para inventario
        public decimal? UnitCost { get; set; }         // si null, usas StdCost del producto
        public decimal? TaxRate { get; set; }          // override por línea (porcentaje)
        public decimal? DiscountRate { get; set; }     // override por línea (porcentaje)
        public string? Description { get; set; }
        public long? WarehouseId { get; set; }
    }
}
