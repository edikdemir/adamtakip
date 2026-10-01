using IsTakip.Data;
using IsTakip.Domain;
using IsTakip.Server.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace IsTakip.Server.Startup;

/// <summary>
/// Açılışta şema ve ilk veriler. Migration varsa Migrate (üretim yolu; P4'te önce yedek alınır),
/// yoksa EnsureCreated (geliştirme). Hiç kullanıcı yoksa bootstrap yöneticisi oluşturulur.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseInitializer");
        var auth = scope.ServiceProvider.GetRequiredService<IOptions<AuthOptions>>().Value;
        var site = scope.ServiceProvider.GetRequiredService<IOptions<SiteOptions>>().Value;
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        if (db.Database.GetMigrations().Any())
        {
            await db.Database.MigrateAsync(ct);
        }
        else
        {
            logger.LogWarning("Migration bulunamadı; şema EnsureCreated ile oluşturuluyor (yalnızca geliştirme)");
            await db.Database.EnsureCreatedAsync(ct);
        }

        var now = DateTime.UtcNow;

        if (!await db.Users.AnyAsync(ct))
        {
            var password = string.IsNullOrEmpty(auth.BootstrapAdminPassword)
                ? Guid.NewGuid().ToString("N")[..12]
                : auth.BootstrapAdminPassword;

            var admin = new User
            {
                Id = Guid.CreateVersion7(),
                Username = auth.BootstrapAdminUsername,
                Email = string.Empty,
                DisplayName = "Yönetici",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            admin.PasswordHash = hasher.HashPassword(admin, password);
            db.Users.Add(admin);

            if (string.IsNullOrEmpty(auth.BootstrapAdminPassword))
                logger.LogWarning("İlk yönetici oluşturuldu: kullanıcı '{User}', geçici şifre '{Password}' — ilk girişte değiştirin", admin.Username, password);
            else
                logger.LogInformation("İlk yönetici oluşturuldu: kullanıcı '{User}'", admin.Username);
        }

        await EnsureSettingAsync(db, "app_name", System.Text.Json.JsonSerializer.Serialize(site.AppName), now, ct);
        await EnsureSettingAsync(db, "site_timezone", System.Text.Json.JsonSerializer.Serialize(site.TimeZone), now, ct);
        await EnsureSettingAsync(db, "working_hours", """{"start":"08:00","end":"17:00"}""", now, ct);
        await EnsureSettingAsync(db, "email_notifications",
            """{"enabled":true,"send_on_assign":true,"send_on_approve":true,"send_on_reject":true,"send_on_complete":true,"send_on_note":true,"send_on_cancel":true,"deadline_warning_days":2,"overdue_notify_user":true,"overdue_notify_admin":true}""",
            now, ct);
        await EnsureSettingAsync(db, "time_settings", System.Text.Json.JsonSerializer.Serialize(Domain.Time.TimeSettings.Default), now, ct);

        await db.SaveChangesAsync(ct);
    }

    private static async Task EnsureSettingAsync(AppDbContext db, string key, string json, DateTime now, CancellationToken ct)
    {
        if (await db.SystemSettings.AnyAsync(s => s.Key == key, ct)) return;
        db.SystemSettings.Add(new SystemSetting { Key = key, Value = json, UpdatedAt = now });
    }
}
