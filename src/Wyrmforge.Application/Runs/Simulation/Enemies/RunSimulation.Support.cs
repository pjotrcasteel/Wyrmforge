using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Roster step 3: Ash Priest support (heal, revive, morale) and the Penitent's directional shield. Every rule here is bounded
/// so a support pack can be outplayed, never stalled: two revives per encounter, true corpse markers that expire, rout that
/// ends on its own, and a shield that only covers its front.
/// </summary>
public sealed partial class RunSimulation
{
    public const int MaxRevivesPerEncounter = 2;
    public const double AshRemainsSeconds = 8;
    public const double PriestRoutRadius = 260;
    public const double PriestRoutSeconds = 2.5;
    public const double PenitentWardRange = 300;
    private const double PriestPackRadius = 360;

    private readonly List<AshRemainsState> ashRemains = [];
    private int encounterRevives;

    private void UpdateAshRemains(double delta)
    {
        foreach (var remains in ashRemains) remains.Life -= delta;
        ashRemains.RemoveAll(remains => remains.Life <= 0);
    }

    private void ClearSupportState()
    {
        ashRemains.Clear();
        encounterRevives = 0;
        ClearWraithState();
    }

    private void RegisterSupportDeath(EnemyState enemy)
    {
        // Only a first death leaves remains: a raised Ashling that falls again stays down.
        // Elites leave no remains either: a raised Ashling would read as a second elite.
        if (enemy.Kind == EnemyKind.Ashling && !enemy.Revived && !enemy.IsElite) ashRemains.Add(new AshRemainsState(enemy.Position, AshRemainsSeconds));
        if (enemy.Kind != EnemyKind.AshPriest) return;
        RefreshPackbloodLeaders();
        foreach (var ally in enemies)
        {
            if (ally.Kind == EnemyKind.Ashling && ally.Health > 0 && Vector2D.Distance(ally.Position, enemy.Position) <= PriestRoutRadius
                && ally.Elite != EliteAffix.Packblood && !IsPackbloodEmpowered(ally))
                ally.RoutedRemaining = PriestRoutSeconds;
        }
    }

    private (Vector2D Direction, double Speed) UpdateAshPriest(EnemyState enemy, AshPriestBehaviorState priest, double scaledDelta, bool crossing,
        Vector2D direction, double speed)
    {
        (int, Vector2D)? healTarget = null;
        var lowest = AshPriestBehaviorState.WoundedFraction;
        foreach (var ally in enemies)
        {
            if (ally == enemy || ally.Health <= 0 || ally.Kind == EnemyKind.AshPriest || IsReliquaryKind(ally.Kind)) continue;
            if (Vector2D.Distance(ally.Position, enemy.Position) > AshPriestBehaviorState.HealRange) continue;
            var ratio = ally.Health / ally.MaxHealth;
            if (ratio >= lowest) continue;
            lowest = ratio;
            healTarget = (ally.Id, ally.Position);
        }
        Vector2D? reviveSite = encounterRevives < MaxRevivesPerEncounter ? NearestRemains(enemy.Position, AshPriestBehaviorState.ReviveRange) : null;

        switch (priest.Tick(scaledDelta, enemy.Health, enemy.MaxHealth, healTarget, reviveSite))
        {
            case AshPriestEvent.HealCompleted:
                var healed = enemies.FirstOrDefault(ally => ally.Id == priest.HealTargetId);
                // The heal lands only if its locked target survived and stayed within reach of the tether.
                if (healed is { Health: > 0 } && Vector2D.Distance(healed.Position, enemy.Position) <= AshPriestBehaviorState.HealRange * 1.25)
                    healed.Health = Math.Min(healed.MaxHealth, healed.Health + healed.MaxHealth
                        * (enemy.Elite == EliteAffix.EmberAnointer ? EmberAnointerHealFraction : AshPriestBehaviorState.HealFraction));
                break;
            case AshPriestEvent.ReviveCompleted:
                RaiseAshlings(priest.CastPoint);
                break;
        }

        if (priest.Phase != AshPriestPhase.Shepherd) return (direction, 0);
        if (crossing) return (direction, speed);
        var (move, multiplier) = priest.Movement(enemy.Position, player.Position, PackCenter(enemy));
        return (move, speed * multiplier);
    }

    private (Vector2D Direction, double Speed, int Committed) UpdatePenitent(EnemyState enemy, PenitentBehaviorState penitent, double scaledDelta, bool crossing,
        Vector2D direction, double speed, bool mayCommit)
    {
        var committed = 0;
        switch (penitent.Tick(scaledDelta, enemy.Position, player.Position, player.Radius, !crossing && mayCommit))
        {
            case PenitentEvent.WindupStarted:
                committed = 1;
                break;
            case PenitentEvent.Bashed:
                DamagePlayer(PenitentBehaviorState.BashDamage * EliteImpact(enemy));
                break;
        }
        if (penitent.Phase != PenitentPhase.Guard) return (direction, 0, committed);
        if (crossing) return (direction, speed, committed);
        var guardPoint = PenitentBehaviorState.GuardPoint(player.Position, WardFor(enemy));
        // Close enough to the post: hold the line and let the hunter come to the shield.
        if (guardPoint != player.Position && Vector2D.Distance(enemy.Position, guardPoint) < 12) return (direction, 0, committed);
        return (Vector2D.DirectionTo(enemy.Position, guardPoint), speed, committed);
    }

    /// <summary>Frontal hits against a raised shield are blocked; a heavy enough blocked hit breaks the guard and lands in full.</summary>
    private static double ShieldMultiplier(ICombatTarget target, Vector2D source, double damage)
    {
        if (target is EnemyState { Sentinel: not null } sentinel) return SentinelMultiplier(sentinel, source);
        if (target is not EnemyState { Penitent: { } penitent } enemy) return 1;
        var multiplier = penitent.DamageMultiplier(enemy.Position, source);
        if (multiplier < 1 && penitent.TryBreakGuard(damage, enemy.MaxHealth)) return 1;
        return multiplier;
    }

    private void RaiseAshlings(Vector2D site)
    {
        foreach (var remains in ashRemains.OrderBy(remains => Vector2D.Distance(remains.Position, site)).ToArray())
        {
            if (encounterRevives >= MaxRevivesPerEncounter) break;
            if (Vector2D.Distance(remains.Position, site) > AshPriestBehaviorState.ReviveRange * 0.5) break;
            var (health, speed) = EnemyStats(EnemyCatalog.Get(EnemyKind.Ashling));
            var raised = new EnemyState(++enemyId, remains.Position, EnemyCatalog.Get(EnemyKind.Ashling).Radius, health, speed, EnemyKind.Ashling)
            {
                Revived = true,
            };
            raised.Health = raised.MaxHealth * AshPriestBehaviorState.RevivedHealthFraction;
            enemies.Add(raised);
            ashRemains.Remove(remains);
            encounterRevives++;
        }
    }

    private Vector2D? NearestRemains(Vector2D position, double range)
    {
        Vector2D? nearest = null;
        var best = range;
        foreach (var remains in ashRemains)
        {
            var distance = Vector2D.Distance(remains.Position, position);
            if (distance > best) continue;
            best = distance;
            nearest = remains.Position;
        }
        return nearest;
    }

    private Vector2D? PackCenter(EnemyState priest)
    {
        double x = 0, y = 0;
        var count = 0;
        foreach (var ally in enemies)
        {
            if (ally == priest || ally.Kind == EnemyKind.AshPriest || IsReliquaryKind(ally.Kind) || Vector2D.Distance(ally.Position, priest.Position) > PriestPackRadius) continue;
            x += ally.Position.X;
            y += ally.Position.Y;
            count++;
        }
        return count == 0 ? null : new Vector2D(x / count, y / count);
    }

    private Vector2D? WardFor(EnemyState penitent)
    {
        EnemyState? ward = null;
        var best = PenitentWardRange;
        foreach (var ally in enemies)
        {
            if (ally.Kind is not (EnemyKind.AshPriest or EnemyKind.AshSlinger) || ally.Health <= 0) continue;
            var distance = Vector2D.Distance(ally.Position, penitent.Position);
            if (distance > best) continue;
            best = distance;
            ward = ally;
        }
        return ward?.Position;
    }

    private IReadOnlyList<AshRemainsRenderSnapshot> CreateAshRemainsSnapshots() => ashRemains
        .Select(remains => new AshRemainsRenderSnapshot(remains.Position.X, remains.Position.Y, Math.Clamp(remains.Life / AshRemainsSeconds, 0, 1)))
        .ToArray();

    private sealed class AshRemainsState(Vector2D position, double life)
    {
        public Vector2D Position { get; } = position;

        public double Life { get; set; } = life;
    }
}
