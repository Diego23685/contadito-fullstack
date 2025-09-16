namespace Contadito.Api.Domain.DTOs
{
    public record LoginRequest(string Email, string Password);
    public record RegisterTenantRequest(string TenantName, string OwnerName, string OwnerEmail, string Password);
    public record AuthResponse(string Token, int ExpiresInSeconds);
    public record ProductCreateDto(string Sku, string Name, string? Description, string? Unit, bool IsService, bool TrackStock);
    public record ProductUpdateDto(string Name, string? Description, string Unit, bool IsService, bool TrackStock);
}
