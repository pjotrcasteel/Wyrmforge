namespace Wyrmforge.Domain.Combat.Enemies;

public static class EnemyCatalog
{
    public static IReadOnlyList<EnemyDefinition> All { get; } =
    [
        new(EnemyKind.Chaser, EnemyRole.Pressure, 1, 11),
        new(EnemyKind.RiftStalker, EnemyRole.Ambusher, 2, 14),
        new(EnemyKind.Skitter, EnemyRole.Pressure, 1, 8, HealthMultiplier: 0.65, SpeedMultiplier: 1.45, ContactDamageMultiplier: 0.65),
        new(EnemyKind.Brute, EnemyRole.Pressure, 3, 19, MinimumDepth: 2, HealthMultiplier: 2.1, SpeedMultiplier: 0.62, ContactDamageMultiplier: 1.8),
    ];

    public static EnemyDefinition Get(EnemyKind kind) => All.Single(definition => definition.Kind == kind);
}
