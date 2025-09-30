using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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

        // ------------------------------------------------------------
        // POST /sales  => Crea factura + descuenta stock (OUT)
        // ------------------------------------------------------------
        [HttpPost]
        public async Task<ActionResult<object>> Create([FromBody] SaleCreateDto dto)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest("Debe incluir al menos 1 item.");

            await using var tx = await _db.Database.BeginTransactionAsync();

            // Cargar productos (incluye TrackStock para saber si descuenta inventario)
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products
                .Where(p => p.TenantId == TenantId && productIds.Contains(p.Id) && p.DeletedAt == null)
                .Select(p => new { p.Id, p.Name, p.ListPrice, p.TrackStock })
                .ToDictionaryAsync(p => p.Id, p => p);

            // Cálculo
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
                var itemTaxRate = (it.TaxRate ?? dto.TaxRate ?? 0m) / 100m;
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
                Status = "issued", // emitida
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

            // 3) Movimientos de inventario (OUT) para productos con TrackStock
            var outMoves = new List<InventoryMovement>();
            foreach (var it in itemsToInsert)
            {
                var p = products[it.ProductId];
                if (p.TrackStock)
                {
                    outMoves.Add(new InventoryMovement
                    {
                        TenantId = TenantId,
                        ProductId = it.ProductId,
                        WarehouseId = dto.WarehouseId, // si no manejas warehouse aquí, déjalo en null
                        MovementType = "out",
                        Quantity = it.Quantity,
                        UnitCost = null, // para out no es requerido aquí; costo puede resolverse por tu política
                        Reference = inv.Number,
                        Reason = "Venta",
                        MovedAt = DateTime.UtcNow,
                        CreatedBy = null
                    });
                }
            }

            if (outMoves.Count > 0)
            {
                _db.InventoryMovements.AddRange(outMoves);
                await _db.SaveChangesAsync();
            }

            await tx.CommitAsync();

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

        // ------------------------------------------------------------
        // GET /sales/{id}
        // ------------------------------------------------------------
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

        // ------------------------------------------------------------
        // POST /sales/{id}/void  => Anula factura + repone stock (IN)
        // ------------------------------------------------------------
        public class VoidSaleDto
        {
            public string? Reason { get; set; }
            public long? WarehouseId { get; set; }
            public bool Restock { get; set; } = true;
        }

        [HttpPost("{id:long}/void")]
        public async Task<ActionResult<object>> Void(long id, [FromBody] VoidSaleDto dto)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            // 1) Factura
            var inv = await _db.SalesInvoices
                .Where(i => i.TenantId == TenantId && i.Id == id)
                .FirstOrDefaultAsync();

            if (inv == null) return NotFound("Factura no encontrada.");

            // 2) Idempotencia / reglas
            if (string.Equals(inv.Status, "voided", StringComparison.OrdinalIgnoreCase))
                return Ok(new { ok = true, alreadyVoided = true, inv.Id, inv.Number, inv.Status });

            if (!new[] { "issued", "paid" }.Contains(inv.Status))
                return BadRequest($"No se puede anular una factura con estado '{inv.Status}'.");

            // 3) Items + productos
            var items = await _db.SalesItems
                .Where(x => x.TenantId == TenantId && x.InvoiceId == inv.Id)
                .ToListAsync();

            if (items.Count == 0)
                return BadRequest("La factura no tiene ítems.");

            var productIds = items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _db.Products
                .Where(p => p.TenantId == TenantId && productIds.Contains(p.Id) && p.DeletedAt == null)
                .Select(p => new { p.Id, p.TrackStock })
                .ToDictionaryAsync(p => p.Id, p => p);

            // 4) Validar almacén si vino
            if (dto.WarehouseId.HasValue)
            {
                var whOk = await _db.Warehouses
                    .AnyAsync(w => w.Id == dto.WarehouseId.Value && w.TenantId == TenantId && w.DeletedAt == null);
                if (!whOk) return BadRequest("Almacén inválido para este tenant.");
            }

            // 5) Movimientos IN para reponer
            if (dto.Restock)
            {
                var moves = new List<InventoryMovement>();
                foreach (var it in items)
                {
                    if (products.TryGetValue(it.ProductId, out var prod) && prod.TrackStock)
                    {
                        moves.Add(new InventoryMovement
                        {
                            TenantId = TenantId,
                            ProductId = it.ProductId,
                            WarehouseId = dto.WarehouseId,
                            MovementType = "in",
                            Quantity = it.Quantity,
                            UnitCost = null,
                            Reference = $"VOID-{inv.Number}",
                            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Anulación de venta" : dto.Reason!.Trim(),
                            MovedAt = DateTime.UtcNow,
                            CreatedBy = null
                        });
                    }
                }

                if (moves.Count > 0)
                {
                    _db.InventoryMovements.AddRange(moves);
                    await _db.SaveChangesAsync();
                }
            }

            // 6) Marcar factura
            inv.Status = "voided";
            inv.UpdatedAt = DateTime.UtcNow;
            // Si tienes campos:
            // inv.VoidedAt = DateTime.UtcNow;
            // inv.VoidedReason = string.IsNullOrWhiteSpace(dto.Reason) ? "Anulación de venta" : dto.Reason!.Trim();

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { ok = true, inv.Id, inv.Number, inv.Status });
        }
    }
}
