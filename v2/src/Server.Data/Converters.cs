using IsTakip.Domain;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace IsTakip.Data;

/// <summary>Tüm DateTime'lar UTC yazılır ve UTC olarak okunur (ADR 0002: yalnız UTC).</summary>
public sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter() : base(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}

/// <summary>Enum ↔ snake_case metin ("devam_ediyor"); web arayüzünün sözleşmesi korunur.</summary>
public sealed class SnakeEnumConverter<TEnum> : ValueConverter<TEnum, string> where TEnum : struct, Enum
{
    public SnakeEnumConverter() : base(
        v => EnumNames.ToSnake(v),
        v => EnumNames.FromSnake<TEnum>(v))
    {
    }
}

/// <summary>[Flags] TimeEntryFlags ↔ "overlap,too_long" csv.</summary>
public sealed class FlagsCsvConverter : ValueConverter<TimeEntryFlags, string>
{
    public FlagsCsvConverter() : base(
        v => EnumNames.FlagsToCsv(v),
        v => EnumNames.FlagsFromCsv(v))
    {
    }
}
