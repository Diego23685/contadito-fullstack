// Contadito.Api/Controllers/ReceivablesController.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Contadito.Api.Data;
using Contadito.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("receivables")]
    public class ReceivablesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ReceivablesController(AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // ===== DTOs =====
        public class ListQuery
        {
            public int Page { get; set; } = 1;
            public int PageSize { get; set; } = 20;
            public string? Q { get; set; } = null;         // por número o cliente
            public string? Status { get; set; } = "open";  // open|all
        }

        public class CreateReceivableDto
        {
            public long CustomerId { get; set; }
            public string? Number { get; set; }      // opcional
            public DateTime? IssuedAt { get; set; }  // opcional
            public DateTime? DueAt { get; set; }     // opcional
            public decimal Total { get; set; }
            // public string? Notes { get; set; }    // ❌ NO existe en SalesInvoice, se ignora
        }

        public class UpdateReceivableDto
        {
            public DateTime? DueAt { get; set; }
            public string? Number { get; set; }
            public decimal? Total { get; set; }
            // public string? Notes { get; set; }    // ❌ NO existe en SalesInvoice, se ignora
            public string? Status { get; set; }      // issued|paid|void|canceled, etc.
        }

        public class AddPaymentDto
        {
            public decimal Amount { get; set; }
            public DateTime? PaidAt { get; set; }
            public string? Method { get; set; }
            public string? Reference { get; set; }
            // public string? Notes { get; set; }    // ❌ NO existe en Payment, se ignora
        }

        // ===== Listado (paginado) =====
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] ListQuery query)
        {
            if (query.Page < 1) query.Page = 1;
            if (query.PageSize < 1) query.PageSize = 20;

            var q = _db.SalesInvoices.AsNoTracking()
                .Where(si => si.TenantId == TenantId && si.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(query.Q))
            {
                var term = query.Q.Trim();
                q = q.Where(si =>
                    si.Number.Contains(term) ||
                    _db.Customers.Where(c => c.Id == si.CustomerId).Select(c => c.Name).FirstOrDefault()!.Contains(term)
                );
            }

            if ((query.Status ?? "open") == "open")
            {
                // pendientes de pago
                q = q.Where(si => si.Status == "issued");
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(si => si.IssuedAt ?? si.CreatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(si => new
                {
                    si.Id,
                    si.Number,
                    si.Status,
                    si.CustomerId,
                    customerName = _db.Customers.Where(c => c.Id == si.CustomerId).Select(c => c.Name).FirstOrDefault(),
                    si.IssuedAt,
                    si.DueAt,
                    si.Total,
                    paid = _db.Payments.Where(p => p.TenantId == si.TenantId && p.InvoiceId == si.Id).Sum(p => (decimal?)p.Amount) ?? 0m,
                })
                .ToListAsync();

            return Ok(new { total, page = query.Page, pageSize = query.PageSize, items });
        }

        // ===== Obtener por id =====
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById([FromRoute] long id)
        {
            var si = await _db.SalesInvoices.AsNoTracking()
                .Where(x => x.Id == id && x.TenantId == TenantId && x.DeletedAt == null)
                .Select(si => new
                {
                    si.Id,
                    si.Number,
                    si.Status,
                    si.CustomerId,
                    customerName = _db.Customers.Where(c => c.Id == si.CustomerId).Select(c => c.Name).FirstOrDefault(),
                    si.IssuedAt,
                    si.DueAt,
                    si.Total,
                    paid = _db.Payments.Where(p => p.TenantId == si.TenantId && p.InvoiceId == si.Id).Sum(p => (decimal?)p.Amount) ?? 0m,
                    payments = _db.Payments
                        .Where(p => p.TenantId == si.TenantId && p.InvoiceId == si.Id)
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => new {
                            p.Id,
                            p.Amount,
                            p.Method,
                            p.Reference,
                            p.CreatedAt
                            // p.Notes ❌ no existe
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (si == null) return NotFound();
            return Ok(si);
        }

        // ===== Crear CxC (SalesInvoice en estado 'issued') =====
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReceivableDto dto)
        {
            if (dto.Total <= 0) return BadRequest("Total debe ser > 0.");

            // validar cliente
            var existsCustomer = await _db.Customers
                .AnyAsync(c => c.Id == dto.CustomerId && c.TenantId == TenantId && c.DeletedAt == null);
            if (!existsCustomer) return BadRequest("Cliente inválido.");

            // number fallback
            var number = string.IsNullOrWhiteSpace(dto.Number)
                ? $"CX-{DateTime.UtcNow:yyyyMMddHHmmss}"
                : dto.Number!.Trim();

            var now = DateTime.UtcNow;

            var inv = new SalesInvoice
            {
                TenantId = TenantId,
                CustomerId = dto.CustomerId,
                Number = number,
                Status = "issued",
                IssuedAt = dto.IssuedAt ?? now,
                DueAt = dto.DueAt ?? now.AddDays(15),

                Subtotal = dto.Total,     // puedes ajustar si manejas impuestos
                TaxTotal = 0m,
                DiscountTotal = 0m,
                Total = dto.Total,

                CreatedAt = now,
                UpdatedAt = now
                // Notes ❌
            };

            _db.SalesInvoices.Add(inv);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = inv.Id }, new { inv.Id });
        }

        // ===== Actualizar encabezado de CxC =====
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update([FromRoute] long id, [FromBody] UpdateReceivableDto dto)
        {
            var inv = await _db.SalesInvoices
                .FirstOrDefaultAsync(si => si.Id == id && si.TenantId == TenantId && si.DeletedAt == null);

            if (inv == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Number)) inv.Number = dto.Number!.Trim();
            if (dto.DueAt.HasValue) inv.DueAt = dto.DueAt.Value;
            if (dto.Total.HasValue && dto.Total.Value > 0)
            {
                inv.Subtotal = dto.Total.Value;
                inv.Total = dto.Total.Value;
            }
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                inv.Status = dto.Status!.Trim(); // valida si quieres restringir valores
            }

            inv.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ===== Agregar pago/abono =====
        [HttpPost("{id:long}/payments")]
        public async Task<IActionResult> AddPayment([FromRoute] long id, [FromBody] AddPaymentDto dto)
        {
            if (dto.Amount <= 0) return BadRequest("El monto debe ser > 0.");

            var inv = await _db.SalesInvoices
                .AsNoTracking()
                .FirstOrDefaultAsync(si => si.Id == id && si.TenantId == TenantId && si.DeletedAt == null);

            if (inv == null) return NotFound("CxC no encontrada.");

            var now = DateTime.UtcNow;

            var pay = new Payment
            {
                TenantId = TenantId,
                InvoiceId = inv.Id,
                Amount = dto.Amount,
                Method = string.IsNullOrWhiteSpace(dto.Method) ? "cash" : dto.Method!.Trim(),
                Reference = dto.Reference?.Trim(),
                CreatedAt = dto.PaidAt ?? now
                // Notes ❌
                // UpdatedAt ❌
            };

            _db.Payments.Add(pay);

            // Si quieres marcar como pagada cuando alcanza el total:
            var currentPaid = await _db.Payments
                .Where(p => p.TenantId == TenantId && p.InvoiceId == inv.Id)
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var newPaid = currentPaid + dto.Amount;
            if (newPaid >= inv.Total)
            {
                var invTracked = await _db.SalesInvoices
                    .FirstAsync(si => si.Id == inv.Id && si.TenantId == TenantId);
                invTracked.Status = "paid";
                invTracked.UpdatedAt = now;
            }

            await _db.SaveChangesAsync();
            return Ok(new { ok = true });
        }

        // ===== Eliminar pago =====
        [HttpDelete("{id:long}/payments/{paymentId:long}")]
        public async Task<IActionResult> RemovePayment([FromRoute] long id, [FromRoute] long paymentId)
        {
            var pay = await _db.Payments
                .FirstOrDefaultAsync(p => p.Id == paymentId && p.InvoiceId == id && p.TenantId == TenantId);

            if (pay == null) return NotFound();

            _db.Payments.Remove(pay);

            // Si quieres reabrir la factura si quedó sin cubrir:
            var inv = await _db.SalesInvoices.FirstOrDefaultAsync(si => si.Id == id && si.TenantId == TenantId);
            if (inv != null)
            {
                var paid = await _db.Payments
                    .Where(p => p.TenantId == TenantId && p.InvoiceId == inv.Id)
                    .SumAsync(p => (decimal?)p.Amount) ?? 0m;

                if (paid < inv.Total && inv.Status == "paid")
                {
                    inv.Status = "issued";
                    inv.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
