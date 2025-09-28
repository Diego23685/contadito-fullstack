using System;

namespace Contadito.Api.Domain.Entities
{
    public class ReportDefinition
    {
        public long Id { get; set; }
        public long TenantId { get; set; }
        public string Name { get; set; } = default!;
        public string Source { get; set; } = default!;            // "sales" | "purchases" | "inventory" | "products"
        public string DefinitionJson { get; set; } = default!;    // guarda el request del runner como JSON
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? DeletedAt { get; set; }
    }
}
