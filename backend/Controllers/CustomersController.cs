using Contadito.Api.Data;
using Contadito.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers;

[ApiController]
[Authorize]
[Route("customers")]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;
    public CustomersController(AppDbContext db) => _db = db;

    private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

    // GET /customers?page=1&pageSize=10&q=texto
    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? q = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 10;

        var query = _db.Customers.AsNoTracking()
            .Where(c => c.TenantId == TenantId && c.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(c =>
                EF.Functions.Like(c.Name.ToLower(), $"%{term}%") ||
                (c.Email != null && EF.Functions.Like(c.Email.ToLower(), $"%{term}%")) ||
                (c.Phone != null && EF.Functions.Like(c.Phone.ToLower(), $"%{term}%")));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new {
                c.Id, c.Name, c.Email, c.Phone, c.DocumentId, c.Address, c.CreatedAt, c.UpdatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    // GET /customers/123
    [HttpGet("{id:long}")]
    public async Task<ActionResult<Customer>> Get(long id)
    {
        var c = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
        if (c == null) return NotFound();
        return Ok(c);
    }

    // POST /customers
    [HttpPost]
    public async Task<ActionResult<Customer>> Create([FromBody] Customer dto)
    {
        var now = DateTime.UtcNow;
        var c = new Customer
        {
            TenantId = TenantId,
            Name = dto.Name?.Trim() ?? throw new ArgumentException("name requerido"),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email!.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone!.Trim(),
            DocumentId = string.IsNullOrWhiteSpace(dto.DocumentId) ? null : dto.DocumentId!.Trim(),
            Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address!.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = c.Id }, c);
    }

    // PUT /customers/123
    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] Customer dto)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
        if (c == null) return NotFound();
        c.Name = dto.Name?.Trim() ?? c.Name;
        c.Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email!.Trim();
        c.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone!.Trim();
        c.DocumentId = string.IsNullOrWhiteSpace(dto.DocumentId) ? null : dto.DocumentId!.Trim();
        c.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address!.Trim();
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /customers/123  (soft-delete)
    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null);
        if (c == null) return NotFound();
        c.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
