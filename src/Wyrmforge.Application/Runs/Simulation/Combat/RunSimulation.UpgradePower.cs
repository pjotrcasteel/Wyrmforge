using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double UpgradeFreezeSeconds = 0.85;
    private const double UpgradeKnockbackRadius = 180;
    private const double UpgradePulseSeconds = 0.55;
    private double powerBurstRemaining;
    private Vector2D powerBurstPosition;

    private void ReleaseUpgradePower()
    {
        powerBurstPosition = player.Position;
        powerBurstRemaining = UpgradePulseSeconds;
        RecordUpgradePulse(UpgradeFreezeSeconds);
        foreach (var enemy in enemies.Where(enemy => enemy.Health > 0))
        {
            ApplyFreeze(enemy, UpgradeFreezeSeconds);
            var distance = Vector2D.Distance(player.Position, enemy.Position);
            var push = 100 * Math.Max(0, 1 - distance / UpgradeKnockbackRadius);
            var direction = distance < 0.001 ? new Vector2D(1, 0) : Vector2D.DirectionTo(player.Position, enemy.Position);
            // The shove respects the arena: an enemy pushed through the world edge or into rock could never be reached or targeted again.
            var previous = enemy.Position;
            var proposed = previous + direction * push;
            proposed = new Vector2D(Math.Clamp(proposed.X, enemy.Radius, Math.Max(enemy.Radius, arenaWidth - enemy.Radius)),
                Math.Clamp(proposed.Y, enemy.Radius, Math.Max(enemy.Radius, arenaHeight - enemy.Radius)));
            enemy.Position = mapState.EncounterActive && arenaEnvironment is not null
                ? arenaEnvironment.RestrictMovement(previous, proposed, arenaWidth, arenaHeight, enemy.Radius) : proposed;
        }
        if (dragon is { Health: > 0 }) ApplyFreeze(dragon, UpgradeFreezeSeconds);
        RebuildCombatSpatialIndex();
    }

    private SplashPulseRenderSnapshot? CreatePowerBurstSnapshot() => powerBurstRemaining <= 0 ? null
        : new(powerBurstPosition.X, powerBurstPosition.Y, UpgradeKnockbackRadius, 1 - powerBurstRemaining / UpgradePulseSeconds);
}
