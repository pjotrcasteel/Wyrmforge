using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ElementalImpactRenderSnapshot(double X, double Y, SpellId Spell, double Progress)
{
    public int Rank { get; init; } = 1;
    public SynergyId? Combination { get; init; }
}
