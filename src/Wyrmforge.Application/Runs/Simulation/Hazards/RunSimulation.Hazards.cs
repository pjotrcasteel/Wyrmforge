using Wyrmforge.Application.Runs.Hazards;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly UnstableRiftState unstableRiftState = new();

    private void UpdateRouteHazards(double delta)
    {
        if (entryGraceRemaining > 0) return;
        var wasTelegraphing = unstableRiftState.IsTelegraphing;
        var riftsActive = encounterModifiers.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out var intervalMultiplier) && dragon is null && !dragonPending;
        var difficultyInterval = riftsActive ? intervalMultiplier * depthState.HazardIntervalMultiplier : 1;
        var detonated = unstableRiftState.Tick(delta, riftsActive, player.Position, difficultyInterval);

        if (!wasTelegraphing && unstableRiftState.IsTelegraphing)
        {
            RegisterSplashPulse(unstableRiftState.Position, UnstableRiftState.Radius, UnstableRiftState.TelegraphSeconds);
        }

        if (!detonated) return;
        RegisterSplashPulse(unstableRiftState.Position, UnstableRiftState.Radius);
        RegisterElementalImpact(unstableRiftState.Position, SpellId.ArcaneOrb);
        if (Vector2D.Distance(player.Position, unstableRiftState.Position) <= UnstableRiftState.Radius) DamagePlayer(UnstableRiftState.Damage);
    }
}
