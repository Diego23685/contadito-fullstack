// Contadito.Api.Domain.DTOs
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

    // 👇 opcional si decides exponerlo:
    public bool? IsPublic { get; set; }   // null => usar default true
    public decimal? PublicPrice { get; set; } // si null, usar ListPrice
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

    public bool? IsPublic { get; set; }         // 👈 nullable
    public decimal? PublicPrice { get; set; }   // 👈 nullable
}
