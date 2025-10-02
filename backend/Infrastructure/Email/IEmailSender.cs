using System.Threading.Tasks;

namespace Contadito.Api.Infrastructure.Email
{
    public interface IEmailSender
    {
        Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null);
    }
}
