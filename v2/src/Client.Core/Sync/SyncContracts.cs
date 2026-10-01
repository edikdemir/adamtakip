using IsTakip.Domain;
using IsTakip.Domain.Time;

namespace IsTakip.Client.Core.Sync;

// POST /api/time-entries/sync sözleşmesi (ADR 0002). JSON snake_case; sunucu ve istemci aynı tipleri kullanır.

public sealed record SyncRequest(
    Guid DeviceId,
    string AppVersion,
    DateTime ClientTimeUtc,
    DeviceState State,
    IReadOnlyList<SyncItem> Items,
    IReadOnlyList<SyncOp> Ops,
    /// <summary>Bu zamandan sonra değişen görevler istenir (snapshot güncellemesi).</summary>
    DateTime? TasksSince);

public sealed record SyncItem(
    Guid Id,
    long TaskId,
    DateTime StartedAt,
    DateTime EndedAt,
    bool IsOpen,
    TimeEntrySource Source,
    int ClientVersion,
    string? Reason,
    TimeEntryFlags Flags);

public sealed record SyncOp(long Seq, string Op, long TaskId)
{
    public const string TaskComplete = "task_complete";
}

public sealed record SyncResponse(
    DateTime ServerTimeUtc,
    TimeSettings Settings,
    string MinClientVersion,
    IReadOnlyList<TaskSnapshot> TaskUpdates,
    IReadOnlyList<SyncItemResult> Results,
    IReadOnlyList<SyncOpResult> OpResults);

public sealed record SyncItemResult(
    Guid Id,
    SyncOutcome Outcome,
    TimeEntryFlags Flags,
    string? Message,
    int ServerVersion);

public sealed record SyncOpResult(long Seq, bool Ok, string? Message);

/// <summary>İstemcinin yerelde tuttuğu görev özeti; çevrimdışı çalışırken Start listesi buradan gelir.</summary>
public sealed record TaskSnapshot(
    long Id,
    Guid ProjectId,
    string ProjectCode,
    string? ProjectName,
    string DrawingNo,
    string Description,
    AdminStatus AdminStatus,
    long? LinkedToTaskId,
    DateOnly? PlannedEnd,
    DateTime UpdatedAt)
{
    public bool IsTimeable => AdminStatus is not (AdminStatus.Iptal or AdminStatus.Onaylandi) && LinkedToTaskId is null;
}
