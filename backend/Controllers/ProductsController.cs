using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Contadito.Api.Data;
using Contadito.Api.Domain.DTOs;
using Contadito.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("products")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProductsController(AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // GET /products?page=1&pageSize=20&q=...
        [HttpGet]
        public async Task<ActionResult<object>> Get(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? q = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var baseQ = _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId && p.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                var like = $"%{term}%";
                // LIKE null-safe y más performante con índices
                baseQ = baseQ.Where(p =>
                    EF.Functions.Like(p.Name, like) ||
                    (p.Sku != null && EF.Functions.Like(p.Sku, like)));
            }

            var total = await baseQ.CountAsync();

            var rows = await baseQ
                .OrderByDescending(p => p.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id, p.TenantId, p.Sku, p.Name, p.Description, p.Unit, p.IsService, p.TrackStock,
                    p.ListPrice, p.StdCost,
                    p.IsPublic, p.PublicPrice, p.PublicDescription, p.PublicSlug,
                    p.ImagesJson
                })
                .ToListAsync();

            var items = rows.Select(r => new ProductReadDto
            {
                Id = r.Id,
                TenantId = r.TenantId,
                Sku = r.Sku,
                Name = r.Name,
                Description = r.Description,
                Unit = r.Unit,
                IsService = r.IsService,
                TrackStock = r.TrackStock,
                ListPrice = r.ListPrice,
                StdCost = r.StdCost,
                IsPublic = r.IsPublic,
                PublicPrice = r.PublicPrice,
                PublicDescription = r.PublicDescription,
                PublicSlug = r.PublicSlug,
                Images = string.IsNullOrWhiteSpace(r.ImagesJson)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(r.ImagesJson) ?? new List<string>())
            }).ToList();

            // expón total en header para el front
            Response.Headers["X-Total-Count"] = total.ToString();

            return Ok(new { total, page, pageSize, items });
        }

        // POST /products
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] ProductCreateDto dto)
        {
            var exists = await _db.Products.AnyAsync(p =>
                p.TenantId == TenantId && p.Sku == dto.Sku && p.DeletedAt == null);

            if (exists) return Conflict("SKU already exists");

            var now = DateTime.UtcNow;

            // slug por defecto desde Name
            var slug = Slugify(dto.Name);

            var p = new Product
            {
                TenantId = TenantId,
                Sku = dto.Sku.Trim(),
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit!,
                IsService = dto.IsService,
                TrackStock = dto.IsService ? false : dto.TrackStock,
                ListPrice = dto.ListPrice,
                StdCost = dto.StdCost,

                // ✅ públicos por defecto
                IsPublic = true,
                PublicPrice = dto.ListPrice,                  // default a ListPrice
                PublicDescription = dto.Description,          // razonable por defecto
                PublicSlug = slug,                            // slug autogenerado

                ImagesJson = dto.Images != null ? JsonSerializer.Serialize(dto.Images) : null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Products.Add(p);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = p.Id }, new { id = p.Id });
        }

        // GET /products/{id}
        [HttpGet("{id:long}")]
        public async Task<ActionResult<ProductReadDto>> GetById([FromRoute] long id)
        {
            var row = await _db.Products.AsNoTracking()
                .Where(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null)
                .Select(p => new
                {
                    p.Id, p.TenantId, p.Sku, p.Name, p.Description, p.Unit, p.IsService, p.TrackStock,
                    p.ListPrice, p.StdCost,
                    p.IsPublic, p.PublicPrice, p.PublicDescription, p.PublicSlug,
                    p.ImagesJson
                })
                .FirstOrDefaultAsync();

            if (row == null) return NotFound();

            var dto = new ProductReadDto
            {
                Id = row.Id,
                TenantId = row.TenantId,
                Sku = row.Sku,
                Name = row.Name,
                Description = row.Description,
                Unit = row.Unit,
                IsService = row.IsService,
                TrackStock = row.TrackStock,
                ListPrice = row.ListPrice,
                StdCost = row.StdCost,
                IsPublic = row.IsPublic,
                PublicPrice = row.PublicPrice,
                PublicDescription = row.PublicDescription,
                PublicSlug = row.PublicSlug,
                Images = string.IsNullOrWhiteSpace(row.ImagesJson)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(row.ImagesJson) ?? new List<string>())
            };

            return Ok(dto);
        }

        // PUT /products/{id}
        [HttpPut("{id:long}")]
        public async Task<ActionResult> Update([FromRoute] long id, [FromBody] ProductUpdateDto dto)
        {
            var p = await _db.Products
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);

            if (p == null) return NotFound();

            p.Name = dto.Name.Trim();
            p.Description = dto.Description?.Trim();
            p.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit!;
            p.IsService = dto.IsService;
            p.TrackStock = dto.IsService ? false : dto.TrackStock;
            p.ListPrice = dto.ListPrice;
            p.StdCost = dto.StdCost;

            // 🔹 mantener públicos; si quieres permitir “ocultar” desde admin,
            // agrega bool? IsPublic en el DTO y usa: p.IsPublic = dto.IsPublic ?? p.IsPublic;
            p.IsPublic = true;
            // Si quieres recalcular public price cuando cambie list price:
            if (p.PublicPrice == null || p.PublicPrice <= 0)
                p.PublicPrice = p.ListPrice;

            // Generar slug si no tiene
            if (string.IsNullOrWhiteSpace(p.PublicSlug))
                p.PublicSlug = Slugify(p.Name);

            if (dto.Images != null)
            {
                p.ImagesJson = JsonSerializer.Serialize(dto.Images);
            }

            p.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /products/{id}  (soft delete)
        [HttpDelete("{id:long}")]
        public async Task<ActionResult> SoftDelete([FromRoute] long id)
        {
            var p = await _db.Products
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);

            if (p == null) return NotFound();

            p.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // Util: slugify simple para URLs limpias
        private static string Slugify(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return string.Empty;
            s = s.Trim().ToLowerInvariant();
            // quita acentos
            s = s.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in s)
            {
                var uc = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (uc != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }
            s = sb.ToString().Normalize(NormalizationForm.FormC);
            // reemplaza no alfanumérico por guiones
            s = Regex.Replace(s, @"[^a-z0-9]+", "-").Trim('-');
            // colapsa múltiples guiones
            s = Regex.Replace(s, @"-+", "-");
            return s;
        }
    }
}
