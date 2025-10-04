namespace Contadito.Api.Domain.DTOs
{
    public sealed class GoogleSignInDto
    {
        public string Email { get; set; } = default!;
        public string Subject { get; set; } = default!;
        public string? Name { get; set; }
        public string? PictureUrl { get; set; }
    }
}
