namespace IsTakip.Domain.Time;

/// <summary>
/// Bir UTC aralığını site saat dilimindeki yerel günlere böler.
/// Raporlardaki "bir görevin tüm saati tek aya yazılıyor" hatasının çözümü: her saniye çalışıldığı güne yazılır.
/// </summary>
public static class ManHourSlicer
{
    /// <summary>Aralığı (yerel tarih, saniye) parçalarına böler. Boş ya da ters aralık → boş liste.</summary>
    public static IReadOnlyList<(DateOnly Date, int Seconds)> SliceByLocalDay(DateTime startedUtc, DateTime endedUtc, TimeZoneInfo tz)
    {
        if (endedUtc <= startedUtc) return [];

        var result = new List<(DateOnly, int)>();
        var cursor = startedUtc;

        while (cursor < endedUtc)
        {
            var local = TimeZoneInfo.ConvertTimeFromUtc(cursor, tz);
            var localDate = DateOnly.FromDateTime(local);
            var nextLocalMidnight = localDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
            // Yerel gece yarısını UTC'ye çevir; DST geçişlerinde geçersiz saat olmaz (00:00 hiçbir yerde atlanmaz).
            var nextUtc = TimeZoneInfo.ConvertTimeToUtc(nextLocalMidnight, tz);
            if (nextUtc <= cursor) nextUtc = cursor.AddHours(1); // güvenlik: sonsuz döngüyü engelle

            var segmentEnd = nextUtc < endedUtc ? nextUtc : endedUtc;
            var seconds = (int)Math.Round((segmentEnd - cursor).TotalSeconds);
            if (seconds > 0) result.Add((localDate, seconds));
            cursor = segmentEnd;
        }

        return result;
    }

    /// <summary>Birden çok aralığı gün bazında toplar (saniye).</summary>
    public static IReadOnlyDictionary<DateOnly, long> SumByLocalDay(
        IEnumerable<(DateTime StartedUtc, DateTime EndedUtc)> intervals, TimeZoneInfo tz)
    {
        var totals = new SortedDictionary<DateOnly, long>();
        foreach (var (s, e) in intervals)
        {
            foreach (var (date, seconds) in SliceByLocalDay(s, e, tz))
            {
                totals[date] = totals.TryGetValue(date, out var current) ? current + seconds : seconds;
            }
        }
        return totals;
    }

    /// <summary>Gün toplamlarını "yyyy-MM" anahtarıyla aya toplar.</summary>
    public static IReadOnlyDictionary<string, long> SumByMonth(IReadOnlyDictionary<DateOnly, long> byDay)
    {
        var totals = new SortedDictionary<string, long>(StringComparer.Ordinal);
        foreach (var (date, seconds) in byDay)
        {
            var key = $"{date.Year:D4}-{date.Month:D2}";
            totals[key] = totals.TryGetValue(key, out var current) ? current + seconds : seconds;
        }
        return totals;
    }

    /// <summary>Site saat dilimini çözer; IANA (Europe/Istanbul) ya da Windows adı (Turkey Standard Time).</summary>
    public static TimeZoneInfo ResolveTimeZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return TimeZoneInfo.Utc;
        try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.Utc; }
        catch (InvalidTimeZoneException) { return TimeZoneInfo.Utc; }
    }
}
