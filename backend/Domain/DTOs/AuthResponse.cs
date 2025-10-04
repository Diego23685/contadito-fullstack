namespace Contadito.Api.Domain.DTOs
{
    public sealed class AuthResponse
    {
        public string Token { get; set; } = default!;
        public int ExpiresInSeconds { get; set; }

        // Extras para social/onboarding
        public bool OnboardingRequired { get; set; } = false;
        public long TenantId { get; set; }
        public string? Name { get; set; }

        public AuthResponse() {}

        public AuthResponse(string token, int expiresInSeconds)
        {
            Token = token;
            ExpiresInSeconds = expiresInSeconds;
        }
    }
}
