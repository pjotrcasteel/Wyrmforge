using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ProjectileRenderSnapshot(double X, double Y, double Radius, SpellId Spell, bool Inferno)
{
    public SynergyId? Combination { get; init; }
}
