using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class DragonSignState
{
    private const int RivalAttentionNumerator = 3;
    private const int RivalAttentionDenominator = 5;

    public IReadOnlyList<DragonSign> Calculate(IReadOnlyList<DragonAttractionEntry> attraction, int completedTrails, DragonId? attractedDragon)
    {
        if (completedTrails <= 0 || attraction.Count == 0) return Array.Empty<DragonSign>();

        var intensity = IntensityFor(completedTrails);
        if (attractedDragon is { } resolvedDragon) return [Create(resolvedDragon, intensity)];

        var ordered = attraction.OrderByDescending(entry => entry.Weight).ThenBy(entry => entry.Dragon).ToArray();
        var signs = new List<DragonSign> { Create(ordered[0].Dragon, intensity) };

        if (completedTrails >= 2 && ordered.Length > 1 && IsRivalCloseEnough(ordered[0], ordered[1]))
        {
            var rivalIntensity = completedTrails >= 3 ? DragonSignIntensity.Growing : DragonSignIntensity.Faint;
            signs.Add(Create(ordered[1].Dragon, rivalIntensity));
        }

        return signs;
    }

    private static bool IsRivalCloseEnough(DragonAttractionEntry leader, DragonAttractionEntry rival) =>
        rival.Weight * RivalAttentionDenominator >= leader.Weight * RivalAttentionNumerator;

    private static DragonSignIntensity IntensityFor(int completedTrails) => completedTrails switch
    {
        <= 1 => DragonSignIntensity.Faint,
        2 => DragonSignIntensity.Growing,
        3 => DragonSignIntensity.Ominous,
        _ => DragonSignIntensity.Imminent,
    };

    private static DragonSign Create(DragonId dragon, DragonSignIntensity intensity) => dragon switch
    {
        DragonId.Ashfang => CreateAshfangSign(intensity),
        DragonId.Stormcoil => CreateStormcoilSign(intensity),
        _ => throw new ArgumentOutOfRangeException(nameof(dragon), dragon, "Unsupported dragon sign source."),
    };

    private static DragonSign CreateAshfangSign(DragonSignIntensity intensity) => intensity switch
    {
        DragonSignIntensity.Faint => new(SpellSchool.Fire, intensity, "Warm ash", "Fine ash settles across cold stone. It is warm when it touches your skin."),
        DragonSignIntensity.Growing => new(SpellSchool.Fire, intensity, "Scorched marks", "Fresh black scoring cuts across rocks that were untouched moments ago."),
        DragonSignIntensity.Ominous => new(SpellSchool.Fire, intensity, "A furnace breath", "Heat ripples over the path. The air tastes of smoke, and something heavy moves beyond sight."),
        _ => new(SpellSchool.Fire, intensity, "The ridge is burning", "A vast shadow passes behind the smoke. Fresh scorch lines glow where claws dragged across stone."),
    };

    private static DragonSign CreateStormcoilSign(DragonSignIntensity intensity) => intensity switch
    {
        DragonSignIntensity.Faint => new(SpellSchool.Storm, intensity, "Static disturbance", "Static crawls across your skin. Loose metal hums although the air is still."),
        DragonSignIntensity.Growing => new(SpellSchool.Storm, intensity, "Distant thunder", "A thunderclap answers your spellwork from a clear sky, always a heartbeat too late."),
        DragonSignIntensity.Ominous => new(SpellSchool.Storm, intensity, "Charged air", "Blue-white sparks jump between stones. Every hair rises before the next roll of thunder."),
        _ => new(SpellSchool.Storm, intensity, "The storm circles", "The air buckles with charge. Thunder rolls around the trail from every direction, but no rain falls."),
    };
}
