// Contadito.Api/Controllers/InventoryController.cs
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
    [Authorize] // si no usas auth, quita esto
    [Route("inventory")]
    public class InventoryController : ControllerBase
    {
        private readonly AppDbContext _db;
        public InventoryController(AppDbContext db) => _db = db;

        // Obtén TenantId desde HttpContext.Items["TenantId"] si tu middleware lo setea.
        private long GetTenantId()
        {
            if (HttpContext.Items.TryGetValue("TenantId", out var t) && t is long tid) return tid;

            // Fallback si aún no tienes multi-tenant por middleware:
            // ⚠️ Cambia este valor por el tenant activo del usuario autenticado.
            return 5; // <- DEMO/TEMP: usa el tenant que estás probando
        }

        public class AdjustDto
        {
            public long ProductId { get; set; }
            public long? WarehouseId { get; set; }   // opcional
            public string MovementType { get; set; } = "in"; // 'in' | 'out' | 'adjust'
            public decimal Quantity { get; set; }
            public decimal? UnitCost { get; set; }    // costo unitario para IN (opcional)
            public string? Reference { get; set; }
            public string? Reason { get; set; }
            public DateTime? MovedAt { get; set; }    // opcional
        }

        [HttpPost("adjust")]
        public async Task<IActionResult> Adjust([FromBody] AdjustDto body)
        {
            var tenantId = GetTenantId();

            if (body.Quantity <= 0) return BadRequest("La cantidad debe ser > 0.");
            var mt = (body.MovementType ?? "").Trim().ToLowerInvariant();
            if (mt != "in" && mt != "out" && mt != "adjust")
                return BadRequest("movementType debe ser 'in', 'out' o 'adjust'.");

            var product = await _db.Products.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == body.ProductId && p.TenantId == tenantId && p.DeletedAt == null);
            if (product == null) return NotFound("Producto no encontrado.");
            if (!product.TrackStock) return BadRequest("El producto no controla inventario.");

            if (body.WarehouseId.HasValue)
            {
                var okWh = await _db.Warehouses.AsNoTracking()
                    .AnyAsync(w => w.Id == body.WarehouseId && w.TenantId == tenantId && w.DeletedAt == null);
                if (!okWh) return BadRequest("Almacén inválido para el tenant actual.");
            }

            var im = new InventoryMovement
            {
                TenantId = tenantId,
                ProductId = body.ProductId,
                WarehouseId = body.WarehouseId,
                MovementType = mt,
                Reference = string.IsNullOrWhiteSpace(body.Reference) ? "AJUSTE-APP" : body.Reference!.Trim(),
                Quantity = body.Quantity,
                UnitCost = mt == "in" ? body.UnitCost : null,
                Reason = string.IsNullOrWhiteSpace(body.Reason) ? "Ajuste manual" : body.Reason!.Trim(),
                MovedAt = body.MovedAt ?? DateTime.UtcNow,
                CreatedBy = null, // o el UserId si lo tienes
                // ❌ NO seteamos CreatedAt aquí
            };


            _db.InventoryMovements.Add(im);
            await _db.SaveChangesAsync();
            return Ok(new { ok = true, id = im.Id });
        }

        // Stock actual por producto, sumando la vista v_stock (que ya tienes en el DB)
        [HttpGet("products/{productId:long}/stock")]
        public async Task<IActionResult> GetProductStock([FromRoute] long productId)
        {
            var tenantId = GetTenantId();

            var qty = await _db.Stocks
                .Where(s => s.TenantId == tenantId && s.ProductId == productId)
                .SumAsync(s => s.Qty);

            return Ok(new { productId, qty });
        }
    }
}
