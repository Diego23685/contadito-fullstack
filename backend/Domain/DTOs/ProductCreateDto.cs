namespace Contadito.Api.Domain.DTOs
{
    public class PurchaseCreateDto
    {
        public string? SupplierName { get; set; }
        public string? Currency { get; set; } = "NIO";

        public decimal? TaxRate { get; set; }       // % default para líneas
        public decimal? DiscountRate { get; set; }  // %

        public List<PurchaseItemDto> Items { get; set; } = new();
    }

    public class PurchaseItemDto
    {
        public long ProductId { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public decimal? UnitCost { get; set; }      // si no viene, usamos StdCost o 0
        public decimal? TaxRate { get; set; }       // % si no, hereda del header
        public decimal? DiscountRate { get; set; }  // %
        public long? WarehouseId { get; set; }
    }
}
