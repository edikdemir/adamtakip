using IsTakip.Client.Core.Idle;
using IsTakip.Client.Core.Sync;
using IsTakip.Domain.Time;
using Xunit;

namespace IsTakip.Client.Core.Tests;

public class IdleRulesTests
{
    private static readonly TimeSettings S = TimeSettings.Default; // idle 10 dk, hard stop 60 dk, gap 2 dk, cap 16 sa
    private static readonly DateTime Now = new(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(0, IdleAction.Continue)]
    [InlineData(9, IdleAction.Continue)]
    [InlineData(10, IdleAction.Prompt)]
    [InlineData(45, IdleAction.Prompt)]
    [InlineData(60, IdleAction.StopAtIdleStart)]
    [InlineData(600, IdleAction.StopAtIdleStart)]
    public void Return_after_idle_follows_thresholds(int idleMinutes, IdleAction expected)
    {
        Assert.Equal(expected, IdleRules.DecideOnReturn(TimeSpan.FromMinutes(idleMinutes), S));
    }

    [Fact]
    public void Prompt_timeout_defaults_to_keeping_the_break()
    {
        Assert.True(IdleRules.ShouldKeepIdleTime(IdlePromptAnswer.Keep));
        Assert.True(IdleRules.ShouldKeepIdleTime(IdlePromptAnswer.Timeout));
        Assert.False(IdleRules.ShouldKeepIdleTime(IdlePromptAnswer.Discard));
    }

    [Fact]
    public void Alive_gap_detects_crash_or_sleep()
    {
        Assert.False(IdleRules.IsAliveGap(Now.AddSeconds(-90), Now, S));
        Assert.True(IdleRules.IsAliveGap(Now.AddMinutes(-3), Now, S));
    }

    [Fact]
    public void Clock_jump_requires_wall_clock_to_outrun_monotonic_clock()
    {
        Assert.False(IdleRules.IsClockJump(TimeSpan.FromSeconds(31), TimeSpan.FromSeconds(30), S));
        Assert.True(IdleRules.IsClockJump(TimeSpan.FromMinutes(10), TimeSpan.FromSeconds(30), S));
    }

    [Fact]
    public void Hard_cap_at_max_entry_hours()
    {
        Assert.False(IdleRules.ReachedHardCap(Now.AddHours(-15.9), Now, S));
        Assert.True(IdleRules.ReachedHardCap(Now.AddHours(-16), Now, S));
    }

    [Fact]
    public void Quick_restart_adopts_running_entry_only_within_gap()
    {
        Assert.True(IdleRules.CanAdoptRunningEntry(Now.AddMinutes(-1), Now, S));
        Assert.False(IdleRules.CanAdoptRunningEntry(Now.AddMinutes(-5), Now, S));
    }

    [Fact]
    public void Earliest_idle_start_never_invents_now()
    {
        Assert.Null(IdleRules.EarliestIdleStart(null, null));
        Assert.Equal(Now.AddMinutes(-30), IdleRules.EarliestIdleStart(Now.AddMinutes(-12), null, Now.AddMinutes(-30)));
    }

    [Fact]
    public void Backoff_escalates_and_resets()
    {
        var backoff = new Backoff();
        Assert.Equal(TimeSpan.Zero, backoff.NextDelay());

        backoff.RecordFailure();
        var first = backoff.NextDelay(new Random(1));
        Assert.InRange(first.TotalSeconds, 4, 6);

        backoff.RecordFailure(); backoff.RecordFailure(); backoff.RecordFailure(); backoff.RecordFailure();
        var capped = backoff.NextDelay(new Random(1));
        Assert.InRange(capped.TotalMinutes, 4, 6);

        backoff.RecordSuccess();
        Assert.Equal(TimeSpan.Zero, backoff.NextDelay());
    }
}
