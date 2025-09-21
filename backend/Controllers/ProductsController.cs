using System.Text.Json;
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
                var ql = q.Trim();
                baseQ = baseQ.Where(p => p.Name.Contains(ql) || p.Sku.Contains(ql));
            }

            var total = await baseQ.CountAsync();

            // Trae lo necesario, incluyendo ImagesJson
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

            // Deserializa JSON en memoria
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
                CreatedAt = now,
                UpdatedAt = now,
                ImagesJson = dto.Images != null ? JsonSerializer.Serialize(dto.Images) : null
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
                .FirstOrDefaultAsync(x =>
                    x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);

            if (p == null) return NotFound();

            p.Name = dto.Name.Trim();
            p.Description = dto.Description?.Trim();
            p.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit!;
            p.IsService = dto.IsService;
            p.TrackStock = dto.IsService ? false : dto.TrackStock;
            p.ListPrice = dto.ListPrice;
            p.StdCost = dto.StdCost;

            // 🔹 actualiza imágenes si vienen en el payload
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
                .FirstOrDefaultAsync(x =>
                    x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);

            if (p == null) return NotFound();

            p.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
