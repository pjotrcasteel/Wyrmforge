using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Domain.Progression.DragonEssences;

public static class DragonEssenceCatalog
{
    public static IReadOnlyList<DragonEssenceDefinition> AshfangChoices { get; } =
    [
        new(
            DragonEssenceId.CinderHeart,
            "Cinder Heart",
            "Ashfang",
            "♥",
            "Every 6th spell cast erupts in a 125-radius cinder nova for heavy damage.",
            "Rip out the furnace that kept the wyrm alive. Your casting rhythm now periodically detonates around you."),
        new(
            DragonEssenceId.MoltenFang,
            "Molten Fang",
            "Ashfang",
            "🦷",
            "Projectile impacts deal +25% fiery damage and splash 35% damage within 78 radius.",
            "Forge the fang into your spellwork. Every projectile impact bites twice and spits molten fragments into nearby prey."),
        new(
            DragonEssenceId.AshenWing,
            "Ashen Wing",
            "Ashfang",
            "🪽",
            "After moving for 0.6s, launch a cinder strike every 1.2s while you keep moving.",
            "Bind the ruined wing to your stride. Momentum itself becomes a weapon, rewarding runs that never stop moving."),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> StormcoilChoices { get; } =
    [
        new(
            DragonEssenceId.StormHeart,
            "Storm Heart",
            "Stormcoil",
            "💙",
            "Every 5th spell cast discharges a four-target lightning chain at 70% damage.",
            "Carry the pulse of the Tempest Wyrm. Your casting rhythm now periodically tears a second path through the pack."),
        new(
            DragonEssenceId.ChargedScale,
            "Charged Scale",
            "Stormcoil",
            "◆",
            "Every 6s, the next heavy hit above 10 raw damage is reduced to 45% damage.",
            "Bind a storm-hardened scale beneath your warding. It does not care about scratches; it wakes only when something truly dangerous lands."),
        new(
            DragonEssenceId.TempestWing,
            "Tempest Wing",
            "Stormcoil",
            "🪽⚡",
            "Move continuously for 0.75s to charge your next spell to echo at 60% damage.",
            "Steal Stormcoil's impossible momentum. Keep moving long enough and your next spell leaves a second cast in its wake."),
    ];

    public static IReadOnlyList<DragonEssenceDefinition> All { get; } = [.. AshfangChoices, .. StormcoilChoices];

    public static IReadOnlyList<DragonEssenceDefinition> ChoicesFor(DragonId dragonId) => dragonId switch
    {
        DragonId.Ashfang => AshfangChoices,
        DragonId.Stormcoil => StormcoilChoices,
        _ => throw new ArgumentOutOfRangeException(nameof(dragonId)),
    };

    public static DragonEssenceDefinition Get(DragonEssenceId id) => All.Single(essence => essence.Id == id);
}
