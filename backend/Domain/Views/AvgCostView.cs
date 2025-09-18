using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Domain.Views
{
    [Keyless]
    [Table("v_avg_cost")]
    public class AvgCostView
    {
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("product_id")] public long ProductId { get; set; }
        [Column("avg_unit_cost")] public decimal AvgUnitCost { get; set; }
    }
}
