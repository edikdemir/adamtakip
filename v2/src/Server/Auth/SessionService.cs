using System.Security.Claims;
using IsTakip.Domain;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace IsTakip.Server.Auth;

/// <summary>Cookie oturumu: eski jose JWT'nin yerine ASP.NET Core cookie auth. Rol claim'i snake_case ("super_admin").</summary>
public static class SessionService
{
    public static ClaimsPrincipal BuildPrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, EnumNames.ToSnake(user.Role)),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }

    public static Task SignInAsync(HttpContext ctx, User user)
        => ctx.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            BuildPrincipal(user),
            new AuthenticationProperties { IsPersistent = false, IssuedUtc = DateTimeOffset.UtcNow });

    public static Task SignOutAsync(HttpContext ctx)
        => ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    public static object ToSessionUser(User user) => new
    {
        id = user.Id,
        email = user.Email,
        display_name = user.DisplayName,
        job_title = user.JobTitle,
        role = EnumNames.ToSnake(user.Role),
        photo_url = user.PhotoUrl,
    };
}
