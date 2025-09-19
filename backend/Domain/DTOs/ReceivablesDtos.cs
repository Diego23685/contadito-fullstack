namespace Contadito.Api.Domain.DTOs
{
    public class CreateSimpleReceivableDto
    {
        public long CustomerId { get; set; }
        public string Number { get; set; } = "";     // ej: "FAC-000123"
        public DateTime? IssuedAt { get; set; }      // por defecto: UtcNow
        public DateTime? DueAt { get; set; }         // opcional
        public decimal Total { get; set; }           // monto total a cobrar
        public string? Notes { get; set; }
    }

    public class CreatePaymentDto
    {
        public long InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = "cash"; // cash|card|transfer|other
        public string? Reference { get; set; }
        public DateTime? PaidAt { get; set; }        // por defecto: UtcNow
        public string? Notes { get; set; }
    }
}
