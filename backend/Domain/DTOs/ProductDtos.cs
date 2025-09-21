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
        public decimal ListPrice { get; set; } = 0m;
        public decimal? StdCost { get; set; }
        public List<string>? Images { get; set; }
        public bool? IsPublic { get; set; }          // opcional
        public decimal? PublicPrice { get; set; }    // opcional
    }

    public class ProductUpdateDto
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Unit { get; set; }
        public bool IsService { get; set; }
        public bool TrackStock { get; set; }
        public decimal ListPrice { get; set; }
        public decimal? StdCost { get; set; }
        public List<string>? Images { get; set; }
        public bool? IsPublic { get; set; }          // opcional
        public decimal? PublicPrice { get; set; }    // opcional
    }

    public class ProductReadDto
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string Sku { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? Unit { get; set; }
        public bool IsService { get; set; }
        public bool TrackStock { get; set; }
        public decimal ListPrice { get; set; }
        public decimal? StdCost { get; set; }

        // Tienda pública
        public bool IsPublic { get; set; }
        public decimal? PublicPrice { get; set; }
        public string? PublicDescription { get; set; }
        public string? PublicSlug { get; set; }

        // Imágenes
        public List<string> Images { get; set; } = new();
    }
}
