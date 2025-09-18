// Domain/DTOs/DTOs.cs
namespace Contadito.Api.Domain.DTOs
{
    public record LoginRequest(string Email, string Password);
    public record RegisterTenantRequest(string TenantName, string OwnerName, string OwnerEmail, string Password);
    public record AuthResponse(string Token, int ExpiresInSeconds);

    // ⛔️ Se eliminaron ProductCreateDto y ProductUpdateDto para evitar duplicados.
}
