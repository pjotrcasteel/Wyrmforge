using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    // Range and the 25% handoff margin are deliberate, tunable acquisition rules.
    private const double PrimaryAcquisitionRange = 900;
    private Vector2D effectiveAim = new(0, 1);
    private bool manualAimEngaged;
    private int? automaticTargetId;

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
            return;
        }

        if (input.FocusPropId is { } requestedId) selectedPropId = requestedId;
        if (selectedPropId is { } selectedId && FindEligibleProp(selectedId) is { } selected)
        {
            aimedPropId = selected.Id;
            automaticTargetId = null;
            effectiveAim = Vector2D.DirectionTo(player.Position, selected.Position);
            return;
        }

        // An invalid, destroyed, occluded or distant focus never blocks regular auto targeting.
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
        return arenaEnvironment.FindTargetableProp(player.Position, arenaWidth, arenaHeight, PrimaryAcquisitionRange, requestedId);
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
        if (CanTargetActiveDragon && dragon is { Health: > 0 } activeDragon) yield return activeDragon;
    }
}
