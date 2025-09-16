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

        [HttpGet]
        public async Task<ActionResult<object>> Get([FromQuery]int page = 1, [FromQuery]int pageSize = 20, [FromQuery] string? q = null)
        {
            if (page < 1) page = 1; if (pageSize < 1) pageSize = 20;
            var query = _db.Products.AsNoTracking().Where(p => p.TenantId == TenantId && p.DeletedAt == null);
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(p => p.Name.Contains(q) || p.Sku.Contains(q));
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(p => p.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return Ok(new { total, page, pageSize, items });
        }

        [HttpPost]
        public async Task<ActionResult<Product>> Create([FromBody] ProductCreateDto dto)
        {
            var exists = await _db.Products.AnyAsync(p => p.TenantId == TenantId && p.Sku == dto.Sku && p.DeletedAt == null);
            if (exists) return Conflict("SKU already exists");
            var p = new Product{
                TenantId = TenantId,
                Sku = dto.Sku,
                Name = dto.Name,
                Description = dto.Description,
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "unidad" : dto.Unit,
                IsService = dto.IsService,
                TrackStock = dto.TrackStock
            };
            _db.Products.Add(p);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = p.Id }, p);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<Product>> GetById([FromRoute] long id)
        {
            var p = await _db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
            if (p == null) return NotFound();
            return Ok(p);
        }
    }
}
