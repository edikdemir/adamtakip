using IsTakip.Domain;
using IsTakip.Domain.Time;
using Xunit;

namespace IsTakip.Domain.Tests;

public class TimeEntryValidatorTests
{
    private static readonly DateTime Now = new(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid UserId = Guid.NewGuid();

    private static TimeEntryCandidate Candidate(
        DateTime? started = null, DateTime? ended = null, bool isOpen = false,
        TimeEntrySource source = TimeEntrySource.Desktop, int version = 1, Guid? id = null)
        => new(id ?? Guid.NewGuid(), 1, UserId,
            started ?? Now.AddHours(-2), ended ?? Now.AddHours(-1), isOpen, source, version);

    private static TimeEntryContext Context(
        bool userActive = true, bool taskExists = true, bool timeable = true, Guid? assignedTo = null,
        IReadOnlyList<(Guid, DateTime, DateTime)>? others = null, Guid? otherOpen = null, int? existingVersion = null)
        => new(userActive, taskExists, timeable, assignedTo ?? UserId, others ?? [], otherOpen, existingVersion, Now);

    [Fact]
    public void Clean_entry_is_accepted_without_flags()
    {
        var result = TimeEntryValidator.Validate(Candidate(), Context(), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Accepted, result.Outcome);
        Assert.Equal(TimeEntryFlags.None, result.Flags);
        Assert.False(result.IsNoOp);
    }

    [Fact]
    public void Same_or_lower_version_is_idempotent_noop()
    {
        var result = TimeEntryValidator.Validate(Candidate(version: 3), Context(existingVersion: 3), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Accepted, result.Outcome);
        Assert.True(result.IsNoOp);
    }

    [Fact]
    public void Higher_version_is_revalidated()
    {
        var result = TimeEntryValidator.Validate(Candidate(version: 4), Context(existingVersion: 3), TimeSettings.Default);

        Assert.False(result.IsNoOp);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public void Inactive_user_or_missing_task_is_rejected(bool userActive, bool taskExists)
    {
        var result = TimeEntryValidator.Validate(Candidate(), Context(userActive: userActive, taskExists: taskExists), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Rejected, result.Outcome);
    }

    [Fact]
    public void Interval_shorter_than_one_second_is_rejected()
    {
        var start = Now.AddHours(-1);
        var result = TimeEntryValidator.Validate(Candidate(start, start.AddMilliseconds(500)), Context(), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Rejected, result.Outcome);
    }

    [Fact]
    public void Non_utc_timestamps_are_rejected()
    {
        var local = new DateTime(2026, 10, 1, 9, 0, 0, DateTimeKind.Local);
        var result = TimeEntryValidator.Validate(Candidate(local, local.AddHours(1)), Context(), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Rejected, result.Outcome);
    }

    [Fact]
    public void Overlapping_entry_is_accepted_but_flagged()
    {
        var others = new List<(Guid, DateTime, DateTime)> { (Guid.NewGuid(), Now.AddHours(-3), Now.AddHours(-1.5)) };
        var result = TimeEntryValidator.Validate(Candidate(), Context(others: others), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Flagged, result.Outcome);
        Assert.True(result.Flags.HasFlag(TimeEntryFlags.Overlap));
    }

    [Fact]
    public void Manual_entries_are_exempt_from_overlap()
    {
        var others = new List<(Guid, DateTime, DateTime)> { (Guid.NewGuid(), Now.AddHours(-3), Now.AddHours(-1.5)) };
        var result = TimeEntryValidator.Validate(Candidate(source: TimeEntrySource.Manual), Context(others: others), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Accepted, result.Outcome);
    }

    [Fact]
    public void Entry_longer_than_max_hours_is_flagged_not_rejected()
    {
        var result = TimeEntryValidator.Validate(Candidate(Now.AddHours(-20), Now.AddHours(-1)), Context(), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Flagged, result.Outcome);
        Assert.True(result.Flags.HasFlag(TimeEntryFlags.TooLong));
    }

    [Fact]
    public void Start_in_the_future_beyond_tolerance_is_clock_skew()
    {
        var result = TimeEntryValidator.Validate(Candidate(Now.AddMinutes(10), Now.AddMinutes(40)), Context(), TimeSettings.Default);

        Assert.True(result.Flags.HasFlag(TimeEntryFlags.ClockSkew));
    }

    [Fact]
    public void Open_entry_for_reassigned_task_is_closed_and_flagged()
    {
        var result = TimeEntryValidator.Validate(Candidate(isOpen: true), Context(assignedTo: Guid.NewGuid()), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Closed, result.Outcome);
        Assert.True(result.ForceClosed);
        Assert.True(result.Flags.HasFlag(TimeEntryFlags.NotAssignee));
    }

    [Fact]
    public void Closed_entry_for_reassigned_task_is_only_flagged()
    {
        var result = TimeEntryValidator.Validate(Candidate(isOpen: false), Context(assignedTo: Guid.NewGuid()), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Flagged, result.Outcome);
        Assert.False(result.ForceClosed);
    }

    [Fact]
    public void Open_entry_on_closed_task_is_closed_with_task_closed_flag()
    {
        var result = TimeEntryValidator.Validate(Candidate(isOpen: true), Context(timeable: false), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Closed, result.Outcome);
        Assert.True(result.Flags.HasFlag(TimeEntryFlags.TaskClosed));
    }

    [Fact]
    public void Second_open_entry_for_same_user_is_closed()
    {
        var result = TimeEntryValidator.Validate(Candidate(isOpen: true), Context(otherOpen: Guid.NewGuid()), TimeSettings.Default);

        Assert.Equal(SyncOutcome.Closed, result.Outcome);
        Assert.True(result.Flags.HasFlag(TimeEntryFlags.Overlap));
    }

    [Fact]
    public void Entry_arriving_after_late_threshold_is_flagged_late()
    {
        var result = TimeEntryValidator.Validate(Candidate(Now.AddDays(-10), Now.AddDays(-10).AddHours(2)), Context(), TimeSettings.Default);

        Assert.True(result.Flags.HasFlag(TimeEntryFlags.Late));
    }

    [Fact]
    public void Duration_is_rounded_and_at_least_one_second()
    {
        Assert.Equal(1, TimeEntryValidator.DurationSeconds(Now, Now.AddMilliseconds(400)));
        Assert.Equal(3600, TimeEntryValidator.DurationSeconds(Now, Now.AddHours(1)));
    }

    [Fact]
    public void Flag_csv_round_trips()
    {
        var flags = TimeEntryFlags.Overlap | TimeEntryFlags.TooLong | TimeEntryFlags.IdleKept;
        var csv = EnumNames.FlagsToCsv(flags);

        Assert.Equal("overlap,too_long,idle_kept", csv);
        Assert.Equal(flags, EnumNames.FlagsFromCsv(csv));
        Assert.Equal(TimeEntryFlags.None, EnumNames.FlagsFromCsv(""));
    }

    [Fact]
    public void Enum_snake_case_round_trips()
    {
        Assert.Equal("devam_ediyor", EnumNames.ToSnake(AdminStatus.DevamEdiyor));
        Assert.Equal("super_admin", EnumNames.ToSnake(UserRole.SuperAdmin));
        Assert.Equal(AdminStatus.Onaylandi, EnumNames.FromSnake<AdminStatus>("onaylandi"));
        Assert.False(EnumNames.TryFromSnake<AdminStatus>("bilinmeyen", out _));
    }
}
