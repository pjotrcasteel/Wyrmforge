using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateProjectiles(double delta, double width, double height)
    {
        foreach (var projectile in projectiles) projectile.Position += projectile.Velocity * delta;
        projectiles.RemoveAll(projectile => !IsOnScreen(projectile.Position, width, height, 80));
    }

    private void UpdateLightning(double delta)
    {
        foreach (var trace in lightning) trace.Life -= delta;
        lightning.RemoveAll(trace => trace.Life <= 0);
    }

    private void ResolveProjectileHits()
    {
        HashSet<ProjectileState>? consumed = null;
        List<ProjectileState>? spawned = null;
        foreach (var projectile in projectiles)
        {
            var target = FirstCollidingTarget(projectile.Position, projectile.Radius, projectile.IgnoredTargetId);
            if (target is null) continue;
            hitCount++;
            var damage = projectile.Damage;
            var interactions = ResolveStatusInteractions(projectile.Spell, target);
            if (interactions.Count > 0) RecordReaction();
            foreach (var interaction in interactions) damage *= interaction.DamageMultiplier;
            var detonation = PassiveEffectResolver.ResolveDetonation(passiveProfile, hitCount);
            if (detonation is not null) damage *= detonation.DamageMultiplier;
            if (passiveProfile.AbsoluteZero && target.Statuses.Has(CombatStatusId.Frozen)) damage *= PassiveEffectResolver.AbsoluteZeroDamageMultiplier;

            RegisterElementalImpact(target.Position, projectile.Spell, projectile.Rank, projectile.Combination, projectile.Surge);
            RegisterBurningGround(projectile, target.Position);
            RegisterFrostNova(projectile, target.Position, target.Id);
            var spawnedForHit = projectile.ChainsLeft > 0 ? spawned ??= [] : null;
            // The source point sits one second back along the flight path, so the shield reads where the shot came from.
            var shield = ShieldMultiplier(target, projectile.Position - projectile.Velocity, damage);
            var killed = DamageTarget(target, damage * shield, projectile, spawnedForHit);
            if (detonation is not null) Splash(target.Position, damage, detonation.Radius, target.Id);
            ApplyDragonEssenceImpactEffects(target, damage, ref killed);
            if (!killed) ApplyProjectileStatus(projectile, target);
            if (!killed) ApplyHitRules(projectile.Spell, target);

            if (projectile.SplashRadius > 0) Splash(target.Position, damage * 0.4, projectile.SplashRadius, target.Id);
            foreach (var interaction in interactions)
            {
                if (interaction.SplashRadius > 0 && interaction.SplashDamageMultiplier > 0 && TrySpendReactionEvent())
                {
                    Splash(target.Position, damage * interaction.SplashDamageMultiplier, interaction.SplashRadius, target.Id);
                }
            }
            if (passiveProfile.Wildfire) Splash(target.Position, damage * 0.35, passiveProfile.Volcanic ? 90 : 64, target.Id);

            if (projectile.Spell == SpellId.ArcaneOrb)
            {
                arcaneHitCount++;
                if (build.Synergies.Contains(SynergyId.ArcaneConduit) && arcaneHitCount % 4 == 0 && TrySpendReactionEvent())
                {
                    RecordReaction();
                    CastChainLightning(1, target.Position, 0.55, 1);
                }
            }
            if (!projectile.ContinueAfterHit(target.Id)) (consumed ??= []).Add(projectile);
        }
        if (consumed is not null) projectiles.RemoveAll(consumed.Contains);
        if (spawned is not null) projectiles.AddRange(spawned);
    }

    private void ApplyHitRules(SpellId spellId, ICombatTarget target)
    {
        var spell = SpellCatalog.Get(spellId);
        var rules = ResolveBuildRules(new CombatRuleContext(CombatRuleTrigger.Hit, hitCount, spellId, spell.School, target.Statuses));
        var statusApplied = false;
        foreach (var rule in rules)
        {
            if (rule.Effect is not ApplyStatusRuleEffect statusEffect) continue;
            ApplyStatus(target, statusEffect.Status, statusEffect.DurationSeconds);
            statusApplied = true;
        }
        if (!statusApplied && passiveProfile.DeepFreeze && hitCount % PassiveEffectResolver.DeepFreezeHitInterval == 0)
        {
            ApplyFreeze(target, PassiveEffectResolver.DeepFreezeDurationSeconds);
        }
    }

    private bool DamageTarget(ICombatTarget target, double damage, ProjectileState? source = null, List<ProjectileState>? spawned = null)
    {
        if (target.Health <= 0 || damage <= 0) return false;
        if (target is DragonState protectedDragon)
        {
            if (!dragonHuntState.CanTargetDragon) return false;
            if (dragonHuntState.TryStartPhaseBreakForDamage(protectedDragon.Health, damage, protectedDragon.MaxHealth))
            {
                protectedDragon.Health = protectedDragon.MaxHealth * 0.5;
                RegisterTargetHit(protectedDragon);
                BeginDragonPhaseBreak(protectedDragon);
                return false;
            }
        }

        if (target is EnemyState { Kind: EnemyKind.Reliquary } && reliquaryWards.Count > 0) damage *= ReliquaryWardedDamageMultiplier;
        if (target is EnemyState { Kind: EnemyKind.ReliquaryOfGlass } glassTarget)
        {
            if (crystalWards.Count > 0) damage *= GlassWardedDamageMultiplier;
            TryBreakGlassVeil(glassTarget);
        }
        // Phase gate (Hades' bosses, Monster Hunter's topple): no burst skips the crack. Overflow past half health is discarded;
        // reaching half health starts the stagger at once (below), and the stagger itself is a free damage window.
        if (target is EnemyState { BellWarden: { Cracked: false, Phase: not BellWardenPhase.Crack } } gated)
            damage = Math.Min(damage, Math.Max(0, gated.Health - gated.MaxHealth * BellWardenBehaviorState.CrackHealthFraction));
        if (target is EnemyState { WinterBell: { DeepWinter: false, Phase: not BellOfWinterPhase.Rime } } riming)
            damage = Math.Min(damage, Math.Max(0, riming.Health - riming.MaxHealth * BellOfWinterBehaviorState.RimeHealthFraction));
        if (target is EnemyState frostDefended) damage = ApplyFrostDefenses(frostDefended, damage);
        if (damage <= 0)
        {
            RegisterTargetHit(target);
            return false;
        }
        var shatters = source is not null && FrostShatter.Triggers(source.Spell, target.Statuses.Has(CombatStatusId.Frozen));
        target.Health -= damage;
        if (target is EnemyState { BellWarden: { } bell } cracking && bell.TryBeginCrack(cracking.Health, cracking.MaxHealth)) BellWardenCracks++;
        if (target is EnemyState { WinterBell: { } winter } rimed && winter.TryBeginRime(rimed.Health, rimed.MaxHealth)) BeginWinterRime();
        RegisterTargetHit(target);
        if (target.Health > 0) return false;

        switch (target)
        {
            case EnemyState { Kind: EnemyKind.Reliquary or EnemyKind.ReliquaryWard or EnemyKind.ReliquaryOfGlass or EnemyKind.CrystalWard } rite:
                ResolveReliquaryDeath(rite);
                break;
            case EnemyState { Kind: EnemyKind.GlassFalseForm } falseForm:
                // The wrong body: it breaks like glass and pays nothing.
                RegisterEnemyDeath(falseForm);
                glassFalseForms.Remove(falseForm);
                break;
            case EnemyState { Kind: EnemyKind.MirrorDouble } reflection:
                // A false image breaks like glass: no kill, no payout, no record.
                RegisterEnemyDeath(reflection);
                break;
            case EnemyState { Kind: EnemyKind.BellWarden or EnemyKind.BellOfWinter } warden:
                ResolveBellWardenDeath(warden);
                break;
            case EnemyState defeatedEnemy:
                RecordControlledKill(defeatedEnemy);
                RegisterEnemyDeath(defeatedEnemy);
                RegisterSupportDeath(defeatedEnemy);
                RegisterFrostDeath(defeatedEnemy);
                kills++;
                RecordEnemyKill(defeatedEnemy.Kind);
                QueueRelicDefeatBursts(defeatedEnemy);
                var baseScore = 100 + (int)(elapsed * 2);
                score += (int)(baseScore * depthState.ScoreMultiplier);
                // A raised Ashling already paid out and counted toward the node; its second death is worth nothing extra.
                if (defeatedEnemy.Revived) break;
                experienceShards.Drop(defeatedEnemy.Position, ResolveEliteDefeat(defeatedEnemy, EnemyCatalog.Get(defeatedEnemy.Kind).ThreatCost));
                RegisterMapEncounterKill();
                RegisterDepthTrialKill();
                break;
            case DragonState defeatedDragon:
                DefeatDragon(defeatedDragon);
                break;
            default:
                throw new InvalidOperationException($"Unsupported combat target type {target.GetType().Name}.");
        }

        if (shatters && target is EnemyState shattered) Shatter(shattered.Position, FrostShatter.Damage(shattered.MaxHealth), shattered.Id);
        if (source is not null && source.ChainsLeft > 0 && spawned is not null) ChainFrom(target.Position, source, spawned);
        return true;
    }

    private void Splash(Vector2D position, double damage, double radius, int ignoreId)
    {
        RegisterSplashPulse(position, radius);
        combatSpatialIndex.CollectWithinRadius(position, radius, ignoreId, spatialQueryBuffer);
        foreach (var target in spatialQueryBuffer) DamageTarget(target, damage * ShieldMultiplier(target, position, damage));
    }

    private void Shatter(Vector2D position, double damage, int ignoreId)
    {
        FrostShatters++;
        RegisterFrostNovaFeedback(position, FrostShatter.Radius);
        Splash(position, damage, FrostShatter.Radius, ignoreId);
    }

    private void ChainFrom(Vector2D position, ProjectileState source, ICollection<ProjectileState> spawned)
    {
        var target = NearestTarget(position, minimumDistance: 12);
        if (target is null) return;
        var direction = Vector2D.DirectionTo(position, target.Position);
        var speed = source.Velocity.Length * 1.2;
        var effects = new ProjectileEffects(false, source.ChainsLeft - 1, source.SplashRadius, source.Status, 0, 0)
        {
            Combination = source.Combination,
            Rank = source.Rank,
            Surge = source.Surge,
            AdditionalStatuses = source.AdditionalStatuses,
        };
        spawned.Add(new ProjectileState(position, direction * speed, Math.Max(4, source.Radius - 1), source.Damage * 0.82, source.Spell, effects));
    }

    private static bool IsOnScreen(Vector2D position, double width, double height, double margin) => position.X >= -margin && position.Y >= -margin && position.X <= width + margin && position.Y <= height + margin;

    private sealed class LightningTrace(Vector2D from, Vector2D to, double life)
    {
        public Vector2D From { get; } = from;
        public Vector2D To { get; } = to;
        public double Life { get; set; } = life;
    }
}
