namespace Contadito.Api.Domain.DTOs
{
    public sealed class CompleteOnboardingDto
    {
        public string TenantName { get; set; } = default!;
        public string? CountryCode { get; set; }
        public string? Currency { get; set; }
        public string? Password { get; set; } // opcional
    }
}
