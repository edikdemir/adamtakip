namespace IsTakip.Server.Auth;

public sealed class AuthOptions
{
    public const string Section = "Auth";

    /// <summary>Etkin giriş yöntemleri: local, windows, oidc.</summary>
    public string[] Modes { get; set; } = ["local"];
    public string CookieName { get; set; } = "istakip-session";
    public int SessionHours { get; set; } = 12;
    public int MaxFailedLogins { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    /// <summary>Hiç kullanıcı yokken oluşturulan ilk yönetici (P4'teki kurulum sihirbazı bunun yerini alır).</summary>
    public string BootstrapAdminUsername { get; set; } = "admin";
    public string BootstrapAdminPassword { get; set; } = string.Empty;

    public bool Has(string mode) => Modes.Contains(mode, StringComparer.OrdinalIgnoreCase);
}

public sealed class SiteOptions
{
    public const string Section = "Site";

    public string AppName { get; set; } = "İş Takip";
    public string TimeZone { get; set; } = "Europe/Istanbul";
    /// <summary>Dış adresler (çift adres); Origin/CSRF kontrolünde ve istemciye bildirilen adres listesinde kullanılır.</summary>
    public string[] PublicUrls { get; set; } = [];
}
