namespace IsTakip.Domain.Time;

/// <summary>Doğrulanacak aday aralık (istemciden, manuel girişten ya da yönetici düzenlemesinden).</summary>
public sealed record TimeEntryCandidate(
    Guid Id,
    long TaskId,
    Guid UserId,
    DateTime StartedAt,
    DateTime EndedAt,
    bool IsOpen,
    TimeEntrySource Source,
    int ClientVersion);

/// <summary>Doğrulama için gereken bağlam; veri erişimi dışarıda yapılır, bu sınıf saf kalır.</summary>
public sealed record TimeEntryContext(
    bool UserIsActive,
    bool TaskExists,
    bool TaskIsTimeable,
    Guid? TaskAssignedTo,
    /// <summary>Aynı kullanıcının, aday dışındaki, sayıma giren ve manuel olmayan aralıkları.</summary>
    IReadOnlyList<(Guid Id, DateTime StartedAt, DateTime EndedAt)> OtherEntries,
    /// <summary>Kullanıcının başka bir açık (is_open) kaydı varsa onun id'si.</summary>
    Guid? OtherOpenEntryId,
    /// <summary>Aynı id ile sunucuda kayıtlı versiyon; yoksa null.</summary>
    int? ExistingVersion,
    DateTime NowUtc);

public sealed record TimeEntryValidation(
    SyncOutcome Outcome,
    TimeEntryFlags Flags,
    string? Message,
    /// <summary>Closed sonucunda kayıt bu anda kapatılır (bildirilen ended_at, asla now).</summary>
    bool ForceClosed)
{
    public bool IsRejected => Outcome == SyncOutcome.Rejected;
    public bool IsNoOp { get; init; }
}

/// <summary>
/// Tek doğrulama servisi: sync, web (manuel) ve yönetici yazımları aynı kurallardan geçer.
/// İlke: bildirilen süre asla kısaltılmaz/silinmez; şüpheli olan bayraklanır (ADR 0002).
/// </summary>
public static class TimeEntryValidator
{
    public static TimeEntryValidation Validate(TimeEntryCandidate c, TimeEntryContext ctx, TimeSettings settings)
    {
        // Idempotent tekrar: aynı id ve aynı/küçük versiyon → kabul, no-op.
        if (ctx.ExistingVersion is int existing && c.ClientVersion <= existing)
        {
            return new TimeEntryValidation(SyncOutcome.Accepted, TimeEntryFlags.None, null, false) { IsNoOp = true };
        }

        // Reddetme sebepleri (kayıt hiç yazılmaz; istemci "gönderilemeyen kayıtlar"da tutar).
        if (!ctx.UserIsActive)
            return Reject("Kullanıcı pasif");
        if (!ctx.TaskExists)
            return Reject("Görev bulunamadı");
        if (c.StartedAt.Kind != DateTimeKind.Utc || c.EndedAt.Kind != DateTimeKind.Utc)
            return Reject("Zamanlar UTC olmalı");
        if (c.EndedAt < c.StartedAt.AddSeconds(1))
            return Reject("Bitiş, başlangıçtan en az 1 sn sonra olmalı");

        var flags = TimeEntryFlags.None;
        var messages = new List<string>();
        var forceClosed = false;

        if (c.StartedAt > ctx.NowUtc.AddMinutes(settings.ClockSkewToleranceMinutes))
        {
            flags |= TimeEntryFlags.ClockSkew;
            messages.Add("Cihaz saati sunucudan ileride");
        }

        if ((c.EndedAt - c.StartedAt).TotalHours > settings.MaxEntryHours)
        {
            flags |= TimeEntryFlags.TooLong;
            messages.Add($"Kayıt {settings.MaxEntryHours} saati aşıyor");
        }

        // Manuel girişler çakışma kontrolünden muaftır.
        if (c.Source != TimeEntrySource.Manual)
        {
            foreach (var other in ctx.OtherEntries)
            {
                if (other.Id == c.Id) continue;
                if (c.StartedAt < other.EndedAt && c.EndedAt > other.StartedAt)
                {
                    flags |= TimeEntryFlags.Overlap;
                    messages.Add("Başka bir kayıtla çakışıyor");
                    break;
                }
            }
        }

        if (ctx.TaskAssignedTo != c.UserId)
        {
            flags |= TimeEntryFlags.NotAssignee;
            messages.Add("Görev artık size atanmadı, süre incelemeye alındı");
            if (c.IsOpen) forceClosed = true;
        }

        if (!ctx.TaskIsTimeable)
        {
            flags |= TimeEntryFlags.TaskClosed;
            messages.Add("Görev kapatılmış (iptal/onaylı/bağımlı), süre incelemeye alındı");
            if (c.IsOpen) forceClosed = true;
        }

        if (c.IsOpen && ctx.OtherOpenEntryId is Guid otherOpen && otherOpen != c.Id)
        {
            // Kullanıcı başına tek açık kayıt: ilk açılan kazanır, ikincisi bildirilen sonunda kapalı saklanır.
            flags |= TimeEntryFlags.Overlap;
            messages.Add("Sayaç başka bir cihazda çalışıyor");
            forceClosed = true;
        }

        if (!c.IsOpen && (ctx.NowUtc - c.EndedAt).TotalDays > settings.LateAfterDays)
        {
            flags |= TimeEntryFlags.Late;
        }

        var outcome = forceClosed
            ? SyncOutcome.Closed
            : flags == TimeEntryFlags.None ? SyncOutcome.Accepted : SyncOutcome.Flagged;

        return new TimeEntryValidation(outcome, flags, messages.Count == 0 ? null : string.Join("; ", messages), forceClosed);

        static TimeEntryValidation Reject(string message)
            => new(SyncOutcome.Rejected, TimeEntryFlags.None, message, false);
    }

    /// <summary>Bayrak varsa status=flagged, yoksa accepted.</summary>
    public static TimeEntryStatus StatusFor(TimeEntryFlags flags)
        => flags == TimeEntryFlags.None ? TimeEntryStatus.Accepted : TimeEntryStatus.Flagged;

    public static int DurationSeconds(DateTime startedAt, DateTime endedAt)
        => (int)Math.Max(1, Math.Round((endedAt - startedAt).TotalSeconds));
}
