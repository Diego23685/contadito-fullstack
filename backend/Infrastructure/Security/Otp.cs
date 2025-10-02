using System;
using System.Security.Cryptography;

namespace Contadito.Api.Infrastructure.Security
{
    public static class Otp
    {
        public static string GenerateNumeric(int digits = 6)
        {
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[4];
            rng.GetBytes(bytes);
            var mod = (uint)Math.Pow(10, digits);
            var val = BitConverter.ToUInt32(bytes, 0) % mod;
            return val.ToString(new string('0', digits));
        }

        public static string Hash(string code) => BCrypt.Net.BCrypt.HashPassword(code);

        public static bool Verify(string code, string hash) => BCrypt.Net.BCrypt.Verify(code, hash);
    }
}
