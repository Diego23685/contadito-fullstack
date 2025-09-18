using Contadito.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Contadito.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("pricing")]
    public class PricingController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PricingController(AppDbContext db) => _db = db;
        private long TenantId => (long)(HttpContext.Items["TenantId"] ?? 0);

        // GET /pricing/quote?customerId=1&productId=2
        [HttpGet("quote")]
        public async Task<ActionResult<object>> Quote([FromQuery] long customerId, [FromQuery] long productId)
        {
            var now = DateTime.UtcNow;

            var sp = await _db.SpecialPrices.AsNoTracking()
                .Where(x => x.TenantId == TenantId && x.CustomerId == customerId && x.ProductId == productId
                            && (x.ActiveFrom == null || x.ActiveFrom <= now)
                            && (x.ActiveTo == null   || x.ActiveTo   >= now))
                .OrderByDescending(x => x.ActiveFrom)
                .FirstOrDefaultAsync();

            var basePrice = await _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId && p.Id == productId)
                .Select(p => p.ListPrice)
                .FirstOrDefaultAsync();

            var avgCost = await _db.AvgCosts.AsNoTracking()
                .Where(a => a.TenantId == TenantId && a.ProductId == productId)
                .Select(a => (decimal?)a.AvgUnitCost)
                .FirstOrDefaultAsync();

            var stdCost = await _db.Products.AsNoTracking()
                .Where(p => p.TenantId == TenantId && p.Id == productId)
                .Select(p => p.StdCost)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                productId,
                customerId,
                price = sp?.Price ?? basePrice,
                cost = avgCost ?? stdCost ?? 0m
            });
        }
    }
}
