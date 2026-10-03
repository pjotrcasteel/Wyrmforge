using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private double chargedScaleCooldown;
    private double tempestWingMovementTime;
    private bool tempestWingCharged;

    private void UpdateDragonEssenceEffects(double delta, bool moving)
    {
        foreach (var burst in essenceBursts) burst.Life -= delta;
        essenceBursts.RemoveAll(burst => burst.Life <= 0);
        foreach (var bolt in essenceBolts) bolt.Life -= delta;
        essenceBolts.RemoveAll(bolt => bolt.Life <= 0);
        chargedScaleCooldown = Math.Max(0, chargedScaleCooldown - delta);

        UpdateAshenWing(delta, moving);
        UpdateTempestWing(delta, moving);
    }

    private void UpdateAshenWing(double delta, bool moving)
    {
        if (!build.DragonEssences.Contains(DragonEssenceId.AshenWing)) return;
        if (!moving)
        {
            ashenWingMovementTime = 0;
            return;
        }

        ashenWingMovementTime += delta;
        if (ashenWingMovementTime < 0.6) return;
        ashenWingCooldown -= delta;
        if (ashenWingCooldown > 0 || !HasCombatTargets) return;

        var target = NearestTarget(player.Position);
        if (target is null) return;
        var damage = 34 * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier;
        essenceBolts.Add(new EssenceBoltState(player.Position, target.Position, 0.18));
        DamageTarget(target, damage);
        ashenWingCooldown = 1.2;
    }

    private void UpdateTempestWing(double delta, bool moving)
    {
        if (!build.DragonEssences.Contains(DragonEssenceId.TempestWing) || tempestWingCharged) return;
        if (!moving)
        {
            tempestWingMovementTime = 0;
            return;
        }

        tempestWingMovementTime += delta;
        if (tempestWingMovementTime >= StormEssenceProfile.TempestWingChargeSeconds) tempestWingCharged = true;
    }

    private void ApplyDragonEssenceCastEffects()
    {
        if (build.DragonEssences.Contains(DragonEssenceId.CinderHeart) && castCount % 6 == 0)
        {
            const double radius = 125;
            var damage = 56 * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier;
            essenceBursts.Add(new EssenceBurstState(player.Position, radius, 0.24));

            foreach (var enemy in enemies)
            {
                if (enemy.Health > 0 && Vector2D.Distance(player.Position, enemy.Position) <= radius) DamageTarget(enemy, damage);
            }

            if (dragon is { Health: > 0 } activeDragon && Vector2D.Distance(player.Position, activeDragon.Position) <= radius) DamageTarget(activeDragon, damage);
        }

        if (build.DragonEssences.Contains(DragonEssenceId.StormHeart) && castCount % StormEssenceProfile.StormHeartCastInterval == 0)
        {
            CastChainLightning(1, player.Position, StormEssenceProfile.StormHeartDamageScale, StormEssenceProfile.StormHeartBonusJumps);
        }
    }

    private bool ConsumeTempestWingEcho()
    {
        if (!tempestWingCharged) return false;
        tempestWingCharged = false;
        tempestWingMovementTime = 0;
        return true;
    }

    private double ApplyChargedScale(double rawDamage)
    {
        if (!build.DragonEssences.Contains(DragonEssenceId.ChargedScale) || chargedScaleCooldown > 0 || rawDamage <= StormEssenceProfile.ChargedScaleHeavyHitThreshold)
        {
            return rawDamage;
        }

        chargedScaleCooldown = StormEssenceProfile.ChargedScaleCooldownSeconds;
        RegisterElementalImpact(player.Position, SpellId.ChainLightning);
        return rawDamage * StormEssenceProfile.ChargedScaleDamageMultiplier;
    }

    private void ApplyDragonEssenceImpactEffects(ICombatTarget target, double damage, ref bool killed)
    {
        if (!build.DragonEssences.Contains(DragonEssenceId.MoltenFang)) return;
        const double radius = 78;
        essenceBursts.Add(new EssenceBurstState(target.Position, radius, 0.2));
        if (!killed) killed = DamageTarget(target, damage * 0.25);
        Splash(target.Position, damage * 0.35, radius, target.Id);
    }

    private sealed class EssenceBurstState(Vector2D position, double radius, double life)
    {
        public Vector2D Position { get; } = position;

        public double Radius { get; } = radius;

        public double Life { get; set; } = life;
    }

    private sealed class EssenceBoltState(Vector2D from, Vector2D to, double life)
    {
        public Vector2D From { get; } = from;

        public Vector2D To { get; } = to;

        public double Life { get; set; } = life;
    }
}
