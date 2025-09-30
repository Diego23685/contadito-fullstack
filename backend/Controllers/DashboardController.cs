// Controllers/DashboardController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("dashboard")]
    public class DashboardController : ControllerBase
    {
        // Nombre totalmente calificado para evitar CS0246
        private readonly Contadito.Api.Data.AppDbContext _db;
        public DashboardController(Contadito.Api.Data.AppDbContext db) => _db = db;

        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            // ===== Contexto del tenant =====
            var tenant = await _db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == TenantId)
                .Select(t => new { tenantName = t.Name, plan = t.Plan })
                .FirstOrDefaultAsync();

            // Fechas base (UTC, truncadas a día)
            var todayUtcDate = DateTime.UtcNow.Date;
            var monthStartUtc = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

            // ===== KPIs (ventas/tickets) =====
            var invTodayQ = _db.SalesInvoices.AsNoTracking()
                .Where(si => si.TenantId == TenantId
                             && (si.Status == "issued" || si.Status == "paid")
                             && si.IssuedAt != null
                             && si.IssuedAt.Value.Date == todayUtcDate);

            var salesToday = await invTodayQ.SumAsync(si => (decimal?)si.Total) ?? 0m;
            var ticketsToday = await invTodayQ.CountAsync();

            var invMonthQ = _db.SalesInvoices.AsNoTracking()
                .Where(si => si.TenantId == TenantId
                             && (si.Status == "issued" || si.Status == "paid")
                             && si.IssuedAt != null
                             && si.IssuedAt >= monthStartUtc);

            var salesMonth = await invMonthQ.SumAsync(si => (decimal?)si.Total) ?? 0m;
            var ticketsMonth = await invMonthQ.CountAsync();
            var avgTicketMonth = ticketsMonth == 0 ? 0m : salesMonth / ticketsMonth;

            // ===== Margen HOY usando costo "congelado" por ítem (UnitCostBasis) =====
            // Fórmula: (precioUnit - costoUnit) * cantidad  (descuentos/impuestos pueden variar según tu política)
            var marginToday = await (
                from it in _db.SalesItems.AsNoTracking()
                join si in _db.SalesInvoices.AsNoTracking() on it.InvoiceId equals si.Id
                where it.TenantId == TenantId
                      && (si.Status == "issued" || si.Status == "paid")
                      && si.IssuedAt != null
                      && si.IssuedAt.Value.Date == todayUtcDate
                select ((it.UnitPrice - (it.UnitCostBasis ?? 0m)) * it.Quantity)
            ).SumAsync(x => (decimal?)x) ?? 0m;

            // ===== Margen MES (mismo criterio) =====
            var marginMonth = await (
                from it in _db.SalesItems.AsNoTracking()
                join si in _db.SalesInvoices.AsNoTracking() on it.InvoiceId equals si.Id
                where it.TenantId == TenantId
                      && (si.Status == "issued" || si.Status == "paid")
                      && si.IssuedAt != null
                      && si.IssuedAt >= monthStartUtc
                select ((it.UnitPrice - (it.UnitCostBasis ?? 0m)) * it.Quantity)
            ).SumAsync(x => (decimal?)x) ?? 0m;

            // ===== Totales (cards) =====
            var productsTotal = await _db.Products.AsNoTracking()
                .CountAsync(p => p.TenantId == TenantId && p.DeletedAt == null);
            var customersTotal = await _db.Customers.AsNoTracking()
                .CountAsync(c => c.TenantId == TenantId && c.DeletedAt == null);
            var warehousesTotal = await _db.Warehouses.AsNoTracking()
                .CountAsync(w => w.TenantId == TenantId && w.DeletedAt == null);

            // ===== Stock bajo (umbral 5) con subconsulta a vista/materialización de stock =====
            // Requiere que _db.Stocks (v_stock) esté mapeado en tu DbContext
            var lowStock = await (
                from p in _db.Products.AsNoTracking()
                where p.TenantId == TenantId && p.TrackStock && p.DeletedAt == null
                let qty = _db.Stocks.AsNoTracking()
                            .Where(s => s.TenantId == p.TenantId && s.ProductId == p.Id)
                            .Sum(s => (decimal?)s.Qty) ?? 0m
                where qty <= 5m
                select new { id = p.Id, sku = p.Sku, name = p.Name, qty }
            )
            .OrderBy(x => x.qty)
            .ThenBy(x => x.name)
            .Take(5)
            .Select(x => new { x.id, x.sku, x.name }) // añade x.qty si quieres mostrarlo en UI
            .ToListAsync();

            // ===== Por cobrar próximos 7 días =====
            var dueToUtc = DateTime.UtcNow.AddDays(7);

            // Obtenemos base desde DB y luego calculamos dueInDays en memoria (portabilidad, sin DateDiff)
            var receivablesBase = await (
                from si in _db.SalesInvoices.AsNoTracking()
                where si.TenantId == TenantId
                      && si.Status == "issued"
                      && si.DueAt != null
                      && si.DueAt >= DateTime.UtcNow && si.DueAt <= dueToUtc
                // Total pagado
                let paid = _db.Payments.AsNoTracking()
                              .Where(p => p.TenantId == TenantId && p.InvoiceId == si.Id)
                              .Sum(p => (decimal?)p.Amount) ?? 0m
                let dueAmountCalc = si.Total - paid
                where dueAmountCalc > 0m
                // Cliente (LEFT)
                let customerNameJoin = _db.Customers.AsNoTracking()
                                       .Where(c => c.Id == si.CustomerId)
                                       .Select(c => c.Name)
                                       .FirstOrDefault()
                orderby si.DueAt
                select new
                {
                    invoiceId = si.Id,
                    number = si.Number,
                    customerName = customerNameJoin,
                    total = si.Total,
                    dueAmount = dueAmountCalc,
                    dueAt = si.DueAt
                }
            )
            .Take(5)
            .ToListAsync();

            var receivablesDueSoon = receivablesBase.Select(x =>
            {
                var now = DateTime.UtcNow;
                var dueAt = x.dueAt ?? now;
                var dueInDays = (int)Math.Floor((dueAt - now).TotalDays);
                return new
                {
                    x.invoiceId,
                    x.number,
                    x.customerName,
                    x.total,
                    x.dueAmount,
                    dueInDays
                };
            }).ToList();

            // ===== Últimos productos =====
            var latestProducts = await _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId && p.DeletedAt == null)
                .OrderByDescending(p => p.CreatedAt)
                .Take(5)
                .Select(p => new { id = p.Id, sku = p.Sku, name = p.Name })
                .ToListAsync();

            // ===== Actividad reciente (unión simple) =====
            var activity = new List<dynamic>();

            var actProducts = await _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId)
                .OrderByDescending(p => p.CreatedAt).Take(10)
                .Select(p => new { kind = "Producto", refId = p.Id, title = p.Name, whenAt = p.CreatedAt })
                .ToListAsync();
            activity.AddRange(actProducts);

            var actCustomers = await _db.Customers.AsNoTracking()
                .Where(c => c.TenantId == TenantId)
                .OrderByDescending(c => c.CreatedAt).Take(10)
                .Select(c => new { kind = "Cliente", refId = c.Id, title = c.Name, whenAt = c.CreatedAt })
                .ToListAsync();
            activity.AddRange(actCustomers);

            var actWh = await _db.Warehouses.AsNoTracking()
                .Where(w => w.TenantId == TenantId)
                .OrderByDescending(w => w.CreatedAt).Take(10)
                .Select(w => new { kind = "Almacén", refId = w.Id, title = w.Name, whenAt = w.CreatedAt })
                .ToListAsync();
            activity.AddRange(actWh);

            var actInv = await _db.SalesInvoices.AsNoTracking()
                .Where(si => si.TenantId == TenantId)
                .OrderByDescending(si => si.CreatedAt).Take(10)
                .Select(si => new { kind = "Factura", refId = si.Id, title = si.Number, whenAt = si.CreatedAt })
                .ToListAsync();
            activity.AddRange(actInv);

            activity = activity.OrderByDescending(a => a.whenAt).Take(10).ToList();

            // ===== Respuesta =====
            return Ok(new
            {
                tenantName = tenant?.tenantName ?? "-",
                plan = tenant?.plan ?? "free",

                // Estado
                online = true,
                lastSync = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"),

                // KPIs
                salesToday,
                marginToday,
                ticketsToday,
                salesMonth,
                marginMonth,
                ticketsMonth,
                avgTicketMonth,

                // Totales
                productsTotal,
                customersTotal,
                warehousesTotal,

                // Listas
                latestProducts,
                lowStock,
                receivablesDueSoon,
                activity = activity.Select(a => new
                {
                    a.kind,
                    a.refId,
                    a.title,
                    whenAt = ((DateTime)a.whenAt).ToString("yyyy-MM-dd HH:mm")
                })
            });
        }
    }
}
