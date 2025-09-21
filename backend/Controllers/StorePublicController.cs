using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Contadito.Api.Data;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Route("store")]
    public class StorePublicController : ControllerBase
    {
        private readonly AppDbContext _db;
        public StorePublicController(AppDbContext db) => _db = db;

        /// <summary>
        /// Lista de productos públicos del tenant. Acepta tenant por Id (numérico) o por Name (string).
        /// GET /store/{tenant}/products?q=texto&page=1&pageSize=24
        /// </summary>
        [HttpGet("{tenant}/products")]
        public async Task<IActionResult> GetProducts(
            string tenant,
            [FromQuery] string? q = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 24)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 24;

            // 1) Resolver tenant por Id o por Name
            long tenantId;
            if (long.TryParse(tenant, out var asId))
            {
                tenantId = asId;
                var exists = await _db.Tenants.AnyAsync(t => t.Id == tenantId && t.DeletedAt == null);
                if (!exists) return NotFound("Tenant no encontrado (por id).");
            }
            else
            {
                var t = await _db.Tenants
                    .Where(t => t.Name == tenant && t.DeletedAt == null)
                    .Select(t => new { t.Id })
                    .FirstOrDefaultAsync();

                if (t == null) return NotFound("Tenant no encontrado (por nombre).");
                tenantId = t.Id;
            }

            // 2) Query base: solo productos públicos vivos del tenant
            var queryable = _db.Products
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId && p.IsPublic && p.DeletedAt == null);

            // 3) Filtro de búsqueda opcional (sku / name / description pública)
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                queryable = queryable.Where(p =>
                    p.Sku.Contains(term) ||
                    p.Name.Contains(term) ||
                    (p.PublicDescription != null && p.PublicDescription.Contains(term)));
            }

            // 4) Total y página
            var total = await queryable.CountAsync();

            // Traer images_json y deserializar en memoria (después de ToListAsync)
            var raw = await queryable
                .OrderBy(p => p.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Sku,
                    p.Name,
                    price = p.PublicPrice ?? p.ListPrice,
                    slug = p.PublicSlug,
                    description = p.PublicDescription,
                    imagesJson = p.ImagesJson // columna JSON (string)
                })
                .ToListAsync();

            var items = raw.Select(p => new
            {
                p.Id,
                p.Sku,
                p.Name,
                p.price,
                p.slug,
                p.description,
                images = string.IsNullOrWhiteSpace(p.imagesJson)
                    ? Array.Empty<string>()
                    : (JsonSerializer.Deserialize<string[]>(p.imagesJson!) ?? Array.Empty<string>())
            }).ToList();

            return Ok(new
            {
                tenantId,
                page,
                pageSize,
                total,
                items
            });
        }
    }
}
