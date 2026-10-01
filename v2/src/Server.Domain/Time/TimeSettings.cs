namespace IsTakip.Domain.Time;

/// <summary>Zaman çekirdeği eşikleri. Sunucu ayarlarından gelir, istemciye sync yanıtıyla iletilir.</summary>
public sealed record TimeSettings
{
    /// <summary>Bir aralık bu süreyi aşarsa too_long bayrağı (istemci de bu tavanda kapatır).</summary>
    public double MaxEntryHours { get; init; } = 16;

    /// <summary>started_at sunucu saatinden bu kadar ileride ise clock_skew.</summary>
    public int ClockSkewToleranceMinutes { get; init; } = 5;

    /// <summary>ended_at'ten bu kadar gün sonra gelen kayıt late (bilgi amaçlı).</summary>
    public int LateAfterDays { get; init; } = 7;

    /// <summary>İstemci: girdi olmayınca boşta sayılan süre.</summary>
    public int IdleAfterMinutes { get; init; } = 10;

    /// <summary>İstemci: bu süre ve üzeri boşta kalma sessizce sayılmaz, sayaç durdurulur.</summary>
    public int IdleHardStopMinutes { get; init; } = 60;

    /// <summary>İstemci: "ara sayılsın mı?" sorusuna yanıt gelmezse varsayılan "Say".</summary>
    public int IdlePromptTimeoutMinutes { get; init; } = 2;

    /// <summary>İstemci: iki canlılık tick'i arasında bu kadar boşluk varsa çökme/uyku kabul edilir.</summary>
    public int AliveGapMinutes { get; init; } = 2;

    /// <summary>Sunucu: cihaz bu süredir rapor vermediyse "sessiz" (yalnız gösterim).</summary>
    public int DeviceSilentAfterMinutes { get; init; } = 10;

    /// <summary>Sunucu: açık kayıt bu süredir güncellenmediyse güvenlik kapatması (auto_closed).</summary>
    public int SafetyCloseAfterHours { get; init; } = 24;

    public static TimeSettings Default { get; } = new();
}
