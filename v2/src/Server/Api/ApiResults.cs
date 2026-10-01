using System.Security.Claims;

namespace IsTakip.Server.Api;

/// <summary>Web sözleşmesi: başarı {data}, hata {error}; kimliksiz 401 JSON.</summary>
public static class ApiResults
{
    public static IResult Data<T>(T data) => Results.Ok(new { data });
    public static IResult Created<T>(T data) => Results.Json(new { data }, statusCode: StatusCodes.Status201Created);
    public static IResult Success() => Results.Ok(new { success = true });
    public static IResult Error(string message, int status)
        => Results.Json(new { error = message }, statusCode: status);
    public static IResult BadRequest(string message = "Geçersiz veri") => Error(message, StatusCodes.Status400BadRequest);
    public static IResult Unauthorized(string message = "Yetkisiz") => Error(message, StatusCodes.Status401Unauthorized);
    public static IResult Forbidden(string message = "Yetkisiz erişim") => Error(message, StatusCodes.Status403Forbidden);
    public static IResult NotFound(string message = "Bulunamadı") => Error(message, StatusCodes.Status404NotFound);
    public static IResult Conflict(string message) => Error(message, StatusCodes.Status409Conflict);
}

public static class ClaimsPrincipalExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal principal)
        => principal.IsInRole("super_admin");
}
