// Domain/Entities/Warehouse.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Contadito.Api.Domain.Entities
{
    [Table("warehouses")] // nombre EXACTO de la tabla en MySQL
    public class Warehouse
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("TenantId")]
        public long TenantId { get; set; }

        [Required]
        [MaxLength(120)]
        [Column("Name")]
        public string Name { get; set; } = null!;

        [MaxLength(64)]
        [Column("Code")]
        public string? Code { get; set; }

        [MaxLength(240)]
        [Column("Address")]
        public string? Address { get; set; }

        [Column("Notes", TypeName = "text")]
        public string? Notes { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }

        [Column("DeletedAt")]
        public DateTime? DeletedAt { get; set; }
    }
}
