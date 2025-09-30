using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Contadito.Api.Data;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("reports")]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ReportsController(AppDbContext db) => _db = db;

        // Clase (no record) para evitar issues con data annotations en records
        public class RunReportDto
        {
            // Modo legado
            public string? Name { get; set; }

            // Nueva API
            public string? Source { get; set; }                // "sales" | "purchases" | "inventory_movements" | "products"
            public string? From { get; set; }                  // "YYYY-MM-DD"
            public string? To { get; set; }                    // "YYYY-MM-DD"

            // Compat con payload del front
            public string? DateFrom { get; set; }
            public string? DateTo { get; set; }
            public Dictionary<string, object?>? Filters { get; set; }

            // Filtros planos
            public string? Status { get; set; }                // "issued,paid" o "issued/paid"
            public string? Currency { get; set; }              // "NIO,USD" o "NIO/USD"

            // Dimensiones y métricas
            public string[]? GroupBy { get; set; }             // ["date:day","status","currency","invoice","customer","product","movementType"]
            public string[]? Metrics { get; set; }             // ["count","sum_total","sum_qty","sum_subtotal","sum_discount","sum_tax"]

            // Extras
            public Dictionary<string, object?>? @params { get; set; } // compat
        }

        [HttpPost("run")]
        public async Task<IActionResult> Run([FromBody] RunReportDto dto)
        {
            var tenantId = GetTenantId();

            // ----- MODO LEGADO: name = "low-stock" | "sales-due-soon"
            var legacyName = dto.Name?.Trim();
            if (!string.IsNullOrWhiteSpace(legacyName))
            {
                switch (legacyName.ToLowerInvariant())
                {
                    case "low-stock":
                        return await ReportLowStock(tenantId);
                    case "sales-due-soon":
                    {
                        var days = 7;
                        if (dto.@params != null && dto.@params.TryGetValue("days", out var o) &&
                            int.TryParse(Convert.ToString(o), out var d) && d > 0)
                            days = d;
                        return await ReportSalesDueSoon(tenantId, days);
                    }
                }
            }

            // ----- NUEVO MODO: fuente + filtros + groupby + métricas
            var source = (dto.Source ?? "").Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(source))
                return BadRequest("Source is required. Try: sales | purchases | inventory_movements.");

            // Fechas (acepta from/to y dateFrom/dateTo)
            var fromStr = string.IsNullOrWhiteSpace(dto.From) ? dto.DateFrom : dto.From;
            var toStr   = string.IsNullOrWhiteSpace(dto.To)   ? dto.DateTo   : dto.To;
            (DateTime? fromUtc, DateTime? toUtc) = ParseDateRange(fromStr, toStr);

            // Filtros (acepta status/currency planos o dentro de Filters)
            string? statusRaw = dto.Status;
            string? currencyRaw = dto.Currency;
            if (dto.Filters != null)
            {
                if (dto.Filters.TryGetValue("status", out var sObj))
                    statusRaw ??= Convert.ToString(sObj);
                if (dto.Filters.TryGetValue("currency", out var cObj))
                    currencyRaw ??= Convert.ToString(cObj);
            }

            var statuses = SplitList(statusRaw);     // HashSet<string> lower + upper
            var currencies = SplitList(currencyRaw); // HashSet<string> lower + upper

            // GroupBy y métricas
            var gb = (dto.GroupBy ?? Array.Empty<string>()).Select(s => s.ToLowerInvariant()).ToArray();
            bool byDay = gb.Contains("date:day") || gb.Contains("date");
            bool byMonth = gb.Contains("date:month");
            if (byDay && byMonth) byMonth = false; // preferimos day si vienen ambos

            bool byStatus   = gb.Contains("status");
            bool byCurrency = gb.Contains("currency");

            // Dimensiones extra
            bool byInvoice  = gb.Contains("invoice")  || gb.Contains("invoice_id");
            bool byCustomer = gb.Contains("customer") || gb.Contains("customer_id");
            bool byProduct  = gb.Contains("product")  || gb.Contains("product_id");

            var metrics = (dto.Metrics ?? Array.Empty<string>()).Select(s => s.ToLowerInvariant()).ToArray();
            if (metrics.Length == 0)
                metrics = new[] { "count", "sum_total" };

            switch (source)
            {
                case "sales":
                    if (byInvoice || byCustomer || byProduct)
                    {
                        return await AggregateSalesItems(
                            tenantId, fromUtc, toUtc, statuses, currencies,
                            byDay, byMonth, byStatus, byCurrency, byInvoice, byCustomer, byProduct, metrics);
                    }
                    return await AggregateSales(
                        tenantId, fromUtc, toUtc, statuses, currencies,
                        byDay, byMonth, byStatus, byCurrency, byInvoice, byCustomer, byProduct, metrics);

                case "purchases":
                    return await AggregatePurchases(
                        tenantId, fromUtc, toUtc, statuses, currencies,
                        byDay, byMonth, byStatus, byCurrency, metrics);

                case "inventory_movements":
                    return await AggregateInventoryMovements(
                        tenantId, fromUtc, toUtc,
                        gb, metrics);

                case "inventory":
                    return BadRequest("Aggregation for 'inventory' is not implemented. Use 'inventory_movements'.");

                case "products":
                    return BadRequest("Aggregation for 'products' is not implemented yet.");

                default:
                    return NotFound(new { error = $"Unknown source '{source}'. Try: sales | purchases | inventory_movements." });
            }
        }

        // =========================
        // Reportes "legado" simples
        // =========================

        private async Task<IActionResult> ReportLowStock(long tenantId)
        {
            var low = await _db.Products
                .AsNoTracking()
                .Where(p => p.TenantId == tenantId && p.TrackStock && p.DeletedAt == null)
                .Select(p => new
                {
                    p.Id,
                    p.Sku,
                    p.Name,
                    Stock = _db.Stocks
                        .Where(s => s.TenantId == p.TenantId && s.ProductId == p.Id)
                        .Sum(s => (decimal?)s.Qty) ?? 0m
                })
                .Where(x => x.Stock <= 5m)
                .OrderBy(x => x.Stock).ThenBy(x => x.Name)
                .Take(200)
                .ToListAsync();

            return Ok(new
            {
                title = "Stock bajo (<= 5)",
                source = "products",
                columns = new[] { "Id", "Sku", "Nombre", "Stock" },
                rows = low.Select(x => new object[] { x.Id, x.Sku ?? "", x.Name, x.Stock })
            });
        }

        private async Task<IActionResult> ReportSalesDueSoon(long tenantId, int days)
        {
            var dueTo = DateTime.UtcNow.AddDays(days);

            var due = await _db.SalesInvoices
                .AsNoTracking()
                .Where(s => s.TenantId == tenantId && s.Status == "issued" && s.DueAt != null
                            && s.DueAt >= DateTime.UtcNow && s.DueAt <= dueTo)
                .Select(s => new
                {
                    s.Number,
                    CustomerName = _db.Customers.Where(c => c.Id == s.CustomerId).Select(c => c.Name).FirstOrDefault(),
                    s.Total,
                    Paid = _db.Payments.Where(p => p.TenantId == s.TenantId && p.InvoiceId == s.Id).Sum(p => (decimal?)p.Amount) ?? 0m,
                    s.DueAt
                })
                .Where(x => (x.Total - x.Paid) > 0m)
                .OrderBy(x => x.DueAt)
                .Take(200)
                .ToListAsync();

            return Ok(new
            {
                title = $"Cuentas por cobrar (próx. {days} días)",
                source = "sales",
                columns = new[] { "Factura", "Cliente", "Total", "Pagado", "Pendiente", "Vence" },
                rows = due.Select(x => new object[] { x.Number, x.CustomerName ?? "", x.Total, x.Paid, x.Total - x.Paid, x.DueAt })
            });
        }

        // =======================================
        // Agregaciones SALES (facturas y por ítem)
        // =======================================

        private async Task<IActionResult> AggregateSales(
            long tenantId,
            DateTime? fromUtc, DateTime? toUtc,
            HashSet<string> statuses, HashSet<string> currencies,
            bool byDay, bool byMonth, bool byStatus, bool byCurrency,
            bool byInvoice, bool byCustomer, bool byProduct,
            string[] metrics)
        {
            var q = _db.SalesInvoices.AsNoTracking()
                .Where(s => s.TenantId == tenantId);

            // Fecha base: COALESCE(IssuedAt, CreatedAt, UtcNow)
            if (fromUtc.HasValue) q = q.Where(s =>
                (((DateTime?)s.IssuedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow) >= fromUtc.Value);
            if (toUtc.HasValue)   q = q.Where(s =>
                (((DateTime?)s.IssuedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow) <  toUtc.Value);

            if (statuses.Count > 0)   q = q.Where(s => statuses.Contains(s.Status.ToLower()));
            if (currencies.Count > 0) q = q.Where(s => currencies.Contains((s.Currency ?? "").ToUpper()));

            var tmp = q.Select(s => new
            {
                Date = (((DateTime?)s.IssuedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow),
                Status = s.Status,
                Currency = s.Currency ?? "NIO",
                s.Subtotal,
                s.DiscountTotal,
                s.TaxTotal,
                s.Total
            });

            var grouped = tmp.GroupBy(x => new
            {
                Day   = byDay   ? x.Date.Date : (DateTime?)null,
                Year  = byMonth ? x.Date.Year : (int?)null,
                Month = byMonth ? x.Date.Month : (int?)null,
                Status   = byStatus   ? x.Status   : null,
                Currency = byCurrency ? x.Currency : null,
                // A nivel factura no hay invoice/customer/product (solo para items)
                Invoice = byInvoice ? "" : null,
                Customer = byCustomer ? "" : null,
                ProductId = byProduct ? (long?)0 : null,
                ProductSku = byProduct ? "" : null,
                ProductName = byProduct ? "" : null
            })
            .Select(g => new
            {
                g.Key.Day, g.Key.Year, g.Key.Month, g.Key.Status, g.Key.Currency,
                g.Key.Invoice, g.Key.Customer, g.Key.ProductId, g.Key.ProductSku, g.Key.ProductName,
                Count       = g.Count(),
                SumQty      = 0m, // compat cuando piden sum_qty
                SumSubtotal = g.Sum(v => (decimal?)v.Subtotal)      ?? 0m,
                SumDiscount = g.Sum(v => (decimal?)v.DiscountTotal) ?? 0m,
                SumTax      = g.Sum(v => (decimal?)v.TaxTotal)      ?? 0m,
                SumTotal    = g.Sum(v => (decimal?)v.Total)         ?? 0m
            });

            var data = await grouped
                .OrderBy(x => x.Day).ThenBy(x => x.Year).ThenBy(x => x.Month)
                .ThenBy(x => x.Status).ThenBy(x => x.Currency)
                .ToListAsync();

            return Ok(BuildTable("Ventas (agrupado)", "sales", data,
                byDay, byMonth, byStatus, byCurrency, byInvoice, byCustomer, byProduct, metrics));
        }

        private async Task<IActionResult> AggregateSalesItems(
            long tenantId,
            DateTime? fromUtc, DateTime? toUtc,
            HashSet<string> statuses, HashSet<string> currencies,
            bool byDay, bool byMonth, bool byStatus, bool byCurrency,
            bool byInvoice, bool byCustomer, bool byProduct,
            string[] metrics)
        {
            var q =
                from i in _db.SalesItems.AsNoTracking()
                join s in _db.SalesInvoices.AsNoTracking() on i.InvoiceId equals s.Id
                join p in _db.Products.AsNoTracking() on i.ProductId equals p.Id
                join c0 in _db.Customers.AsNoTracking() on s.CustomerId equals c0.Id into sc
                from c in sc.DefaultIfEmpty()
                where i.TenantId == tenantId && s.TenantId == tenantId && p.TenantId == tenantId
                select new { i, s, p, c };

            if (fromUtc.HasValue) q = q.Where(x =>
                (((DateTime?)x.s.IssuedAt) ?? ((DateTime?)x.s.CreatedAt) ?? DateTime.UtcNow) >= fromUtc.Value);
            if (toUtc.HasValue)   q = q.Where(x =>
                (((DateTime?)x.s.IssuedAt) ?? ((DateTime?)x.s.CreatedAt) ?? DateTime.UtcNow) <  toUtc.Value);

            if (statuses.Count > 0)   q = q.Where(x => statuses.Contains(x.s.Status.ToLower()));
            if (currencies.Count > 0) q = q.Where(x => currencies.Contains((x.s.Currency ?? "").ToUpper()));

            var tmp = q.Select(x => new
            {
                Date     = (((DateTime?)x.s.IssuedAt) ?? ((DateTime?)x.s.CreatedAt) ?? DateTime.UtcNow),
                Status   = x.s.Status,
                Currency = x.s.Currency ?? "NIO",
                Invoice  = x.s.Number,
                Customer = x.c != null ? x.c.Name : null,
                ProductId = x.p.Id,
                ProductSku = x.p.Sku,
                ProductName = x.p.Name,
                Qty = x.i.Quantity,
                UnitPrice = x.i.UnitPrice,
                DiscountRate = (decimal?)(x.i.DiscountRate) ?? 0m, // % (0..100)
                TaxRate      = (decimal?)(x.i.TaxRate)      ?? 0m, // % (0..100)
                LineTotal = x.i.Total
            });

            var grouped = tmp.GroupBy(x => new
            {
                Day   = byDay   ? x.Date.Date : (DateTime?)null,
                Year  = byMonth ? x.Date.Year : (int?)null,
                Month = byMonth ? x.Date.Month : (int?)null,
                Status   = byStatus   ? x.Status   : null,
                Currency = byCurrency ? x.Currency : null,
                Invoice  = byInvoice  ? x.Invoice  : null,
                Customer = byCustomer ? x.Customer : null,
                ProductId   = byProduct ? (long?)x.ProductId : null,
                ProductSku  = byProduct ? x.ProductSku : null,
                ProductName = byProduct ? x.ProductName : null
            })
            .Select(g => new
            {
                g.Key.Day, g.Key.Year, g.Key.Month, g.Key.Status, g.Key.Currency,
                g.Key.Invoice, g.Key.Customer, g.Key.ProductId, g.Key.ProductSku, g.Key.ProductName,
                Count       = g.Count(),
                SumQty      = g.Sum(v => (decimal?)v.Qty) ?? 0m,
                // Subtotal/Descuento/Impuesto aproximados a partir de UnitPrice/Qty/%
                SumSubtotal = g.Sum(v => (decimal?)(v.UnitPrice * v.Qty)) ?? 0m,
                SumDiscount = g.Sum(v => (decimal?)((v.UnitPrice * v.Qty) * (v.DiscountRate / 100m))) ?? 0m,
                SumTax      = g.Sum(v => (decimal?)(((v.UnitPrice * v.Qty) - ((v.UnitPrice * v.Qty) * (v.DiscountRate / 100m))) * (v.TaxRate / 100m))) ?? 0m,
                SumTotal    = g.Sum(v => (decimal?)v.LineTotal) ?? 0m
            });

            var data = await grouped
                .OrderBy(x => x.Day).ThenBy(x => x.Year).ThenBy(x => x.Month)
                .ThenBy(x => x.Status).ThenBy(x => x.Currency)
                .ThenBy(x => x.Invoice).ThenBy(x => x.Customer).ThenBy(x => x.ProductName)
                .ToListAsync();

            return Ok(BuildTable("Ventas por ítem", "sales", data,
                byDay, byMonth, byStatus, byCurrency, byInvoice, byCustomer, byProduct, metrics));
        }

        // =======================================
        // Agregación INVENTORY_MOVEMENTS (por día/tipo)
        // =======================================

        private async Task<IActionResult> AggregateInventoryMovements(
            long tenantId,
            DateTime? fromUtc, DateTime? toUtc,
            string[] groupBy, string[] metrics)
        {
            var gb = groupBy.Select(s => s.ToLowerInvariant()).ToList();
            var wantDateDay  = gb.Contains("date:day") || gb.Contains("date");
            var wantMoveType = gb.Contains("movementtype") || gb.Contains("movement_type");

            if (!wantDateDay || !wantMoveType)
                return NotFound(new { error = "inventory_movements: groupBy=['date:day','movementType'] requerido." });

            var ms = metrics.Select(s => s.ToLowerInvariant()).ToList();
            var wantCount  = ms.Contains("count");
            var wantSumQty = ms.Contains("sum_qty") || ms.Contains("qty");
            if (!wantCount && !wantSumQty)
                return NotFound(new { error = "inventory_movements: metrics=['sum_qty','count'] requerido." });

            var q = _db.InventoryMovements.AsNoTracking()
                .Where(m => m.TenantId == tenantId);

            // Rango por moved_at (fallback a created_at)
            if (fromUtc.HasValue) q = q.Where(m =>
                (((DateTime?)m.MovedAt) ?? ((DateTime?)m.CreatedAt) ?? DateTime.UtcNow) >= fromUtc.Value);
            if (toUtc.HasValue)   q = q.Where(m =>
                (((DateTime?)m.MovedAt) ?? ((DateTime?)m.CreatedAt) ?? DateTime.UtcNow) <  toUtc.Value);

            var rows = await q
                .Select(m => new
                {
                    Date = (((DateTime?)m.MovedAt) ?? ((DateTime?)m.CreatedAt) ?? DateTime.UtcNow),
                    MovementType = (m.MovementType ?? "").ToLower(), // "in" | "out" | "adjust"
                    Qty = m.Quantity
                })
                .GroupBy(x => new { Day = x.Date.Date, x.MovementType })
                .Select(g => new
                {
                    g.Key.Day,
                    g.Key.MovementType,
                    Count = g.Count(),
                    SumQty = g.Sum(v => v.Qty)
                })
                .OrderBy(r => r.Day).ThenBy(r => r.MovementType)
                .ToListAsync();

            // Tabla compatible con el front
            var columns = new List<string> { "date:day", "movementType" };
            if (wantCount)  columns.Add("count");
            if (wantSumQty) columns.Add("sum_qty");

            var data = new List<object[]>();
            foreach (var r in rows)
            {
                var line = new List<object>
                {
                    r.Day.ToString("yyyy-MM-dd"),
                    r.MovementType
                };
                if (wantCount)  line.Add(r.Count);
                if (wantSumQty) line.Add(r.SumQty);
                data.Add(line.ToArray());
            }

            return Ok(new
            {
                title = "Movimientos de inventario",
                source = "inventory_movements",
                columns,
                rows = data
            });
        }

        // =======================================
        // Agregaciones PURCHASES (nivel factura)
        // =======================================

        private async Task<IActionResult> AggregatePurchases(
            long tenantId,
            DateTime? fromUtc, DateTime? toUtc,
            HashSet<string> statuses, HashSet<string> currencies,
            bool byDay, bool byMonth, bool byStatus, bool byCurrency,
            string[] metrics)
        {
            var q = _db.PurchaseInvoices.AsNoTracking()
                .Where(s => s.TenantId == tenantId);

            if (fromUtc.HasValue) q = q.Where(s =>
                (((DateTime?)s.ReceivedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow) >= fromUtc.Value);
            if (toUtc.HasValue)   q = q.Where(s =>
                (((DateTime?)s.ReceivedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow) <  toUtc.Value);

            if (statuses.Count > 0)   q = q.Where(s => statuses.Contains(s.Status.ToLower()));
            if (currencies.Count > 0) q = q.Where(s => currencies.Contains((s.Currency ?? "").ToUpper()));

            var tmp = q.Select(s => new
            {
                Date = (((DateTime?)s.ReceivedAt) ?? ((DateTime?)s.CreatedAt) ?? DateTime.UtcNow),
                Status = s.Status,
                Currency = s.Currency ?? "NIO",
                s.Subtotal,
                s.DiscountTotal,
                s.TaxTotal,
                s.Total
            });

            var grouped = tmp.GroupBy(x => new
            {
                Day   = byDay   ? x.Date.Date : (DateTime?)null,
                Year  = byMonth ? x.Date.Year : (int?)null,
                Month = byMonth ? x.Date.Month : (int?)null,
                Status   = byStatus   ? x.Status   : null,
                Currency = byCurrency ? x.Currency : null
            })
            .Select(g => new
            {
                g.Key.Day, g.Key.Year, g.Key.Month, g.Key.Status, g.Key.Currency,
                // compat c/tabla
                Invoice = (string?)null, Customer = (string?)null,
                ProductId = (long?)null, ProductSku = (string?)null, ProductName = (string?)null,
                Count       = g.Count(),
                SumQty      = 0m,
                SumSubtotal = g.Sum(v => (decimal?)v.Subtotal)      ?? 0m,
                SumDiscount = g.Sum(v => (decimal?)v.DiscountTotal) ?? 0m,
                SumTax      = g.Sum(v => (decimal?)v.TaxTotal)      ?? 0m,
                SumTotal    = g.Sum(v => (decimal?)v.Total)         ?? 0m
            });

            var data = await grouped
                .OrderBy(x => x.Day)
                .ThenBy(x => x.Year).ThenBy(x => x.Month)
                .ThenBy(x => x.Status).ThenBy(x => x.Currency)
                .ToListAsync();

            return Ok(BuildTable("Compras (agrupado)", "purchases", data,
                byDay, byMonth, byStatus, byCurrency, false, false, false, metrics));
        }

        // ===========================
        // Helpers
        // ===========================

        // Al final de ReportsController (misma clase), reemplaza el método por este:
        private static (DateTime? fromUtc, DateTime? toUtc) ParseDateRange(string? from, string? to)
        {
            // Ajusta este offset al huso horario local del tenant (ej. Nicaragua = UTC-6)
            TimeSpan tenantOffset = TimeSpan.FromHours(-6);

            DateTime? fromUtc = null, toUtc = null;

            if (!string.IsNullOrWhiteSpace(from) &&
                DateTime.TryParseExact(from.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var fLocal))
            {
                var fLocalMidnight = new DateTime(fLocal.Year, fLocal.Month, fLocal.Day, 0, 0, 0, DateTimeKind.Unspecified);
                fromUtc = new DateTimeOffset(fLocalMidnight, tenantOffset).UtcDateTime;
            }

            if (!string.IsNullOrWhiteSpace(to) &&
                DateTime.TryParseExact(to.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var tLocal))
            {
                // Rango inclusivo en fecha local => < (medianoche del día siguiente en local)
                var tLocalNextMidnight = new DateTime(tLocal.Year, tLocal.Month, tLocal.Day, 0, 0, 0, DateTimeKind.Unspecified).AddDays(1);
                toUtc = new DateTimeOffset(tLocalNextMidnight, tenantOffset).UtcDateTime;
            }

            return (fromUtc, toUtc);
        }


        private static HashSet<string> SplitList(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return new HashSet<string>();
            var items = s.Replace('/', ',')
                         .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            // status => lower, currency => upper; hacemos ambos para tolerancia
            return new HashSet<string>(items.Select(x => x.ToLowerInvariant())
                                            .Concat(items.Select(x => x.ToUpperInvariant())));
        }

        private object BuildTable<T>(
            string title, string source, IEnumerable<T> data,
            bool byDay, bool byMonth, bool byStatus, bool byCurrency,
            bool byInvoice, bool byCustomer, bool byProduct,
            string[] metrics)
            where T : class
        {
            // Columnas
            var columns = new List<string>();
            if (byDay)    columns.Add("date");
            else if (byMonth) columns.Add("month");
            if (byStatus)   columns.Add("status");
            if (byCurrency) columns.Add("currency");
            if (byInvoice)  columns.Add("invoice");
            if (byCustomer) columns.Add("customer");
            if (byProduct)
            {
                columns.Add("product_id");
                columns.Add("product_sku");
                columns.Add("product_name");
            }

            foreach (var m in metrics)
            {
                switch (m)
                {
                    case "count":         columns.Add("count"); break;
                    case "sum_qty":       columns.Add("sum_qty"); break;
                    case "sum_subtotal":  columns.Add("sum_subtotal"); break;
                    case "sum_discount":  columns.Add("sum_discount"); break;
                    case "sum_tax":       columns.Add("sum_tax"); break;
                    case "sum_total":     columns.Add("sum_total"); break;
                }
            }
            if (!metrics.Any()) columns.AddRange(new[] { "count", "sum_total" });

            // Filas
            var rows = new List<object[]>();
            foreach (var r in data)
            {
                var type = r!.GetType();
                var vals = new List<object?>();

                if (byDay)
                {
                    var day = (DateTime?)type.GetProperty("Day")!.GetValue(r)!;
                    vals.Add(day?.ToString("yyyy-MM-dd") ?? "");
                }
                else if (byMonth)
                {
                    var y = (int?)type.GetProperty("Year")!.GetValue(r)!;
                    var m = (int?)type.GetProperty("Month")!.GetValue(r)!;
                    vals.Add((y.HasValue && m.HasValue) ? $"{y:0000}-{m:00}" : "");
                }

                if (byStatus)   vals.Add((string?)type.GetProperty("Status")!.GetValue(r) ?? "");
                if (byCurrency) vals.Add((string?)type.GetProperty("Currency")!.GetValue(r) ?? "");
                if (byInvoice)  vals.Add((string?)type.GetProperty("Invoice")!.GetValue(r) ?? "");
                if (byCustomer) vals.Add((string?)type.GetProperty("Customer")!.GetValue(r) ?? "");
                if (byProduct)
                {
                    vals.Add((type.GetProperty("ProductId")!.GetValue(r) as long?)?.ToString() ?? "");
                    vals.Add((string?)type.GetProperty("ProductSku")!.GetValue(r) ?? "");
                    vals.Add((string?)type.GetProperty("ProductName")!.GetValue(r) ?? "");
                }

                foreach (var k in metrics)
                {
                    switch (k)
                    {
                        case "count":         vals.Add((int)type.GetProperty("Count")!.GetValue(r)!); break;
                        case "sum_qty":       vals.Add((decimal)type.GetProperty("SumQty")!.GetValue(r)!); break;
                        case "sum_subtotal":  vals.Add((decimal)type.GetProperty("SumSubtotal")!.GetValue(r)!); break;
                        case "sum_discount":  vals.Add((decimal)type.GetProperty("SumDiscount")!.GetValue(r)!); break;
                        case "sum_tax":       vals.Add((decimal)type.GetProperty("SumTax")!.GetValue(r)!); break;
                        case "sum_total":     vals.Add((decimal)type.GetProperty("SumTotal")!.GetValue(r)!); break;
                    }
                }

                rows.Add(vals.Select(v => (object?)v ?? "").ToArray()!);
            }

            return new
            {
                title,
                source,
                columns,
                rows
            };
        }

        private long GetTenantId()
        {
            if (HttpContext.Items.TryGetValue("TenantId", out var t) && t is long tid) return tid;
            return 0;
        }
    }
}
