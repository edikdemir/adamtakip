using IsTakip.Domain.Time;

namespace IsTakip.Client.Core.Idle;

public enum IdleAction
{
    /// <summary>Boşta süresi eşiğin altında: hiçbir şey yapma, sayaç devam.</summary>
    Continue,
    /// <summary>"L dk ara sayılsın mı?" sor; yanıt yoksa Say.</summary>
    Prompt,
    /// <summary>Boşta başlangıcında kapat ve sayacı durdur; kullanıcıya [Devam et] göster.</summary>
    StopAtIdleStart,
}

public enum IdlePromptAnswer
{
    Keep,
    Discard,
    Timeout,
}

/// <summary>
/// Saf karar kuralları (ADR 0002, "İstemci kuralları"). WPF kabuğu olayları toplar, kararı buradan alır.
/// İlke: 1 saat ve üzeri hiçbir süre sessizce sayılmaz; kısa aralar mühendisin kararı (varsayılan say).
/// </summary>
public static class IdleRules
{
    /// <summary>Dönüşte (girdi/kilit açma/uyanma/açılış) boşta süresine göre karar.</summary>
    public static IdleAction DecideOnReturn(TimeSpan idleLength, TimeSettings s)
    {
        if (idleLength >= TimeSpan.FromMinutes(s.IdleHardStopMinutes)) return IdleAction.StopAtIdleStart;
        if (idleLength >= TimeSpan.FromMinutes(s.IdleAfterMinutes)) return IdleAction.Prompt;
        return IdleAction.Continue;
    }

    /// <summary>Soru yanıtı: Say/zaman aşımı → aynı kayıt devam (idle_kept); Sayma → boşta başında kapat, dönüşten yeni kayıt.</summary>
    public static bool ShouldKeepIdleTime(IdlePromptAnswer answer)
        => answer is IdlePromptAnswer.Keep or IdlePromptAnswer.Timeout;

    /// <summary>İki canlılık tick'i arasındaki boşluk çökme/uyku anlamına geliyor mu.</summary>
    public static bool IsAliveGap(DateTime lastAliveUtc, DateTime nowUtc, TimeSettings s)
        => nowUtc - lastAliveUtc > TimeSpan.FromMinutes(s.AliveGapMinutes);

    /// <summary>Duvar saati, monotonik saatten belirgin biçimde fazla ilerlediyse saat sıçraması (clock_jump).</summary>
    public static bool IsClockJump(TimeSpan wallClockDelta, TimeSpan monotonicDelta, TimeSettings s)
        => wallClockDelta - monotonicDelta > TimeSpan.FromMinutes(s.AliveGapMinutes);

    /// <summary>Açık kayıt sert tavana ulaştı mı (auto_closed).</summary>
    public static bool ReachedHardCap(DateTime startedUtc, DateTime nowUtc, TimeSettings s)
        => nowUtc - startedUtc >= TimeSpan.FromHours(s.MaxEntryHours);

    /// <summary>Hızlı yeniden başlatma: son tick yakınsa çalışan kayıt sessizce devralınır.</summary>
    public static bool CanAdoptRunningEntry(DateTime lastAliveUtc, DateTime nowUtc, TimeSettings s)
        => !IsAliveGap(lastAliveUtc, nowUtc, s);

    /// <summary>Boşta başlangıcı adaylarının en erkeni; hiçbiri yoksa null. Asla "şimdi" döndürmez.</summary>
    public static DateTime? EarliestIdleStart(params DateTime?[] candidates)
    {
        DateTime? earliest = null;
        foreach (var c in candidates)
        {
            if (c is DateTime value && (earliest is null || value < earliest.Value)) earliest = value;
        }
        return earliest;
    }
}
