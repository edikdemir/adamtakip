using System.Text.Json;
using IsTakip.Data;
using IsTakip.Domain;
using IsTakip.Server.Api;
using IsTakip.Server.Auth;
using IsTakip.Server.Json;
using IsTakip.Server.Startup;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Windows servisi olarak çalışır; servis dışında (dotnet run) no-op.
builder.Host.UseWindowsService(options => options.ServiceName = "IsTakip");

builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.Section));
builder.Services.Configure<SiteOptions>(builder.Configuration.GetSection(SiteOptions.Section));
var authOptions = builder.Configuration.GetSection(AuthOptions.Section).Get<AuthOptions>() ?? new AuthOptions();
var siteOptions = builder.Configuration.GetSection(SiteOptions.Section).Get<SiteOptions>() ?? new SiteOptions();

// JSON: web sözleşmesi snake_case; enum'lar snake_case metin.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    o.SerializerOptions.DictionaryKeyPolicy = null;
    o.SerializerOptions.Converters.Add(new SnakeCaseEnumConverterFactory());
    o.SerializerOptions.Converters.Add(new FlagsCsvJsonConverter());
});

// Veritabanı: SQLite varsayılan, SQL Server opsiyonel.
var dbProvider = builder.Configuration["Database:Provider"] ?? "Sqlite";
var connectionString = builder.Configuration["Database:ConnectionString"] ?? "Data Source=istakip.db";
builder.Services.AddDbContext<AppDbContext>(o =>
{
    if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        o.UseSqlServer(connectionString);
    else
        o.UseSqlite(connectionString);
});

builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// Kimlik: cookie oturumu; kimliksiz /api → 401 JSON (302 değil).
var authBuilder = builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = authOptions.CookieName;
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromHours(authOptions.SessionHours);
        o.SlidingExpiration = false;
        o.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            return ctx.Response.WriteAsync("""{"error":"Yetkisiz"}""");
        };
        o.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            return ctx.Response.WriteAsync("""{"error":"Yetkisiz erişim"}""");
        };
    });

if (authOptions.Has("windows"))
{
    authBuilder.AddNegotiate();
}

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("Admin", p => p.RequireRole("super_admin"));
});

var app = builder.Build();

await DatabaseInitializer.InitializeAsync(app.Services);

// CSRF: durum değiştiren /api isteklerinde Origin varsa kendi adresimiz ya da tanımlı dış adres olmalı (eski proxy.ts kuralı).
var allowedOrigins = siteOptions.PublicUrls
    .Select(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) ? uri.GetLeftPart(UriPartial.Authority) : null)
    .Where(u => u is not null)
    .ToHashSet(StringComparer.OrdinalIgnoreCase)!;

app.Use(async (ctx, next) =>
{
    var isUnsafe = HttpMethods.IsPost(ctx.Request.Method) || HttpMethods.IsPut(ctx.Request.Method)
                   || HttpMethods.IsPatch(ctx.Request.Method) || HttpMethods.IsDelete(ctx.Request.Method);
    if (isUnsafe && ctx.Request.Path.StartsWithSegments("/api"))
    {
        var origin = ctx.Request.Headers.Origin.ToString();
        if (!string.IsNullOrEmpty(origin))
        {
            var self = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            if (!origin.Equals(self, StringComparison.OrdinalIgnoreCase) && !allowedOrigins.Contains(origin))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsJsonAsync(new { error = "Geçersiz kaynak" });
                return;
            }
        }
    }
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api");

api.MapGet("/health", (AppDbContext db) => Results.Ok(new
{
    status = "ok",
    version = typeof(Program).Assembly.GetName().Version?.ToString(3) ?? "0.0.0",
    provider = dbProvider,
    time_utc = DateTime.UtcNow,
})).AllowAnonymous();

api.MapAuth(authOptions);
api.MapReferenceData();

// SPA fallback: /api dışı her yol index.html; /api'de bilinmeyen yol 404 JSON.
app.MapFallback(async ctx =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        await ctx.Response.WriteAsJsonAsync(new { error = "Bulunamadı" });
        return;
    }

    var index = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
    if (!File.Exists(index))
    {
        ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await ctx.Response.WriteAsync("Web arayüzü derlenmemiş: src/Web içinde `npm run build` çalıştırın.");
        return;
    }

    ctx.Response.ContentType = "text/html; charset=utf-8";
    await ctx.Response.SendFileAsync(index);
});

app.Run();
