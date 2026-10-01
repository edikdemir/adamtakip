namespace IsTakip.Domain;

// Tüm zaman alanları UTC'dir (DateTimeKind.Utc). Yerel saate dönüşüm yalnızca raporlama ve sunumda,
// site saat dilimiyle (system_settings.site_timezone) yapılır.

public sealed class Project
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Name { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Zone> Zones { get; set; } = [];
    public ICollection<Location> Locations { get; set; } = [];
}

public sealed class User
{
    public Guid Id { get; set; }
    /// <summary>Yerel hesap kullanıcı adı ya da Windows hesabı (DOMAIN\user); OIDC'de e-posta.</summary>
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? PhotoUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    /// <summary>Yerel hesap için PBKDF2 hash; Windows/OIDC hesaplarında null.</summary>
    public string? PasswordHash { get; set; }
    /// <summary>Windows SID ya da OIDC subject; dış kimliği eşlemek için.</summary>
    public string? ExternalId { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class JobType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ICollection<JobSubType> JobSubTypes { get; set; } = [];
}

public sealed class JobSubType
{
    public Guid Id { get; set; }
    public Guid JobTypeId { get; set; }
    public JobType? JobType { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ICollection<JobWorkItem> JobWorkItems { get; set; } = [];
}

/// <summary>"Yapılacak iş" kataloğu; görevler bu listeye FK ile bağlanmaz, serbest metin kalır.</summary>
public sealed class JobWorkItem
{
    public Guid Id { get; set; }
    public Guid JobSubTypeId { get; set; }
    public JobSubType? JobSubType { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public sealed class Zone
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>Mahal kataloğu; görevdeki mahal serbest metindir, eşleşme ada göre yapılır.</summary>
public sealed class Location
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>Görev. Süre kolonu YOKTUR; toplam süre time_entries'ten türetilir (ADR 0002).</summary>
public sealed class TaskItem
{
    public long Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid JobTypeId { get; set; }
    public JobType? JobType { get; set; }
    public Guid JobSubTypeId { get; set; }
    public JobSubType? JobSubType { get; set; }
    public Guid? ZoneId { get; set; }
    public Zone? Zone { get; set; }
    public string? Location { get; set; }
    public string DrawingNo { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Türkçe İ/ı duyarsız arama için normalize edilmiş metin (drawing_no + description + location).</summary>
    public string SearchText { get; set; } = string.Empty;
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }
    public Guid? AssignedTo { get; set; }
    public User? AssignedUser { get; set; }
    public Guid? AssignedBy { get; set; }
    public User? AssignedByUser { get; set; }
    public WorkerStatus WorkerStatus { get; set; } = WorkerStatus.Hazir;
    public AdminStatus AdminStatus { get; set; } = AdminStatus.Havuzda;
    public DateOnly? CompletionDate { get; set; }
    public string? AdminNotes { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public long? LinkedToTaskId { get; set; }
    public TaskItem? LinkedToTask { get; set; }
    public DateOnly? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public User? ApprovedByUser { get; set; }
    public DateOnly? OverdueNotifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<TaskItem> LinkedTasks { get; set; } = [];
    public ICollection<TaskNote> Notes { get; set; } = [];
    public ICollection<TimeEntry> TimeEntries { get; set; } = [];

    /// <summary>Sayaç tutulabilir mi: iptal/onaylı ve bağımlı görevlerde süre yazılamaz.</summary>
    public bool IsTimeable => AdminStatus is not (AdminStatus.Iptal or AdminStatus.Onaylandi) && LinkedToTaskId is null;
}

public sealed class TaskNote
{
    public long Id { get; set; }
    public long TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public sealed class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public long? TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class SystemSetting
{
    public string Key { get; set; } = string.Empty;
    /// <summary>JSON metni; API aynen döner.</summary>
    public string Value { get; set; } = "null";
    public Guid? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Masaüstü istemci kaydı. Canlılık (state/last_seen_at) yalnızca gösterim içindir, süreye girmez.</summary>
public sealed class Device
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AppVersion { get; set; }
    public DeviceState State { get; set; } = DeviceState.Stopped;
    public DateTime? LastSeenAt { get; set; }
    public Guid? OpenEntryId { get; set; }
    /// <summary>Cihaz token'ının SHA-256 hash'i; ham token yalnızca istemcide (DPAPI) durur.</summary>
    public string TokenHash { get; set; } = string.Empty;
    public DateTime TokenExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Ölçülmüş çalışma aralığı. ended_at = "buraya kadar sayıldı"; sunucu asla now() ile uzatmaz.</summary>
public sealed class TimeEntry
{
    public Guid Id { get; set; }
    public long TaskId { get; set; }
    public TaskItem? Task { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime EndedAt { get; set; }
    public int DurationSeconds { get; set; }
    public bool IsOpen { get; set; }
    public TimeEntrySource Source { get; set; }
    public string? Reason { get; set; }
    public Guid? DeviceId { get; set; }
    public Device? Device { get; set; }
    public int ClientVersion { get; set; }
    public DateTime? ClientCreatedAt { get; set; }
    public int? ClientClockOffsetMs { get; set; }
    public DateTime ServerReceivedAt { get; set; }
    public DateTime ServerUpdatedAt { get; set; }
    public TimeEntryStatus Status { get; set; } = TimeEntryStatus.Accepted;
    public TimeEntryFlags Flags { get; set; } = TimeEntryFlags.None;
    public Guid? ReplacesId { get; set; }
    public Guid? EditedBy { get; set; }
    public DateTime? EditedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? VoidReason { get; set; }

    /// <summary>Toplamlara giren kayıtlar: accepted ve flagged.</summary>
    public bool CountsTowardTotals => Status is TimeEntryStatus.Accepted or TimeEntryStatus.Flagged;
}

/// <summary>Arka plan işi çalışma kaydı (Sistem Durumu sayfası).</summary>
public sealed class JobRun
{
    public long Id { get; set; }
    public string JobName { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public bool Succeeded { get; set; }
    public string? Message { get; set; }
}
