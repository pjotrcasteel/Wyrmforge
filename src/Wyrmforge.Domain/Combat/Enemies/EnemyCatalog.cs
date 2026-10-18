namespace Wyrmforge.Domain.Combat.Enemies;

public static class EnemyCatalog
{
    public static IReadOnlyList<EnemyDefinition> All { get; } =
    [
        new(EnemyKind.Hollow, EnemyRole.Pressure, 1, 11),
        new(EnemyKind.MireHound, EnemyRole.Ambusher, 2, 13, HealthMultiplier: 0.9, SpeedMultiplier: 1.2),
        new(EnemyKind.Ashling, EnemyRole.Pressure, 1, 8, HealthMultiplier: 0.65, SpeedMultiplier: 1.45, ContactDamageMultiplier: 0.65),
        new(EnemyKind.Penitent, EnemyRole.Pressure, 3, 19, MinimumDepth: 2, HealthMultiplier: 2.1, SpeedMultiplier: 0.62, ContactDamageMultiplier: 1.2),
        new(EnemyKind.AshSlinger, EnemyRole.Artillery, 2, 11, HealthMultiplier: 0.75, SpeedMultiplier: 0.95, ContactDamageMultiplier: 0.5),
        new(EnemyKind.AshPriest, EnemyRole.Support, 3, 12, HealthMultiplier: 1.3, SpeedMultiplier: 0.85, ContactDamageMultiplier: 0.4),
        new(EnemyKind.DrownedWraith, EnemyRole.Ambusher, 2, 12, HealthMultiplier: 0.85, SpeedMultiplier: 0.9, ContactDamageMultiplier: 0.5, HabitatOnly: true),
        // Unique: only the Reliquary event spawns these, never a pack plan or a habitat table.
        new(EnemyKind.Reliquary, EnemyRole.Support, 10, 27, HealthMultiplier: 15, SpeedMultiplier: 0.55, ContactDamageMultiplier: 0.6, Unique: true),
        new(EnemyKind.ReliquaryWard, EnemyRole.Support, 0, 13, HealthMultiplier: 2.4, SpeedMultiplier: 0, ContactDamageMultiplier: 0, Unique: true),
        // Unique: the Bell Warden only ever stands on the pre-lair road.
        new(EnemyKind.BellWarden, EnemyRole.Pressure, 10, 38, HealthMultiplier: 18, SpeedMultiplier: 0.5, ContactDamageMultiplier: 1, Unique: true),
        // Frost roster (Rimeclaw). HabitatOnly until the Frost region's habitats host them: Fire runs never draw them.
        new(EnemyKind.FrostlingPackling, EnemyRole.Pressure, 1, 9, HealthMultiplier: 0.6, SpeedMultiplier: 1.25, ContactDamageMultiplier: 0.4,
            HabitatOnly: true, Realm: EnemyRealm.Frost),
        new(EnemyKind.Shardcaster, EnemyRole.Artillery, 2, 11, HealthMultiplier: 0.7, SpeedMultiplier: 0.9, ContactDamageMultiplier: 0.4,
            HabitatOnly: true, Realm: EnemyRealm.Frost),
    ];

    public static EnemyDefinition Get(EnemyKind kind) => All.Single(definition => definition.Kind == kind);
}
