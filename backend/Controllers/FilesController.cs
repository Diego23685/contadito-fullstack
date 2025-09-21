// Controllers/FilesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("files")]
    public class FilesController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        public FilesController(IWebHostEnvironment env) => _env = env;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // POST /files/upload  (form-data: file)
        [HttpPost("upload")]
        [RequestSizeLimit(25_000_000)] // 25 MB
        public async Task<ActionResult<object>> Upload([FromForm] IFormFile? file)
        {
            if (file == null || file.Length == 0) return BadRequest("Archivo vacío.");

            var ext = Path.GetExtension(file.FileName);
            var safeExt = string.IsNullOrWhiteSpace(ext) ? ".bin" : ext.ToLowerInvariant();

            var yyyy = DateTime.UtcNow.ToString("yyyy");
            var mm = DateTime.UtcNow.ToString("MM");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "uploads", TenantId.ToString(), yyyy, mm);
            Directory.CreateDirectory(dir);

            var name = $"{Guid.NewGuid():N}{safeExt}";
            var fullPath = Path.Combine(dir, name);

            await using (var stream = System.IO.File.Create(fullPath))
            {
                await file.CopyToAsync(stream);
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var url = $"{baseUrl}/uploads/{TenantId}/{yyyy}/{mm}/{name}";

            return Ok(new { url });
        }
    }
}
