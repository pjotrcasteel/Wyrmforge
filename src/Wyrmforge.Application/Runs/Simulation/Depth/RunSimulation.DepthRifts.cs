using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly RunDepthRiftState depthRiftState = new();

    private void UpdateDepthRift(double delta)
    {
        var wasTelegraphing = depthRiftState.IsTelegraphing;
        var riftsActive = depthState.Depth >= 2 && dragon is null && !deepDragonPending;
        var detonated = depthRiftState.Tick(delta, riftsActive, player.Position);

        if (!wasTelegraphing && depthRiftState.IsTelegraphing)
        {
            RegisterSplashPulse(depthRiftState.Position, RunDepthRiftState.Radius, RunDepthRiftState.TelegraphSeconds);
        }

        if (!detonated) return;

        RegisterSplashPulse(depthRiftState.Position, RunDepthRiftState.Radius);
        RegisterElementalImpact(depthRiftState.Position, SpellId.ArcaneOrb);
        if (Vector2D.Distance(player.Position, depthRiftState.Position) <= RunDepthRiftState.Radius) DamagePlayer(RunDepthRiftState.Damage);
    }
}
