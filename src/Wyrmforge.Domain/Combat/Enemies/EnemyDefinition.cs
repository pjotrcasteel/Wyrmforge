namespace Wyrmforge.Domain.Combat.Enemies;

/// <summary>The region family a creature belongs to. Each realm's roster has its own behaviours, never a recolour.</summary>
public enum EnemyRealm
{
    Cinder,
    Frost,
}

public sealed record EnemyDefinition(
    EnemyKind Kind,
    EnemyRole Role,
    int ThreatCost,
    double Radius,
    int MinimumDepth = 1,
    double HealthMultiplier = 1,
    double SpeedMultiplier = 1,
    double ContactDamageMultiplier = 1,
    bool HabitatOnly = false,
    bool Unique = false,
    EnemyRealm Realm = EnemyRealm.Cinder)
{
    /// <summary>A creature the bestiary records; the Reliquary's wards are ritual objects, not creatures.</summary>
    public bool IsCreature => Kind != EnemyKind.ReliquaryWard;
}
