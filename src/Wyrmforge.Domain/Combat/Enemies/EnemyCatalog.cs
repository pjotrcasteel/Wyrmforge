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
    ];

    public static EnemyDefinition Get(EnemyKind kind) => All.Single(definition => definition.Kind == kind);
}
