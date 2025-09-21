using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("product_images")]
    public class ProductImage
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public long ProductId { get; set; }
        public string Url { get; set; } = "";
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
