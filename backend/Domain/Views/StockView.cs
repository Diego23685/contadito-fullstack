using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Domain.Views
{
    [Keyless]
    [Table("v_stock")]
    public class StockView
    {
        [Column("tenant_id")] public long TenantId { get; set; }
        [Column("product_id")] public long ProductId { get; set; }
        [Column("warehouse_id")] public long? WarehouseId { get; set; }
        [Column("qty")] public decimal Qty { get; set; }
    }
}
