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
        DragonId.Rimeclaw => CreateRimeclawSign(attention.Intensity),
        DragonId.Voidweaver => CreateVoidweaverSign(attention.Intensity),
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

    private static DragonSign CreateRimeclawSign(DragonAttentionIntensity intensity) => intensity switch
    {
        DragonAttentionIntensity.Faint => new(DragonId.Rimeclaw, SpellSchool.Frost, intensity, "Breath crystallizes", "Your breath turns to glittering frost although the air has not grown colder."),
        DragonAttentionIntensity.Growing => new(DragonId.Rimeclaw, SpellSchool.Frost, intensity, "Rime without winter", "Thin ice veins spread through stone and vanish when you look directly at them."),
        DragonAttentionIntensity.Ominous => new(DragonId.Rimeclaw, SpellSchool.Frost, intensity, "The cold watches", "Sound dulls beneath a sudden deep freeze. Claw-shaped fractures appear beneath your feet."),
        _ => new(DragonId.Rimeclaw, SpellSchool.Frost, intensity, "The trail freezes behind you", "A wall of white closes over the path you crossed. Something enormous moves inside it without leaving a shadow."),
    };

    private static DragonSign CreateVoidweaverSign(DragonAttentionIntensity intensity) => intensity switch
    {
        DragonAttentionIntensity.Faint => new(DragonId.Voidweaver, SpellSchool.Arcane, intensity, "Bent reflections", "Your reflection moves a fraction too late in polished stone and pools of aether."),
        DragonAttentionIntensity.Growing => new(DragonId.Voidweaver, SpellSchool.Arcane, intensity, "Aether fractures", "Hairline violet seams open in empty air and close before anything can pass through."),
        DragonAttentionIntensity.Ominous => new(DragonId.Voidweaver, SpellSchool.Arcane, intensity, "Weightless stones", "Fragments of the trail drift upward. Distance bends around them as if the realm has forgotten its shape."),
        _ => new(DragonId.Voidweaver, SpellSchool.Arcane, intensity, "Reality has a shadow", "The world doubles at the edges. A second impossible silhouette moves where no creature stands."),
    };
}
