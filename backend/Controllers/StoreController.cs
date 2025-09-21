using Contadito.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("store/{tenantId:long}/admin/products")]
    public class StoreController : ControllerBase
    {
        private readonly AppDbContext _db;
        public StoreController(AppDbContext db) => _db = db;

        // GET /store/{tenantId}/admin/products?q=&page=1&pageSize=24
        [HttpGet]
        public async Task<IActionResult> List(
            [FromRoute] long tenantId,
            [FromQuery] string? q = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 24)
        {
            if (page < 1) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 24;

            var query = _db.Products.AsNoTracking()
                .Where(p => p.TenantId == tenantId && p.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(p => p.Name.Contains(term) || p.Sku.Contains(term));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(p => p.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Sku,
                    p.Name,
                    p.Description,
                    p.Unit,
                    p.IsService,
                    p.TrackStock,
                    p.ListPrice,
                    p.StdCost,

                    // Campos de tienda pública (visibles para admin)
                    p.IsPublic,
                    p.PublicPrice,
                    p.PublicDescription,
                    p.PublicSlug
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // (Opcional) aquí puedes tener POST/PUT/DELETE de admin si ya los tenías,
        // sólo asegurándote de que queden bajo este mismo prefijo /admin.
    }
}
