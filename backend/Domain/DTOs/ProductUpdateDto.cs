namespace Contadito.Api.Domain.DTOs
{
    public class ProductUpdateDto
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Unit { get; set; }
        public bool IsService { get; set; }
        public bool TrackStock { get; set; }

        // NUEVO
        public decimal ListPrice { get; set; }
        public decimal? StdCost { get; set; }
    }
}
