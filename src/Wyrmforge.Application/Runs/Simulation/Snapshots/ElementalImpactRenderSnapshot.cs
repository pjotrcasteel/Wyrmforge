using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record ElementalImpactRenderSnapshot(double X, double Y, SpellId Spell, double Progress);
