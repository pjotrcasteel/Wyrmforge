namespace Wyrmforge.Domain.Combat.Enemies;

public static class EnemyCatalog
{
    public static IReadOnlyList<EnemyDefinition> All { get; } =
    [
        new(EnemyKind.Chaser, EnemyRole.Pressure, 1, 11),
        new(EnemyKind.RiftStalker, EnemyRole.Ambusher, 2, 14),
    ];

    public static EnemyDefinition Get(EnemyKind kind) => All.Single(definition => definition.Kind == kind);
}
