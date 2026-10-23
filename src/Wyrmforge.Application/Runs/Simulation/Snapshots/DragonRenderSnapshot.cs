using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonRenderSnapshot(string Name, string Title, SpellSchool School, double X, double Y, double Radius, double Health, double MaxHealth, int Phase, bool Frozen,
    IReadOnlyList<CombatStatusRenderSnapshot> Statuses)
{
    public int EntityId { get; init; }
    public int AttackSequence { get; init; }
    public double AttackElapsed { get; init; } = -1;
    public double TelegraphProgress { get; init; }
    public double DirectionX { get; init; }
    public double DirectionY { get; init; } = 1;
    public bool IsAscendant { get; init; }

    /// <summary>Lineage tier; the size already lives in <see cref="Radius"/>, the tier only selects its trappings.</summary>
    public WyrmTier Tier { get; init; }
}