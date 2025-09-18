namespace Contadito.Api.Domain.DTOs
{
    public class SaleCreateDto
    {
        public long? CustomerId { get; set; } // opcional
        public string Currency { get; set; } = "NIO";
        public List<SaleItemCreateDto> Items { get; set; } = new();
        public decimal? TaxRate { get; set; } // opcional: 15 => 15%
        public decimal? DiscountRate { get; set; } // opcional: 5 => 5%
    }

    public class SaleItemCreateDto
    {
        public long ProductId { get; set; }
        public decimal Quantity { get; set; }
        public decimal? UnitPrice { get; set; } // si no viene, se usa product.ListPrice
        public decimal? TaxRate { get; set; } // override opcional por item
        public decimal? DiscountRate { get; set; } // override opcional por item
        public string? Description { get; set; }
    }
}
