namespace IsTakip.Domain;

// Enum'lar veritabanında ve API'de snake_case metin olarak taşınır (bkz. EnumNames),
// böylece web arayüzünün beklediği "devam_ediyor", "super_admin" gibi değerler korunur.

public enum UserRole
{
    User,
    SuperAdmin,
}

public enum AdminStatus
{
    Havuzda,
    Atandi,
    DevamEdiyor,
    Tamamlandi, // UI etiketi: "Onay Bekliyor"
    Onaylandi,  // UI etiketi: "Hazır"
    Iptal,
}

public enum WorkerStatus
{
    Hazir,
    Beklemede,
    Bitti,
}

public enum Priority
{
    Low,
    Medium,
    High,
    Urgent,
}

public enum NotificationType
{
    TaskAssigned,
    TaskApproved,
    TaskRejected,
    DeadlineWarning,
    TimerReminder,
    TaskCompleted,
    TaskNote,
}

public enum TimeEntrySource
{
    Desktop,
    Web,    // rezerve; v1'de web aralık yazmaz
    Manual,
    Admin,
    Import,
}

public enum TimeEntryStatus
{
    Accepted,
    Flagged,
    Superseded,
    Voided,
}

[Flags]
public enum TimeEntryFlags
{
    None = 0,
    Overlap = 1 << 0,
    TooLong = 1 << 1,
    AutoClosed = 1 << 2,
    NotAssignee = 1 << 3,
    TaskClosed = 1 << 4,
    Edited = 1 << 5,
    ClockJump = 1 << 6,
    Late = 1 << 7,
    IdleKept = 1 << 8,
    ClockSkew = 1 << 9,
}

public enum DeviceState
{
    Running,
    Idle,
    Stopped,
    Silent,
}

public enum SyncOutcome
{
    Accepted,
    Flagged,
    Rejected,
    Closed,
}

/// <summary>PascalCase enum adı ↔ snake_case metin dönüşümü (DB ve API için).</summary>
public static class EnumNames
{
    public static string ToSnake<TEnum>(TEnum value) where TEnum : struct, Enum
        => ToSnake(value.ToString());

    public static string ToSnake(string pascal)
    {
        var sb = new System.Text.StringBuilder(pascal.Length + 4);
        for (var i = 0; i < pascal.Length; i++)
        {
            var c = pascal[i];
            if (char.IsUpper(c))
            {
                if (i > 0) sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            else
            {
                sb.Append(c);
            }
        }
        return sb.ToString();
    }

    public static TEnum FromSnake<TEnum>(string snake) where TEnum : struct, Enum
    {
        foreach (var value in Enum.GetValues<TEnum>())
        {
            if (string.Equals(ToSnake(value), snake, StringComparison.Ordinal))
                return value;
        }
        throw new ArgumentException($"'{snake}' is not a valid {typeof(TEnum).Name}", nameof(snake));
    }

    public static bool TryFromSnake<TEnum>(string? snake, out TEnum value) where TEnum : struct, Enum
    {
        if (snake is not null)
        {
            foreach (var candidate in Enum.GetValues<TEnum>())
            {
                if (string.Equals(ToSnake(candidate), snake, StringComparison.Ordinal))
                {
                    value = candidate;
                    return true;
                }
            }
        }
        value = default;
        return false;
    }

    /// <summary>[Flags] enum → "overlap,too_long" (None → boş metin).</summary>
    public static string FlagsToCsv(TimeEntryFlags flags)
    {
        if (flags == TimeEntryFlags.None) return string.Empty;
        var parts = new List<string>();
        foreach (var flag in Enum.GetValues<TimeEntryFlags>())
        {
            if (flag != TimeEntryFlags.None && flags.HasFlag(flag))
                parts.Add(ToSnake(flag));
        }
        return string.Join(',', parts);
    }

    public static TimeEntryFlags FlagsFromCsv(string? csv)
    {
        var result = TimeEntryFlags.None;
        if (string.IsNullOrWhiteSpace(csv)) return result;
        foreach (var part in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (TryFromSnake<TimeEntryFlags>(part, out var flag))
                result |= flag;
        }
        return result;
    }
}
