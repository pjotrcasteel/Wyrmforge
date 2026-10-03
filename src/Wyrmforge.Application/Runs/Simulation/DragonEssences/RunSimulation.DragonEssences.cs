using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateDragonEssenceEffects(double delta, bool moving)
    {
        foreach (var burst in essenceBursts) burst.Life -= delta;
        essenceBursts.RemoveAll(burst => burst.Life <= 0);
        foreach (var bolt in essenceBolts) bolt.Life -= delta;
        essenceBolts.RemoveAll(bolt => bolt.Life <= 0);

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

        var target = NearestTarget(player.Position, CombatTargets());
        if (target is null) return;
        var damage = 34 * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier;
        essenceBolts.Add(new EssenceBoltState(player.Position, target.Position, 0.18));
        DamageTarget(target, damage);
        ashenWingCooldown = 1.2;
    }

    private void ApplyDragonEssenceCastEffects()
    {
        if (!build.DragonEssences.Contains(DragonEssenceId.CinderHeart) || castCount % 6 != 0) return;
        const double radius = 125;
        var damage = 56 * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier;
        essenceBursts.Add(new EssenceBurstState(player.Position, radius, 0.24));
        foreach (var target in CombatTargets().Where(target => Vector2D.Distance(player.Position, target.Position) <= radius).ToArray()) DamageTarget(target, damage);
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
