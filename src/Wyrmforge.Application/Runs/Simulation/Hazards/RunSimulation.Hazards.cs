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
        var wasTelegraphing = unstableRiftState.IsTelegraphing;
        var riftsActive = encounterModifiers.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out var intervalMultiplier) && dragon is null && !dragonPending;
        var detonated = unstableRiftState.Tick(delta, riftsActive, player.Position, riftsActive ? intervalMultiplier : 1);

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
