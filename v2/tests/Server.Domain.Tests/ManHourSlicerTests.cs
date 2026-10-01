using IsTakip.Domain.Time;
using Xunit;

namespace IsTakip.Domain.Tests;

public class ManHourSlicerTests
{
    // Testler sabit +03:00 (DST yok) ile çalışır; sistemde IANA/Windows id bulunmasına bağımlı olmasın.
    private static readonly TimeZoneInfo Istanbul =
        TimeZoneInfo.CreateCustomTimeZone("test-ist", TimeSpan.FromHours(3), "Istanbul (test)", "Istanbul (test)");

    private static DateTime Utc(int y, int mo, int d, int h, int mi = 0) => new(y, mo, d, h, mi, 0, DateTimeKind.Utc);

    [Fact]
    public void Interval_within_a_single_local_day_is_one_slice()
    {
        // 09:00–11:00 yerel = 06:00–08:00 UTC
        var slices = ManHourSlicer.SliceByLocalDay(Utc(2026, 10, 1, 6), Utc(2026, 10, 1, 8), Istanbul);

        var slice = Assert.Single(slices);
        Assert.Equal(new DateOnly(2026, 10, 1), slice.Date);
        Assert.Equal(7200, slice.Seconds);
    }

    [Fact]
    public void Interval_crossing_local_midnight_is_split_at_midnight()
    {
        // 23:00 (1 Ekim yerel) – 01:30 (2 Ekim yerel) = 20:00–22:30 UTC
        var slices = ManHourSlicer.SliceByLocalDay(Utc(2026, 10, 1, 20), Utc(2026, 10, 1, 22, 30), Istanbul);

        Assert.Equal(2, slices.Count);
        Assert.Equal((new DateOnly(2026, 10, 1), 3600), slices[0]);
        Assert.Equal((new DateOnly(2026, 10, 2), 5400), slices[1]);
    }

    [Fact]
    public void Utc_midnight_is_not_a_boundary_in_local_time()
    {
        // 02:00–04:00 yerel (2 Ekim) = 23:00 (1 Ekim) – 01:00 (2 Ekim) UTC → tek yerel gün
        var slices = ManHourSlicer.SliceByLocalDay(Utc(2026, 10, 1, 23), Utc(2026, 10, 2, 1), Istanbul);

        var slice = Assert.Single(slices);
        Assert.Equal(new DateOnly(2026, 10, 2), slice.Date);
        Assert.Equal(7200, slice.Seconds);
    }

    [Fact]
    public void Multi_day_interval_produces_one_slice_per_day()
    {
        // 3 tam yerel gün: 1 Ekim 00:00 – 4 Ekim 00:00 yerel = 30 Eyl 21:00 – 3 Ekim 21:00 UTC
        var slices = ManHourSlicer.SliceByLocalDay(Utc(2026, 9, 30, 21), Utc(2026, 10, 3, 21), Istanbul);

        Assert.Equal(3, slices.Count);
        Assert.All(slices, s => Assert.Equal(86400, s.Seconds));
        Assert.Equal(new DateOnly(2026, 10, 1), slices[0].Date);
        Assert.Equal(new DateOnly(2026, 10, 3), slices[2].Date);
    }

    [Fact]
    public void Empty_or_reversed_interval_yields_nothing()
    {
        Assert.Empty(ManHourSlicer.SliceByLocalDay(Utc(2026, 10, 1, 8), Utc(2026, 10, 1, 8), Istanbul));
        Assert.Empty(ManHourSlicer.SliceByLocalDay(Utc(2026, 10, 1, 9), Utc(2026, 10, 1, 8), Istanbul));
    }

    [Fact]
    public void Sum_by_day_and_month_aggregates_across_intervals()
    {
        var intervals = new List<(DateTime, DateTime)>
        {
            (Utc(2026, 9, 30, 20), Utc(2026, 9, 30, 22)), // 23:00–01:00 yerel: 1 sa Eylül 30, 1 sa Ekim 1
            (Utc(2026, 10, 1, 6), Utc(2026, 10, 1, 7)),   // 1 sa Ekim 1
        };

        var byDay = ManHourSlicer.SumByLocalDay(intervals, Istanbul);
        Assert.Equal(3600, byDay[new DateOnly(2026, 9, 30)]);
        Assert.Equal(7200, byDay[new DateOnly(2026, 10, 1)]);

        var byMonth = ManHourSlicer.SumByMonth(byDay);
        Assert.Equal(3600, byMonth["2026-09"]);
        Assert.Equal(7200, byMonth["2026-10"]);
    }

    [Fact]
    public void Unknown_time_zone_falls_back_to_utc()
    {
        Assert.Equal(TimeZoneInfo.Utc, ManHourSlicer.ResolveTimeZone("Nowhere/Invalid"));
        Assert.Equal(TimeZoneInfo.Utc, ManHourSlicer.ResolveTimeZone(null));
    }
}
