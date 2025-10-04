// Domain/DTOs/DTOs.cs
namespace Contadito.Api.Domain.DTOs
{
    public record LoginRequest(string Email, string Password);
    public record RegisterTenantRequest(string TenantName, string OwnerName, string OwnerEmail, string Password);
    //public record AuthResponse(string Token, int ExpiresInSeconds);

    public record RequestEmailCodeDto(string Email, string Purpose);
    public record VerifyEmailCodeDto(string Email, string Code, string Purpose);
    
    //public record GoogleSignInDto(string IdToken, string? TenantName);

}
