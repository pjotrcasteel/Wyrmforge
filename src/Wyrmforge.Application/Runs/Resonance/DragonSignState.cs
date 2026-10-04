using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Resonance;

public sealed class DragonSignState
{
    public IReadOnlyList<DragonSign> Calculate(IReadOnlyList<DragonAttention> attention) => attention.Select(Create).ToArray();

    private static DragonSign Create(DragonAttention attention) => attention.Dragon switch
    {
        DragonId.Ashfang => CreateAshfangSign(attention.Intensity),
        DragonId.Stormcoil => CreateStormcoilSign(attention.Intensity),
        _ => throw new ArgumentOutOfRangeException(nameof(attention), attention.Dragon, "Unsupported dragon sign source."),
    };

    private static DragonSign CreateAshfangSign(DragonAttentionIntensity intensity) => intensity switch
    {
        DragonAttentionIntensity.Faint => new(DragonId.Ashfang, SpellSchool.Fire, intensity, "Warm ash", "Fine ash settles across cold stone. It is warm when it touches your skin."),
        DragonAttentionIntensity.Growing => new(DragonId.Ashfang, SpellSchool.Fire, intensity, "Scorched marks", "Fresh black scoring cuts across rocks that were untouched moments ago."),
        DragonAttentionIntensity.Ominous => new(DragonId.Ashfang, SpellSchool.Fire, intensity, "A furnace breath", "Heat ripples over the path. The air tastes of smoke, and something heavy moves beyond sight."),
        _ => new(DragonId.Ashfang, SpellSchool.Fire, intensity, "The ridge is burning", "A vast shadow passes behind the smoke. Fresh scorch lines glow where claws dragged across stone."),
    };

    private static DragonSign CreateStormcoilSign(DragonAttentionIntensity intensity) => intensity switch
    {
        DragonAttentionIntensity.Faint => new(DragonId.Stormcoil, SpellSchool.Storm, intensity, "Static disturbance", "Static crawls across your skin. Loose metal hums although the air is still."),
        DragonAttentionIntensity.Growing => new(DragonId.Stormcoil, SpellSchool.Storm, intensity, "Distant thunder", "A thunderclap answers your spellwork from a clear sky, always a heartbeat too late."),
        DragonAttentionIntensity.Ominous => new(DragonId.Stormcoil, SpellSchool.Storm, intensity, "Charged air", "Blue-white sparks jump between stones. Every hair rises before the next roll of thunder."),
        _ => new(DragonId.Stormcoil, SpellSchool.Storm, intensity, "The storm circles", "The air buckles with charge. Thunder rolls around the trail from every direction, but no rain falls."),
    };
}
