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

    public static IReadOnlyList<DragonEssenceDefinition> All { get; } = AshfangChoices;

    public static DragonEssenceDefinition Get(DragonEssenceId id) => All.Single(essence => essence.Id == id);
}
