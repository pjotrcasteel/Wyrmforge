using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<RelicDefeatBurst> pendingRelicBursts = new();
    private readonly Dictionary<RelicId, RelicPayoffTotals> relicPayoffs = [];

    private void QueueRelicDefeatBursts(EnemyState enemy)
    {
        foreach (var id in build.Relics.Equipped)
        {
            if (RelicCatalog.Get(id).DefeatBurst is not { } profile || !profile.Matches(enemy.Statuses)) continue;
            var school = profile.Status == CombatStatusId.Burning ? SpellSchool.Fire : SpellSchool.Frost;
            var damage = buildModifiers.Apply(BuildStatId.Damage, profile.Damage * passiveProfile.DamageMultiplier) * build.SchoolDamageMultiplier(school);
            pendingRelicBursts.Enqueue(new(id, enemy.Id, enemy.Position, profile, damage));
        }
    }

    private void ResolveRelicDefeatBursts()
    {
        // Queue, rather than recurse: each enemy can die once, and nested bursts cannot overwrite the shared spatial query buffer.
        while (pendingRelicBursts.TryDequeue(out var burst))
        {
            if (!relicPayoffs.TryGetValue(burst.Relic, out var totals)) relicPayoffs[burst.Relic] = totals = new();
            totals.Bursts++;
            RegisterSplashPulse(burst.Position, burst.Profile.Radius);
            if (burst.Profile.Status == CombatStatusId.Chilled) RegisterFrostNovaFeedback(burst.Position, burst.Profile.Radius);
            else RegisterElementalImpact(burst.Position, SpellId.FireBolt);
            combatSpatialIndex.CollectWithinRadius(burst.Position, burst.Profile.Radius, burst.TargetId, spatialQueryBuffer);
            foreach (var target in spatialQueryBuffer)
            {
                if (target is DragonState && !dragonHuntState.CanTargetDragon) continue;
                var healthBefore = Math.Max(0, target.Health);
                if (healthBefore <= 0) continue;
                // Seed the next link before damage. Wyrms retain their existing status resistance and phase protection.
                ApplyStatus(target, burst.Profile.Status, burst.Profile.SpreadSeconds);
                var killed = DamageTarget(target, burst.Damage);
                totals.Damage += Math.Max(0, healthBefore - Math.Max(0, target.Health));
                if (killed) totals.Kills++;
            }
        }
    }

    private RunRelicSummary CreateRelicSummary(RelicId id)
    {
        relicPayoffs.TryGetValue(id, out var totals);
        return new(id, build.Relics.IsEquipped(id)) { Bursts = totals?.Bursts ?? 0, BurstDamage = totals?.Damage ?? 0, BurstKills = totals?.Kills ?? 0 };
    }

    private sealed record RelicDefeatBurst(RelicId Relic, int TargetId, Vector2D Position, RelicBurstProfile Profile, double Damage);

    private sealed class RelicPayoffTotals
    {
        public int Bursts { get; set; }
        public double Damage { get; set; }
        public int Kills { get; set; }
    }
}
