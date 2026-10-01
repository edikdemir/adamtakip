using System.Security.Claims;
using IsTakip.Data;
using IsTakip.Domain;
using IsTakip.Server.Auth;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace IsTakip.Server.Api;

public sealed record LoginRequest(string Username, string Password);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuth(this RouteGroupBuilder api, AuthOptions auth)
    {
        var group = api.MapGroup("/auth");

        group.MapGet("/modes", (IOptions<AuthOptions> opt) =>
            ApiResults.Data(new { modes = opt.Value.Modes.Select(m => m.ToLowerInvariant()).ToArray() }))
            .AllowAnonymous();

        if (auth.Has("local"))
        {
            group.MapPost("/login", LocalLoginAsync).AllowAnonymous();
        }

        if (auth.Has("windows"))
        {
            group.MapGet("/windows", WindowsLoginAsync)
                .RequireAuthorization(new AuthorizeAttribute { AuthenticationSchemes = NegotiateDefaults.AuthenticationScheme });
        }

        group.MapPost("/logout", async (HttpContext ctx) =>
        {
            await SessionService.SignOutAsync(ctx);
            return ApiResults.Success();
        }).AllowAnonymous();

        group.MapGet("/me", MeAsync).RequireAuthorization();
        group.MapPost("/heartbeat", HeartbeatAsync).RequireAuthorization();

        return api;
    }

    private static async Task<IResult> LocalLoginAsync(
        LoginRequest body, HttpContext ctx, AppDbContext db, IPasswordHasher<User> hasher, IOptions<AuthOptions> opt)
    {
        var username = body.Username?.Trim();
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(body.Password))
            return ApiResults.BadRequest();

        var now = DateTime.UtcNow;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);

        // Kullanıcı yoksa da aynı hata: hesap adı sızdırılmaz.
        if (user is null || user.PasswordHash is null)
            return ApiResults.Error("invalid_credentials", StatusCodes.Status401Unauthorized);

        if (user.LockedUntil is DateTime lockedUntil && lockedUntil > now)
            return ApiResults.Error("locked_out", StatusCodes.Status429TooManyRequests);

        if (!user.IsActive)
            return ApiResults.Error("account_disabled", StatusCodes.Status403Forbidden);

        var verification = hasher.VerifyHashedPassword(user, user.PasswordHash, body.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= opt.Value.MaxFailedLogins)
            {
                user.FailedLoginCount = 0;
                user.LockedUntil = now.AddMinutes(opt.Value.LockoutMinutes);
            }
            await db.SaveChangesAsync();
            return ApiResults.Error("invalid_credentials", StatusCodes.Status401Unauthorized);
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = hasher.HashPassword(user, body.Password);

        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        user.LastSeenAt = now;
        await db.SaveChangesAsync();

        await SessionService.SignInAsync(ctx, user);
        return ApiResults.Data(SessionService.ToSessionUser(user));
    }

    /// <summary>Windows/AD girişi: Negotiate ile doğrulanmış kimlik → kullanıcı eşle (yoksa 'user' rolüyle oluştur) → cookie.</summary>
    private static async Task<IResult> WindowsLoginAsync(HttpContext ctx, AppDbContext db)
    {
        var identity = ctx.User.Identity;
        if (identity?.IsAuthenticated != true || string.IsNullOrEmpty(identity.Name))
            return ApiResults.Unauthorized();

        var sid = ctx.User.FindFirstValue(ClaimTypes.PrimarySid);
        var accountName = identity.Name; // DOMAIN\user
        var now = DateTime.UtcNow;

        var user = await db.Users.FirstOrDefaultAsync(u =>
            (sid != null && u.ExternalId == sid) || u.Username == accountName);

        if (user is null)
        {
            var shortName = accountName.Contains('\\') ? accountName[(accountName.IndexOf('\\') + 1)..] : accountName;
            user = new User
            {
                Id = Guid.CreateVersion7(),
                Username = accountName,
                Email = string.Empty,
                DisplayName = shortName,
                Role = UserRole.User,
                IsActive = true,
                ExternalId = sid,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Users.Add(user);
        }
        else if (!user.IsActive)
        {
            return Results.Redirect("/login?error=account_disabled");
        }

        user.LastSeenAt = now;
        await db.SaveChangesAsync();
        await SessionService.SignInAsync(ctx, user);
        return Results.Redirect("/");
    }

    private static async Task<IResult> MeAsync(HttpContext ctx, AppDbContext db)
    {
        var userId = ctx.User.GetUserId();
        if (userId is null) return ApiResults.Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null || !user.IsActive)
        {
            await SessionService.SignOutAsync(ctx);
            return ApiResults.Unauthorized();
        }

        user.LastSeenAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ApiResults.Data(SessionService.ToSessionUser(user));
    }

    private static async Task<IResult> HeartbeatAsync(HttpContext ctx, AppDbContext db)
    {
        var userId = ctx.User.GetUserId();
        if (userId is null) return ApiResults.Unauthorized();

        var now = DateTime.UtcNow;
        var updated = await db.Users
            .Where(u => u.Id == userId && u.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAt, now));

        if (updated == 0)
        {
            await SessionService.SignOutAsync(ctx);
            return ApiResults.Unauthorized();
        }

        return ApiResults.Data(new { last_seen_at = now });
    }
}
