using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double BurningGroundDamageFraction = 0.12;
    private readonly List<BurningGroundState> burningGrounds = [];

    private void RegisterBurningGround(ProjectileState projectile, Vector2D position)
    {
        if (projectile.Spell != SpellId.FireBolt || projectile.SplashRadius <= 0) return;
        // Detonation alone grants an explosion, not a free persistent hazard at Rank I.
        // Keep existing Rank II+ Fireball behavior, while Scorched Earth enables ground fire at Rank I.
        if (projectile.Rank < 2 && !HasFireballMutation(Wyrmforge.Domain.Progression.Signature.FireballMutationId.ScorchedEarth)) return;
        var hasScorchedEarth = HasFireballMutation(Wyrmforge.Domain.Progression.Signature.FireballMutationId.ScorchedEarth);
        var duration = hasScorchedEarth
            ? buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.MutationDuration, 1) *
                FireballEffectFactor(Wyrmforge.Domain.Progression.Signature.FireballMutationId.ScorchedEarth,
                    Wyrmforge.Domain.Progression.PassiveTree.MutationEffectCapability.Duration) : 1;
        var radius = hasScorchedEarth
            ? buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.MutationRadius, 1) : 1;
        var damagePerTick = buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.BurnDamage,
            projectile.Damage * BurningGroundDamageFraction);
        burningGrounds.Add(new BurningGroundState(position, damagePerTick, duration, radius));
    }

    private void UpdateBurningGrounds(double delta)
    {
        foreach (var ground in burningGrounds)
        {
            var ticks = ground.Advance(delta);
            for (var tick = 0; tick < ticks; tick++)
            {
                combatSpatialIndex.CollectWithinRadius(ground.Position, ground.EffectiveRadius, int.MinValue, spatialQueryBuffer);
                foreach (var target in spatialQueryBuffer) DamageTarget(target, ground.DamagePerTick);
            }
        }

        // Ground fire follows actual prop geometry, not a decorative overlay.
        // A wooden object retains its own fire once ignited, even after the
        // originating C# ground zone has expired.
        if (arenaEnvironment is { } environment)
        {
            foreach (var ground in burningGrounds)
            {
                environment.IgnitePropsInRadius(ground.Position, arenaWidth, arenaHeight, ground.EffectiveRadius);
                environment.IgniteGroundFuelInRadius(ground.Position, arenaWidth, arenaHeight, ground.EffectiveRadius);
            }
            environment.AdvanceBurningProps(delta);
            environment.AdvanceGroundFuel(delta);
        }

        burningGrounds.RemoveAll(ground => ground.IsExpired);
    }

    private IReadOnlyList<BurningGroundRenderSnapshot> CreateBurningGroundSnapshots() =>
        burningGrounds.Select(ground => new BurningGroundRenderSnapshot(
            ground.Position.X, ground.Position.Y, ground.EffectiveRadius, ground.RemainingSeconds)).ToArray();

    private IReadOnlyList<EssenceBurstRenderSnapshot> CreateFieryAreaSnapshots()
    {
        var snapshots = new EssenceBurstRenderSnapshot[essenceBursts.Count + burningGrounds.Count];
        var index = 0;
        foreach (var burst in essenceBursts) snapshots[index++] = new EssenceBurstRenderSnapshot(burst.Position.X, burst.Position.Y, burst.Radius, burst.Life);
        foreach (var ground in burningGrounds)
        {
            snapshots[index++] = new EssenceBurstRenderSnapshot(
                ground.Position.X,
                ground.Position.Y,
                ground.EffectiveRadius,
                Math.Min(0.2, ground.RemainingSeconds));
        }
        return snapshots;
    }
}
