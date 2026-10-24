using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    // Range and the 25% handoff margin are deliberate, tunable acquisition rules.
    private const double PrimaryAcquisitionRange = 900;
    private Vector2D effectiveAim = new(0, 1);
    private bool manualAimEngaged;
    private int? automaticTargetId;

    private void UpdateAim(MovementInput input)
    {
        manualAimEngaged = input.HasManualAim;
        if (manualAimEngaged)
        {
            effectiveAim = input.AimDirection;
            automaticTargetId = null;
            return;
        }
        var nearest = PrimaryTarget(player.Position);
        if (nearest is not null)
        {
            automaticTargetId = nearest.Id;
            effectiveAim = Vector2D.DirectionTo(player.Position, nearest.Position);
        }
        else automaticTargetId = null;
    }

    private ICombatTarget? PrimaryTarget(Vector2D origin, bool directional = false)
    {
        ICombatTarget? best = null;
        ICombatTarget? previous = null;
        var bestDistance = double.MaxValue;
        foreach (var target in PrimaryCandidates())
        {
            var distance = Vector2D.Distance(origin, target.Position);
            if (target.Health <= 0 || distance > PrimaryAcquisitionRange ||
                (arenaEnvironment is not null && !arenaEnvironment.HasLineOfSight(origin, target.Position, arenaWidth, arenaHeight))) continue;
            if (directional)
            {
                var toward = Vector2D.DirectionTo(origin, target.Position);
                // First lightning link only: 60-degree cone plus the target's physical radius.
                var threshold = Math.Cos(Math.PI / 6 + Math.Asin(Math.Min(1, target.Radius / Math.Max(distance, target.Radius))));
                if (toward.X * effectiveAim.X + toward.Y * effectiveAim.Y < threshold) continue;
            }
            if (target.Id == automaticTargetId) previous = target;
            if (distance < bestDistance || (distance == bestDistance && (best is null || target.Id < best.Id)))
            {
                best = target;
                bestDistance = distance;
            }
        }
        if (!directional && previous is not null && Vector2D.Distance(origin, previous.Position) <= bestDistance * 1.25) return previous;
        return best;
    }

    private IEnumerable<ICombatTarget> PrimaryCandidates()
    {
        foreach (var enemy in enemies) yield return enemy;
        if (dragonHuntState.CanTargetDragon && dragon is { Health: > 0 } activeDragon) yield return activeDragon;
    }
}
