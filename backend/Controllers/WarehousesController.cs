using Contadito.Api.Data;
using Contadito.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("warehouses")] // sin /api para que el front funcione tal cual
    public class WarehousesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public WarehousesController(AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // GET /warehouses   -> array (compat con HomeScreen)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> List()
        {
            var items = await _db.Warehouses.AsNoTracking()
                .Where(w => w.TenantId == TenantId && w.DeletedAt == null)
                .OrderBy(w => w.Name)
                .Select(w => new {
                    w.Id, w.Name, w.Code, w.Address, w.Notes,
                    w.CreatedAt, w.UpdatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET /warehouses/123
        [HttpGet("{id:long}")]
        public async Task<ActionResult<Warehouse>> Get(long id)
        {
            var w = await _db.Warehouses.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
            if (w == null) return NotFound();
            return Ok(w);
        }

        // POST /warehouses
        [HttpPost]
        public async Task<ActionResult<Warehouse>> Create([FromBody] Warehouse dto)
        {
            var now = DateTime.UtcNow;
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("name requerido");

            var w = new Warehouse
            {
                TenantId = TenantId,
                Name = dto.Name.Trim(),
                Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code!.Trim(),
                Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address!.Trim(),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Warehouses.Add(w);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = w.Id }, w);
        }

        // PUT /warehouses/123
        [HttpPut("{id:long}")]
        public async Task<ActionResult> Update(long id, [FromBody] Warehouse dto)
        {
            var w = await _db.Warehouses
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
            if (w == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name)) w.Name = dto.Name.Trim();
            w.Code = string.IsNullOrWhiteSpace(dto.Code) ? null : dto.Code!.Trim();
            w.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address!.Trim();
            w.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes!.Trim();
            w.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /warehouses/123 (soft-delete)
        [HttpDelete("{id:long}")]
        public async Task<ActionResult> Delete(long id)
        {
            var w = await _db.Warehouses
                .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
            if (w == null) return NotFound();

            w.DeletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
