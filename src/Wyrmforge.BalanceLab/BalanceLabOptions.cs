namespace Wyrmforge.BalanceLab;

internal sealed record BalanceLabOptions(
    int RunsPerCombination,
    int SeedStart,
    double MaximumSimulatedSeconds,
    string OutputDirectory)
{
    public static BalanceLabOptions Parse(string[] args)
    {
        var values = args
            .Select((value, index) => (value, index))
            .Where(item => item.value.StartsWith("--", StringComparison.Ordinal))
            .ToDictionary(
                item => item.value,
                item => item.index + 1 < args.Length && !args[item.index + 1].StartsWith("--", StringComparison.Ordinal) ? args[item.index + 1] : "true",
                StringComparer.OrdinalIgnoreCase);

        return new BalanceLabOptions(
            ParseInt(values, "--runs-per-combination", 25, 1, 10_000),
            ParseInt(values, "--seed-start", 10_000, 0, int.MaxValue - 10_000),
            ParseDouble(values, "--max-seconds", 720, 30, 7_200),
            values.GetValueOrDefault("--output", "artifacts/balance"));
    }

    private static int ParseInt(IReadOnlyDictionary<string, string> values, string key, int fallback, int minimum, int maximum) =>
        values.TryGetValue(key, out var raw) && int.TryParse(raw, out var value) ? Math.Clamp(value, minimum, maximum) : fallback;

    private static double ParseDouble(IReadOnlyDictionary<string, string> values, string key, double fallback, double minimum, double maximum) =>
        values.TryGetValue(key, out var raw) && double.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture, out var value)
            ? Math.Clamp(value, minimum, maximum)
            : fallback;
}
