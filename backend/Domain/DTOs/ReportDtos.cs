using System;
using System.Collections.Generic;

namespace Contadito.Api.Domain.DTOs
{
    public class ReportRunRequest
    {
        public string Source { get; set; } = "sales";  // sales|purchases|inventory|products
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }

        // groupBy soportado por fuente:
        // sales:      date:day|date:month|status|currency
        // purchases:  date:day|date:month
        // inventory:  date:day|date:month|movement_type|warehouse_id|product_id
        // products:   is_service|track_stock
        public List<string>? GroupBy { get; set; }

        // metrics soportadas:
        // sales:     count, sum_subtotal, sum_discount, sum_tax, sum_total
        // purchases: count, sum_total
        // inventory: count, sum_qty, sum_amount
        // products:  count, avg_list_price, avg_std_cost
        public List<string>? Metrics { get; set; }

        // filtros específicos por fuente (todos opcionales)
        // sales:     status, currency
        // inventory: productId, warehouseId, movementType ('in'|'out'|'adjust')
        public Dictionary<string, string>? Filters { get; set; }

        public int? Limit { get; set; }     // tope de filas en la respuesta
        public List<ReportSortSpec>? Sort { get; set; }  // por ejemplo [{ field: "sum_total", dir: "desc" }]
    }

    public class ReportSortSpec
    {
        public string Field { get; set; } = "";
        public string Dir { get; set; } = "asc"; // asc|desc
    }

    public class ReportCreateDto
    {
        public string Name { get; set; } = default!;
        public string Source { get; set; } = "sales";
        public ReportRunRequest Definition { get; set; } = new ReportRunRequest();
    }
}
