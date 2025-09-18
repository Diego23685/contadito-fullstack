namespace Contadito.Api.Domain.DTOs
{
    public class ProductCreateDto
    {
        public string Sku { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Unit { get; set; }
        public bool IsService { get; set; }
        public bool TrackStock { get; set; } = true;

        // Nuevo
        public decimal ListPrice { get; set; } = 0m;
        public decimal? StdCost { get; set; }
    }
}
