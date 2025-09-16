namespace Contadito.Api.Infrastructure.Security
{
    public class JwtOptions
    {
        public string Issuer { get; set; } = "contadito";
        public string Audience { get; set; } = "contadito";
        public string Key { get; set; } = "super-secret-dev-key-please-change";
        public int ExpiresMinutes { get; set; } = 120;
    }
}
