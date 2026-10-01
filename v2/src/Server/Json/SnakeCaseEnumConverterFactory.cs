using System.Text.Json;
using System.Text.Json.Serialization;
using IsTakip.Domain;

namespace IsTakip.Server.Json;

/// <summary>Enum'ları API'de snake_case metin olarak taşır ("devam_ediyor"), web sözleşmesiyle uyumlu.</summary>
public sealed class SnakeCaseEnumConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert)
        => typeToConvert.IsEnum && typeToConvert != typeof(TimeEntryFlags);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        => (JsonConverter)Activator.CreateInstance(typeof(SnakeEnumConverter<>).MakeGenericType(typeToConvert))!;

    private sealed class SnakeEnumConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
    {
        public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var text = reader.GetString();
            if (EnumNames.TryFromSnake<TEnum>(text, out var value)) return value;
            throw new JsonException($"'{text}' geçerli bir {typeof(TEnum).Name} değeri değil");
        }

        public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
            => writer.WriteStringValue(EnumNames.ToSnake(value));
    }
}

/// <summary>TimeEntryFlags ↔ "overlap,too_long".</summary>
public sealed class FlagsCsvJsonConverter : JsonConverter<TimeEntryFlags>
{
    public override TimeEntryFlags Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => EnumNames.FlagsFromCsv(reader.GetString());

    public override void Write(Utf8JsonWriter writer, TimeEntryFlags value, JsonSerializerOptions options)
        => writer.WriteStringValue(EnumNames.FlagsToCsv(value));
}
