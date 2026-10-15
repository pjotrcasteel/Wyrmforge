using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

// Read-only presentation cue: no changes to damage, movement, or cast cadence.
public sealed record CastMotionRenderSnapshot(double X, double Y, SpellId Spell, int Rank, SynergyId? Combination, double Angle, double Progress);
