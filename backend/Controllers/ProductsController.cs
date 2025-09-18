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

            var query = _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId && p.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                query = query.Where(p => p.Name.Contains(q) || p.Sku.Contains(q));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(p => p.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new {
                    p.Id, p.TenantId, p.Sku, p.Name, p.Description, p.Unit, p.IsService, p.TrackStock,
                    p.ListPrice, p.StdCost
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // POST /products
        [HttpPost]
        public async Task<ActionResult<Product>> Create([FromBody] ProductCreateDto dto)
        {
            var exists = await _db.Products.AnyAsync(p =>
                p.TenantId == TenantId && p.Sku == dto.Sku && p.DeletedAt == null);

            if (exists) return Conflict("SKU already exists");

            var p = new Product
            {
                TenantId = TenantId,
                Sku = dto.Sku,
                Name = dto.Name,
                Description = dto.Description,
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit!,
                IsService = dto.IsService,
                TrackStock = dto.TrackStock,
                ListPrice = dto.ListPrice,
                StdCost = dto.StdCost,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Products.Add(p);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = p.Id }, p);
        }

        // GET /products/{id}
        [HttpGet("{id:long}")]
        public async Task<ActionResult<object>> GetById([FromRoute] long id)
        {
            var p = await _db.Products.AsNoTracking()
                .Where(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null)
                .Select(p => new {
                    p.Id, p.TenantId, p.Sku, p.Name, p.Description, p.Unit, p.IsService, p.TrackStock,
                    p.ListPrice, p.StdCost
                })
                .FirstOrDefaultAsync();

            if (p == null) return NotFound();
            return Ok(p);
        }

        // PUT /products/{id}
        [HttpPut("{id:long}")]
        public async Task<ActionResult> Update([FromRoute] long id, [FromBody] ProductUpdateDto dto)
        {
            var p = await _db.Products
                .FirstOrDefaultAsync(x =>
                    x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);

            if (p == null) return NotFound();

            p.Name = dto.Name;
            p.Description = dto.Description;
            p.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit!;
            p.IsService = dto.IsService;
            p.TrackStock = dto.TrackStock;
            p.ListPrice = dto.ListPrice;
            p.StdCost = dto.StdCost;
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
