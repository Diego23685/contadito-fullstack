using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;


namespace Contadito.Api.Infrastructure.Email
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly SmtpOptions _opts;
        private readonly ILogger<SmtpEmailSender> _log;

        public SmtpEmailSender(IOptions<SmtpOptions> opts, ILogger<SmtpEmailSender> log)
        {
            _opts = opts.Value;
            _log = log;
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null)
        {
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(_opts.FromName ?? _opts.FromEmail, _opts.FromEmail));
            msg.To.Add(MailboxAddress.Parse(toEmail));
            msg.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlBody,
                TextBody = textBody ?? StripHtml(htmlBody)
            };
            msg.Body = builder.ToMessageBody();

            using var client = new SmtpClient();

            // Seleccionar opción TLS correcta según puerto
            SecureSocketOptions socketOptions = SecureSocketOptions.StartTls;
            if (_opts.Port == 465) socketOptions = SecureSocketOptions.SslOnConnect;
            else if (_opts.Port == 587) socketOptions = SecureSocketOptions.StartTls;
            else if (_opts.Port == 1025) socketOptions = SecureSocketOptions.None; // MailHog/Mailpit (dev)

            // Si estás probando con certificados self-signed en dev:
            if (_opts.AllowInvalidCert)
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;

            await client.ConnectAsync(_opts.Host, _opts.Port, socketOptions);

            // Si autenticas con usuario/clave y no con OAuth2:
            client.AuthenticationMechanisms.Remove("XOAUTH2");

            if (!string.IsNullOrWhiteSpace(_opts.User))
                await client.AuthenticateAsync(_opts.User, _opts.Password);

            await client.SendAsync(msg);
            await client.DisconnectAsync(true);

            _log.LogInformation("SMTP: Email enviado a {to}", toEmail);
        }

        private static string StripHtml(string html)
        {
            return System.Text.RegularExpressions.Regex.Replace(html, "<.*?>", string.Empty);
        }
    }

    public class SmtpOptions
    {
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public string FromEmail { get; set; } = "";
        public string? FromName { get; set; }
        public string User { get; set; } = "";
        public string Password { get; set; } = "";
        public bool AllowInvalidCert { get; set; } = false;
    }
}
