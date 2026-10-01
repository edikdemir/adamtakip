namespace IsTakip.Client.Core.Sync;

/// <summary>Senkron geri çekilmesi: 5s → 15s → 60s → 5dk (+ jitter), başarıda sıfırlanır (ADR 0002).</summary>
public sealed class Backoff
{
    private static readonly TimeSpan[] Steps =
    [
        TimeSpan.FromSeconds(5),
        TimeSpan.FromSeconds(15),
        TimeSpan.FromSeconds(60),
        TimeSpan.FromMinutes(5),
    ];

    private int _failures;

    public int Failures => _failures;

    public void RecordSuccess() => _failures = 0;

    public void RecordFailure() => _failures = Math.Min(_failures + 1, Steps.Length);

    /// <summary>Bir sonraki deneme için bekleme; jitter ±20%. Hiç hata yoksa sıfır.</summary>
    public TimeSpan NextDelay(Random? random = null)
    {
        if (_failures == 0) return TimeSpan.Zero;
        var baseDelay = Steps[Math.Min(_failures, Steps.Length) - 1];
        var jitter = 0.8 + (random ?? Random.Shared).NextDouble() * 0.4;
        return TimeSpan.FromMilliseconds(baseDelay.TotalMilliseconds * jitter);
    }
}
