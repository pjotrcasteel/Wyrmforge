using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class DragonAttentionState
{
    private const int RivalAttentionNumerator = 3;
    private const int RivalAttentionDenominator = 5;

    public IReadOnlyList<DragonAttention> Calculate(IReadOnlyList<DragonAttractionEntry> attraction, int completedTrails, DragonId? resolvedDragon)
    {
        if (completedTrails <= 0) return Array.Empty<DragonAttention>();

        var intensity = IntensityFor(completedTrails);
        if (resolvedDragon is { } dragon) return [new DragonAttention(dragon, intensity)];
        if (attraction.Count == 0) return Array.Empty<DragonAttention>();

        var ordered = attraction.OrderByDescending(entry => entry.Weight).ThenBy(entry => entry.Dragon).ToArray();
        var attention = new List<DragonAttention> { new(ordered[0].Dragon, intensity) };
        if (completedTrails >= 2 && ordered.Length > 1 && IsRivalCloseEnough(ordered[0], ordered[1]))
        {
            var rivalIntensity = completedTrails >= 3 ? DragonAttentionIntensity.Growing : DragonAttentionIntensity.Faint;
            attention.Add(new DragonAttention(ordered[1].Dragon, rivalIntensity));
        }

        return attention;
    }

    private static bool IsRivalCloseEnough(DragonAttractionEntry leader, DragonAttractionEntry rival) =>
        rival.Weight * RivalAttentionDenominator >= leader.Weight * RivalAttentionNumerator;

    private static DragonAttentionIntensity IntensityFor(int completedTrails) => completedTrails switch
    {
        <= 1 => DragonAttentionIntensity.Faint,
        2 => DragonAttentionIntensity.Growing,
        3 => DragonAttentionIntensity.Ominous,
        _ => DragonAttentionIntensity.Imminent,
    };
}
