using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Roster step 4: the Drowned Wraith. While submerged it is kept out of <c>enemies</c> entirely, so no spell, aura, chain or
/// essence can touch it and it cannot touch the hunter (brief §3: "cannot damage while fully invisible"). It still counts as a
/// living hostile for the active cap and for clearing a node, and it always resurfaces, so it can never soft-lock completion.
/// </summary>
public sealed partial class RunSimulation
{
    private readonly List<EnemyState> submergedWraiths = [];
    private readonly List<EnemyState> sinkingWraiths = [];

    /// <summary>Everything still alive in the encounter, including wraiths under the water.</summary>
    private int HostileCount => enemies.Count + submergedWraiths.Count;

    private void UpdateSubmergedWraiths(double delta, ref int committed, int committedCap)
    {
        var surfacing = new List<EnemyState>();
        foreach (var wraith in submergedWraiths)
        {
            var behavior = wraith.DrownedWraith!;
            var navigation = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.EnemyNavigationTarget(wraith.Position, player.Position, arenaWidth, arenaHeight, wraith.Radius)
                : player.Position;
            var crossing = navigation != player.Position;
            if (behavior.Phase == DrownedWraithPhase.Submerged)
            {
                // Glides under the water along the same walkable ground as everyone else; it never phases through walls.
                var goal = crossing ? navigation : behavior.AmbushPoint(wraith.Position, player.Position);
                var step = wraith.Speed * DrownedWraithBehaviorState.DriftSpeedMultiplier * delta;
                var offset = goal - wraith.Position;
                var proposed = offset.Length <= step ? goal : wraith.Position + offset.Normalized() * step;
                wraith.Position = mapState.EncounterActive && arenaEnvironment is not null
                    ? arenaEnvironment.RestrictMovement(wraith.Position, proposed, arenaWidth, arenaHeight, wraith.Radius)
                    : proposed;
            }
            switch (behavior.Tick(delta, wraith.Position, player.Position, !crossing && committed < committedCap))
            {
                case DrownedWraithEvent.EmergeStarted:
                    committed++;
                    break;
                case DrownedWraithEvent.Materialized:
                    surfacing.Add(wraith);
                    break;
            }
        }
        foreach (var wraith in surfacing)
        {
            submergedWraiths.Remove(wraith);
            enemies.Add(wraith);
        }
    }

    private double UpdateDrownedWraith(EnemyState enemy, DrownedWraithBehaviorState wraith, double scaledDelta, double speed)
    {
        switch (wraith.Tick(scaledDelta, enemy.Position, player.Position))
        {
            case DrownedWraithEvent.Struck:
                if (wraith.StrikeHits(enemy.Position, player.Position, player.Radius)) DamagePlayer(DrownedWraithBehaviorState.StrikeDamage * EliteImpact(enemy));
                if (enemy.Elite == EliteAffix.Drowncaller) AddDrowncallerEcho(enemy, wraith);
                break;
            case DrownedWraithEvent.Submerged:
                sinkingWraiths.Add(enemy);
                break;
        }
        return wraith.Phase == DrownedWraithPhase.Exposed ? speed * DrownedWraithBehaviorState.ExposedSpeedMultiplier : 0;
    }

    private void SinkWraiths()
    {
        foreach (var wraith in sinkingWraiths)
        {
            if (wraith.Health <= 0 || !enemies.Remove(wraith)) continue;
            submergedWraiths.Add(wraith);
        }
        sinkingWraiths.Clear();
    }

    private void ClearWraithState()
    {
        submergedWraiths.Clear();
        sinkingWraiths.Clear();
    }

    private IReadOnlyList<WraithRippleRenderSnapshot> CreateWraithRippleSnapshots() => submergedWraiths
        .Select(wraith => new WraithRippleRenderSnapshot(wraith.Position.X, wraith.Position.Y,
            wraith.DrownedWraith!.Phase == DrownedWraithPhase.Emerging, wraith.DrownedWraith.EmergeProgress, wraith.Radius))
        .ToArray();
}
