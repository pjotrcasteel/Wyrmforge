using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record DragonRenderSnapshot(string Name, string Title, SpellSchool School, double X, double Y, double Radius, double Health, double MaxHealth, int Phase, bool Frozen,
    IReadOnlyList<CombatStatusRenderSnapshot> Statuses)
{
    public bool IsAscendant { get; init; }

    /// <summary>Lineage tier; the size already lives in <see cref="Radius"/>, the tier only selects its trappings.</summary>
    public WyrmTier Tier { get; init; }
}