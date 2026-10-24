using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

// Read-only presentation cue: no changes to damage, movement, or cast cadence.
public sealed record CastMotionRenderSnapshot(double X, double Y, SpellId Spell, int Rank, SynergyId? Combination, double Angle, double Progress)
{
    public bool Surge { get; init; }
    // Visual-only: cast cues use the exact mechanical Fireball loadout.
    // A single cast may spawn several real projectiles, each with its own
    // FireballSourceId. Never pretend this one cue identifies one projectile.
    public int FireballMutationMask { get; init; }
}
