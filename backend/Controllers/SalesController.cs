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
    [Route("sales")]
    public class SalesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public SalesController(AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // POST /sales
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] SaleCreateDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest("Debe incluir al menos 1 item.");

            // Cargar productos usados en la venta
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products
                .Where(p => p.TenantId == TenantId && productIds.Contains(p.Id) && p.DeletedAt == null)
                .Select(p => new { p.Id, p.Name, p.ListPrice })
                .ToDictionaryAsync(p => p.Id, p => p);

            // Validaciones y cálculo
            decimal subtotal = 0m;
            decimal taxTotal = 0m;
            decimal discountTotal = 0m;

            var itemsToInsert = new List<SalesItem>();

            foreach (var it in dto.Items)
            {
                if (!products.TryGetValue(it.ProductId, out var prod))
                    return BadRequest($"Producto {it.ProductId} no existe.");

                var qty = it.Quantity <= 0 ? 1 : it.Quantity;
                var unitPrice = it.UnitPrice ?? prod.ListPrice;
                var itemTaxRate = (it.TaxRate ?? dto.TaxRate ?? 0m) / 100m;       // ej. 15 => 0.15
                var itemDiscRate = (it.DiscountRate ?? dto.DiscountRate ?? 0m) / 100m;

                var lineBase = unitPrice * qty;
                var lineDisc = Math.Round(lineBase * itemDiscRate, 2, MidpointRounding.AwayFromZero);
                var lineAfterDisc = lineBase - lineDisc;
                var lineTax = Math.Round(lineAfterDisc * itemTaxRate, 2, MidpointRounding.AwayFromZero);
                var lineTotal = Math.Round(lineAfterDisc + lineTax, 2, MidpointRounding.AwayFromZero);

                subtotal += lineBase;
                discountTotal += lineDisc;
                taxTotal += lineTax;

                itemsToInsert.Add(new SalesItem
                {
                    TenantId = TenantId,
                    ProductId = it.ProductId,
                    Description = it.Description ?? prod.Name,
                    Quantity = qty,
                    UnitPrice = unitPrice,
                    TaxRate = (it.TaxRate ?? dto.TaxRate ?? 0m),
                    DiscountRate = (it.DiscountRate ?? dto.DiscountRate ?? 0m),
                    Total = lineTotal,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var total = Math.Round(subtotal - discountTotal + taxTotal, 2, MidpointRounding.AwayFromZero);

            var number = $"F-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 999)}";

            var inv = new SalesInvoice
            {
                TenantId = TenantId,
                CustomerId = dto.CustomerId,
                Number = number,
                Status = "issued", // emitida => tu trigger resta stock
                Subtotal = Math.Round(subtotal, 2, MidpointRounding.AwayFromZero),
                TaxTotal = Math.Round(taxTotal, 2, MidpointRounding.AwayFromZero),
                DiscountTotal = Math.Round(discountTotal, 2, MidpointRounding.AwayFromZero),
                Total = total,
                Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "NIO" : dto.Currency!,
                IssuedAt = DateTime.UtcNow,
                DueAt = null,
                CreatedBy = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // 1) Guardar la factura para obtener Id
            _db.SalesInvoices.Add(inv);
            await _db.SaveChangesAsync();

            // 2) Insertar ítems con InvoiceId
            foreach (var it in itemsToInsert)
                it.InvoiceId = inv.Id;

            _db.SalesItems.AddRange(itemsToInsert);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                inv.Id,
                inv.Number,
                inv.Total,
                inv.Status,
                Items = itemsToInsert.Select(i => new
                {
                    i.ProductId,
                    i.Description,
                    i.Quantity,
                    i.UnitPrice,
                    i.Total
                }).ToList()
            });
        }

        // GET /sales/{id}
        [HttpGet("{id:long}")]
        public async Task<ActionResult<object>> Get(long id)
        {
            var inv = await _db.SalesInvoices
                .AsNoTracking()
                .Where(i => i.TenantId == TenantId && i.Id == id)
                .FirstOrDefaultAsync();

            if (inv == null) return NotFound();

            var items = await _db.SalesItems
                .AsNoTracking()
                .Where(x => x.TenantId == TenantId && x.InvoiceId == inv.Id)
                .Select(i => new
                {
                    i.ProductId,
                    i.Description,
                    i.Quantity,
                    i.UnitPrice,
                    i.TaxRate,
                    i.DiscountRate,
                    i.Total
                })
                .ToListAsync();

            return Ok(new
            {
                inv.Id,
                inv.Number,
                inv.Status,
                inv.Subtotal,
                inv.TaxTotal,
                inv.DiscountTotal,
                inv.Total,
                inv.Currency,
                inv.IssuedAt,
                inv.DueAt,
                Items = items
            });
        }
    }
}
