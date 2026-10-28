using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    // Acquisition is capped by both world distance and the exact camera viewport.
    private const double PrimaryAcquisitionRange = 900;
    private const double StickSnapMinimumDot = 0.8660254037844386; // 30 degrees.
    private Vector2D effectiveAim = new(0, 1);
    private bool manualAimEngaged;
    private int? automaticTargetId;
    private int? rightStickTargetId;

    private int? selectedPropId;
    private int? aimedPropId;

    private void UpdateAim(MovementInput input)
    {
        manualAimEngaged = input.HasManualAim;
        aimedPropId = null;
        if (manualAimEngaged)
        {
            selectedPropId = null;
            effectiveAim = input.AimDirection;
            automaticTargetId = null;

            // The gamepad asks C# for a legal directional target. Other manual inputs
            // retain precise free aiming, including shots into empty space.
            if (input.SnapAim && StickTarget(player.Position, effectiveAim) is { } snapped)
            {
                rightStickTargetId = snapped.Id;
                automaticTargetId = snapped.Id;
                effectiveAim = Vector2D.DirectionTo(player.Position, snapped.Position);
            }
            else
            {
                rightStickTargetId = null;
            }
            return;
        }

        rightStickTargetId = null;
        if (input.FocusPropId is { } requestedId) selectedPropId = requestedId;
        if (selectedPropId is { } selectedId && FindEligibleProp(selectedId) is { } selected)
        {
            aimedPropId = selected.Id;
            automaticTargetId = null;
            effectiveAim = Vector2D.DirectionTo(player.Position, selected.Position);
            return;
        }

        // An invalid, destroyed, occluded, offscreen or distant focus cannot block regular targeting.
        selectedPropId = null;
        var nearest = PrimaryTarget(player.Position);
        if (nearest is not null)
        {
            automaticTargetId = nearest.Id;
            effectiveAim = Vector2D.DirectionTo(player.Position, nearest.Position);
            return;
        }

        automaticTargetId = null;
        if (FindEligibleProp() is not { } prop) return;
        aimedPropId = prop.Id;
        effectiveAim = Vector2D.DirectionTo(player.Position, prop.Position);
    }

    private (int Id, Vector2D Position)? FindEligibleProp(int? requestedId = null)
    {
        if (arenaEnvironment is null || !build.Spells.IsPrimaryCommitted ||
            SpellCatalog.Get(build.Spells.ActiveSpell).Ability.Delivery is not ProjectileAbilityProfile) return null;
        return arenaEnvironment.FindTargetableProp(player.Position, arenaWidth, arenaHeight,
            PrimaryAcquisitionRange, requestedId, IsWithinVisibleViewport);
    }

    // The C# camera calculation must match resolveArenaCamera in arena-camera.js.
    private bool IsWithinVisibleViewport(Vector2D position)
    {
        if (viewportWidth <= 0 || viewportHeight <= 0) return false;
        var left = Math.Clamp(player.Position.X - viewportWidth / 2, 0, Math.Max(0, arenaWidth - viewportWidth));
        var top = Math.Clamp(player.Position.Y - viewportHeight / 2, 0, Math.Max(0, arenaHeight - viewportHeight));
        const double margin = 8; // Do not auto-acquire an enemy barely clipping an edge.
        return position.X >= left + margin && position.X <= left + viewportWidth - margin &&
            position.Y >= top + margin && position.Y <= top + viewportHeight - margin;
    }

    private bool IsEligibleForAim(ICombatTarget target, Vector2D origin) =>
        target.Health > 0 &&
        Vector2D.Distance(origin, target.Position) <= PrimaryAcquisitionRange &&
        IsWithinVisibleViewport(target.Position) &&
        (arenaEnvironment is null || arenaEnvironment.HasLineOfSight(origin, target.Position, arenaWidth, arenaHeight));

    private ICombatTarget? StickTarget(Vector2D origin, Vector2D direction)
    {
        ICombatTarget? best = null;
        ICombatTarget? previous = null;
        var bestScore = double.MaxValue;
        var previousScore = double.MaxValue;
        foreach (var target in PrimaryCandidates())
        {
            if (!IsEligibleForAim(target, origin)) continue;
            var toward = Vector2D.DirectionTo(origin, target.Position);
            var dot = toward.X * direction.X + toward.Y * direction.Y;
            if (dot < StickSnapMinimumDot) continue;

            // Alignment dominates distance: the stick chooses a direction, not the nearest enemy.
            var score = 1 - dot + Vector2D.Distance(origin, target.Position) / PrimaryAcquisitionRange * 0.08;
            if (target.Id == rightStickTargetId)
            {
                previous = target;
                previousScore = score;
            }
            if (score < bestScore || (score == bestScore && (best is null || target.Id < best.Id)))
            {
                best = target;
                bestScore = score;
            }
        }

        // A small handoff margin avoids jitter between closely aligned moving enemies.
        return previous is not null && previousScore <= bestScore + 0.04 ? previous : best;
    }

    private ICombatTarget? PrimaryTarget(Vector2D origin, bool directional = false)
    {
        ICombatTarget? best = null;
        ICombatTarget? previous = null;
        var bestDistance = double.MaxValue;
        foreach (var target in PrimaryCandidates())
        {
            if (!IsEligibleForAim(target, origin)) continue;
            var distance = Vector2D.Distance(origin, target.Position);
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
        if (CanTargetActiveDragon && dragon is { Health: > 0 } activeDragon) yield return activeDragon;
    }
}
