using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Progression.Signature;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private const double BurningGroundDamageFraction = 0.12;
    private readonly List<BurningGroundState> burningGrounds = [];

    private void RegisterBurningGround(ProjectileState projectile, Vector2D position)
    {
        if (projectile.Spell != SpellId.FireBolt) return;
        var hasScorchedEarth = (projectile.FireballMutationMask &
            (1 << ((int)FireballMutationId.ScorchedEarth - 1))) != 0;
        // Scorched Earth works even without Detonation. Preserve the pre-existing
        // Rank II+ Fireball ground field when another legitimate splash exists.
        if (!hasScorchedEarth && (projectile.Rank < 2 || projectile.SplashRadius <= 0)) return;
        var duration = hasScorchedEarth
            ? buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.MutationDuration, 1) *
                FireballEffectFactor(Wyrmforge.Domain.Progression.Signature.FireballMutationId.ScorchedEarth,
                    Wyrmforge.Domain.Progression.PassiveTree.MutationEffectCapability.Duration) : 1;
        var radius = hasScorchedEarth
            ? buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.MutationRadius, 1) : 1;
        var damagePerTick = buildModifiers.Apply(Wyrmforge.Domain.Combat.Modifiers.BuildStatId.BurnDamage,
            projectile.Damage * BurningGroundDamageFraction);
        burningGrounds.Add(new BurningGroundState(position, damagePerTick, duration, radius)
        {
            FireballMutationMask = projectile.FireballMutationMask,
        });
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
            ground.Position.X, ground.Position.Y, ground.EffectiveRadius, ground.RemainingSeconds)
        {
            FireballMutationMask = ground.FireballMutationMask,
        }).ToArray();

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
