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
    [Route("purchases")]
    public class PurchasesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PurchasesController(AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // POST /purchases
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] PurchaseCreateDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest("Debe incluir al menos 1 ítem.");

            using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                // 1) Carga de productos a un diccionario
                var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _db.Products
                    .Where(p => p.TenantId == TenantId && productIds.Contains(p.Id) && p.DeletedAt == null)
                    .Select(p => new { p.Id, p.Name, p.StdCost })
                    .ToDictionaryAsync(p => p.Id, p => p);

                // 2) Calcular totales e instanciar líneas
                decimal subtotal = 0m, taxTotal = 0m, discountTotal = 0m;
                var itemsToInsert = new List<PurchaseItem>();

                foreach (var it in dto.Items)
                {
                    if (!products.TryGetValue(it.ProductId, out var prod))
                        return BadRequest($"Producto {it.ProductId} no existe.");

                    var qty = it.Quantity <= 0 ? 1m : it.Quantity;
                    var unitCost = it.UnitCost ?? (prod.StdCost ?? 0m);

                    var itemDiscRate = (it.DiscountRate ?? dto.DiscountRate ?? 0m) / 100m;
                    var itemTaxRate  = (it.TaxRate ?? dto.TaxRate ?? 0m) / 100m;

                    var lineBase = unitCost * qty;
                    var lineDisc = Math.Round(lineBase * itemDiscRate, 2, MidpointRounding.AwayFromZero);
                    var lineAfterDisc = lineBase - lineDisc;
                    var lineTax = Math.Round(lineAfterDisc * itemTaxRate, 2, MidpointRounding.AwayFromZero);
                    var lineTotal = Math.Round(lineAfterDisc + lineTax, 2, MidpointRounding.AwayFromZero);

                    subtotal += lineBase;
                    discountTotal += lineDisc;
                    taxTotal += lineTax;

                    itemsToInsert.Add(new PurchaseItem
                    {
                        TenantId = TenantId,
                        ProductId = it.ProductId,
                        Description = it.Description ?? prod.Name,
                        Quantity = qty,
                        UnitCost = unitCost,
                        TaxRate = (it.TaxRate ?? dto.TaxRate ?? 0m),
                        DiscountRate = (it.DiscountRate ?? dto.DiscountRate ?? 0m),
                        Total = lineTotal,
                        WarehouseId = it.WarehouseId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                var total = Math.Round(subtotal - discountTotal + taxTotal, 2, MidpointRounding.AwayFromZero);
                var number = $"C-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 999)}";

                // 3) Crear cabecera
                var inv = new PurchaseInvoice
                {
                    TenantId = TenantId,
                    Number = number,
                    SupplierName = string.IsNullOrWhiteSpace(dto.SupplierName) ? null : dto.SupplierName!.Trim(),
                    Status = "received",
                    Subtotal = Math.Round(subtotal, 2, MidpointRounding.AwayFromZero),
                    TaxTotal = Math.Round(taxTotal, 2, MidpointRounding.AwayFromZero),
                    DiscountTotal = Math.Round(discountTotal, 2, MidpointRounding.AwayFromZero),
                    Total = total,
                    Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "NIO" : dto.Currency!,
                    ReceivedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.PurchaseInvoices.Add(inv);
                await _db.SaveChangesAsync();

                // 4) Ligar e insertar líneas
                foreach (var it in itemsToInsert)
                    it.InvoiceId = inv.Id;

                _db.PurchaseItems.AddRange(itemsToInsert);

                // 5) (Opcional) Actualizar StdCost si el cliente envió UnitCost explícito
                foreach (var it in dto.Items.Where(x => x.UnitCost.HasValue))
                {
                    var p = await _db.Products.FirstAsync(x => x.TenantId == TenantId && x.Id == it.ProductId);
                    p.StdCost = it.UnitCost;
                    p.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return CreatedAtAction(nameof(Get), new { id = inv.Id }, new
                {
                    inv.Id,
                    inv.Number,
                    inv.Total,
                    inv.Status,
                    Items = itemsToInsert.Select(i => new {
                        i.ProductId, i.Description, i.Quantity, i.UnitCost, i.Total
                    })
                });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // GET /purchases/{id}
        [HttpGet("{id:long}")]
        public async Task<ActionResult<object>> Get(long id)
        {
            var inv = await _db.PurchaseInvoices
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TenantId == TenantId && x.Id == id && x.DeletedAt == null);

            if (inv == null) return NotFound();

            var items = await _db.PurchaseItems
                .AsNoTracking()
                .Where(i => i.TenantId == TenantId && i.InvoiceId == inv.Id)
                .OrderBy(i => i.Id)
                .Select(i => new {
                    i.ProductId, i.Description, i.Quantity, i.UnitCost, i.TaxRate, i.DiscountRate, i.Total, i.WarehouseId
                })
                .ToListAsync();

            return Ok(new
            {
                inv.Id, inv.Number, inv.SupplierName, inv.Status,
                inv.Subtotal, inv.TaxTotal, inv.DiscountTotal, inv.Total,
                inv.Currency, inv.ReceivedAt,
                Items = items
            });
        }

        // (Opcional) GET /purchases?page=1&pageSize=20 para listar
        [HttpGet]
        public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;

            var q = _db.PurchaseInvoices.AsNoTracking()
                .Where(x => x.TenantId == TenantId && x.DeletedAt == null);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(x => x.ReceivedAt ?? x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new {
                    x.Id, x.Number, x.SupplierName, x.Currency,
                    x.Total, x.Status, x.ReceivedAt, x.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }
    }
}
