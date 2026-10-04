using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Progression.DragonEssences;

public static class DragonEssenceCatalog
{
    public static IReadOnlyList<DragonEssenceDefinition> AshfangChoices { get; } =
    [
        new(DragonEssenceId.CinderHeart, "Cinder Heart", "Ashfang", "♥", "Every 6th spell cast erupts in a 125-radius cinder nova for heavy damage.", "Rip out the furnace that kept the wyrm alive. Your casting rhythm now periodically detonates around you."),
        new(DragonEssenceId.MoltenFang, "Molten Fang", "Ashfang", "🦷", "Projectile impacts deal +25% fiery damage and splash 35% damage within 78 radius.", "Forge the fang into your spellwork. Every projectile impact bites twice and spits molten fragments into nearby prey."),
        new(DragonEssenceId.AshenWing, "Ashen Wing", "Ashfang", "🪽", "After moving for 0.6s, launch a cinder strike every 1.2s while you keep moving.", "Bind the ruined wing to your stride. Momentum itself becomes a weapon, rewarding runs that never stop moving."),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> StormcoilChoices { get; } =
    [
        new(DragonEssenceId.StormHeart, "Storm Heart", "Stormcoil", "💙", "Every 5th spell cast discharges a four-target lightning chain at 70% damage.", "Carry the pulse of the Tempest Wyrm. Your casting rhythm now periodically tears a second path through the pack."),
        new(DragonEssenceId.ChargedScale, "Charged Scale", "Stormcoil", "◆", "Every 6s, the next heavy hit above 10 raw damage is reduced to 45% damage.", "Bind a storm-hardened scale beneath your warding. It does not care about scratches; it wakes only when something truly dangerous lands."),
        new(DragonEssenceId.TempestWing, "Tempest Wing", "Stormcoil", "🪽⚡", "Move continuously for 0.75s to charge your next spell to echo at 60% damage.", "Steal Stormcoil's impossible momentum. Keep moving long enough and your next spell leaves a second cast in its wake."),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> RimeclawChoices { get; } =
    [
        new(DragonEssenceId.RimeHeart, "Rime Heart", "Rimeclaw", "❄♥", "+42 maximum vitality.", "The Glacier Wyrm's heart refuses to thaw. Its impossible density hardens your body against the deeper realm.", new DragonEssenceModifiers(MaxHealthBonus: 42)),
        new(DragonEssenceId.GlacialScale, "Glacial Scale", "Rimeclaw", "◇❄", "Take 16% less damage.", "A plate of living ice turns killing force into spreading frost before it can reach your bones.", new DragonEssenceModifiers(DamageTakenMultiplier: 0.84)),
        new(DragonEssenceId.HoarfrostWing, "Hoarfrost Wing", "Rimeclaw", "🪽❄", "+14% movement speed.", "The torn wing catches currents that do not exist. Your steps glide across the realm instead of fighting it.", new DragonEssenceModifiers(MoveSpeedMultiplier: 1.14)),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> VoidweaverChoices { get; } =
    [
        new(DragonEssenceId.VoidHeart, "Void Heart", "Voidweaver", "✦♥", "+20% spell damage.", "A knot of condensed aether bends every spell around itself, forcing more power through the same cast.", new DragonEssenceModifiers(DamageMultiplier: 1.2)),
        new(DragonEssenceId.NullScale, "Null Scale", "Voidweaver", "◈", "Cast intervals are 16% shorter.", "The scale exists a fraction of a second ahead of you. Your spell rhythm follows it into the gap.", new DragonEssenceModifiers(CastIntervalMultiplier: 0.84)),
        new(DragonEssenceId.PhaseWing, "Phase Wing", "Voidweaver", "🪽✨", "+10% movement speed and +8% spell damage.", "Part of the wing is always elsewhere. Following it makes both your movement and spellwork slip through resistance.", new DragonEssenceModifiers(DamageMultiplier: 1.08, MoveSpeedMultiplier: 1.1)),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> All { get; } = [.. AshfangChoices, .. StormcoilChoices, .. RimeclawChoices, .. VoidweaverChoices];

    public static IReadOnlyList<DragonEssenceDefinition> ChoicesFor(DragonId dragonId) => dragonId switch
    {
        DragonId.Ashfang => AshfangChoices,
        DragonId.Stormcoil => StormcoilChoices,
        DragonId.Rimeclaw => RimeclawChoices,
        DragonId.Voidweaver => VoidweaverChoices,
        _ => throw new ArgumentOutOfRangeException(nameof(dragonId)),
    };

    public static DragonEssenceDefinition Get(DragonEssenceId id) => All.Single(essence => essence.Id == id);
}
