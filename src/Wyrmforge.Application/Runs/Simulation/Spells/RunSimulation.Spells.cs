using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateSpellcasting(double delta, bool moving)
    {
        // Only the focused spell owns a cast clock. Learned spells are combination knowledge.
        var spell = SpellCatalog.Get(build.Spells.ActiveSpell);
        var rank = build.Spells[spell.Id];
        spellCooldowns[spell.Id] -= delta;
        // The contextual spell is judged every tick so a defence is never starved by the primary, but it spends the primary's cast.
        if (TryCastContextualSpell(delta, spell, rank, moving)) return;
        if (spellCooldowns[spell.Id] > 0 || (!manualAimEngaged && PrimaryTarget(player.Position) is null)) return;
        CastSpell(spell, rank, FocusedCastProfile.For(spell.Id, rank).DamageMultiplier, false);
        spellCooldowns[spell.Id] = GetSpellCooldown(spell, rank, moving);
    }

    private double GetSpellCooldown(SpellDefinition spell, int rank, bool moving)
    {
        var lightningFormMultiplier = passiveProfile.LightningForm && moving ? 1 / 1.5 : 1;
        var evolution = EvolutionProfile(spell.Id);
        var baseCooldown = spell.Ability.CalculateCooldownSeconds(rank) * passiveProfile.CastIntervalMultiplier * evolution.CastIntervalMultiplier;
        return buildModifiers.Apply(BuildStatId.CastInterval, baseCooldown) * lightningFormMultiplier;
    }

    private void CastSpell(SpellDefinition spell, int rank, double damageScale, bool echo)
    {
        var surge = FocusedSurgeProfile.Identity;
        if (!echo)
        {
            primaryCastCounts[spell.Id]++;
            surge = FocusedSurgeProfile.For(primaryCastCounts[spell.Id], rank);
            if (surge.IsSurge) FocusedSurgesCast++;
            var direction = Math.Atan2(effectiveAim.Y, effectiveAim.X);
            lastCastMotion = new CastMotionRenderSnapshot(player.Position.X, player.Position.Y, spell.Id, rank,
                SpellCombinationResolver.ActiveFor(spell.Id, build.Spells, build.Synergies), direction, 0) { Surge = surge.IsSurge };
            lastCastMotionStartedAt = elapsed;
            castCount++;
            if (spell.Ability.Delivery is ProjectileAbilityProfile) projectileCastCount++;
            ApplyDragonEssenceCastEffects();
        }

        var focusedDamageScale = damageScale * surge.DamageMultiplier;
        switch (spell.Ability.Delivery)
        {
            case ProjectileAbilityProfile projectile:
                CastProjectileSpell(spell, projectile, rank, focusedDamageScale, surge);
                break;
            case ChainAbilityProfile chain:
                var focusedChain = chain with { BaseJumpsAtRankOne = chain.BaseJumpsAtRankOne + FocusedCastProfile.For(spell.Id, rank).BonusChains };
                CastChainSpell(spell, focusedChain, rank, player.Position, focusedDamageScale,
                    combination: SpellCombinationResolver.ActiveFor(spell.Id, build.Spells, build.Synergies), surge: surge, primary: true);
                break;
            default:
                throw new InvalidOperationException($"Unsupported delivery profile {spell.Ability.Delivery.GetType().Name} for {spell.Id}.");
        }

        if (echo) return;
        if (ConsumeTempestWingEcho()) CastSpell(spell, rank, damageScale * StormEssenceProfile.TempestWingEchoDamageScale, true);
        foreach (var echoScale in PassiveEffectResolver.ResolveArcaneEchoScales(passiveProfile, castCount))
        {
            CastSpell(spell, rank, damageScale * echoScale, true);
        }

        var rules = ResolveBuildRules(new CombatRuleContext(CombatRuleTrigger.Cast, castCount, spell.Id, spell.School));
        foreach (var rule in rules)
        {
            if (rule.Effect is EchoCastRuleEffect echoEffect) CastSpell(spell, rank, damageScale * echoEffect.DamageMultiplier, true);
        }
    }

    private void CastProjectileSpell(SpellDefinition spell, ProjectileAbilityProfile profile, int rank, double damageScale, FocusedSurgeProfile surge)
    {
        var target = PrimaryTarget(player.Position);
        if (target is null && !manualAimEngaged) return;
        var id = spell.Id;
        var focused = FocusedCastProfile.For(id, rank);
        var evolution = EvolutionProfile(id);
        var inferno = passiveProfile.Inferno && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var prismatic = passiveProfile.Prismatic && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var baseCount = prismatic ? passiveProfile.AstralBarrage ? 5 : 3 : 1;
        var count = baseCount + buildModifiers.ApplyInt(BuildStatId.ExtraProjectiles) + evolution.ExtraProjectiles;
        var volleyTargets = prismatic && !manualAimEngaged ? NearestTargets(player.Position, count) : Array.Empty<ICombatTarget>();
        var baseDirection = effectiveAim;
        var meteorHeart = id == SpellId.FireBolt && HasFireballMutation(FireballMutationId.MeteorHeart);
        var baseSpeed = profile.CalculateSpeed(rank) * passiveProfile.ProjectileSpeedMultiplier * evolution.ProjectileSpeedMultiplier;
        var speed = buildModifiers.Apply(BuildStatId.ProjectileSpeed, baseSpeed) * (meteorHeart ? 0.75 : 1);
        var baseDamage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * evolution.DamageMultiplier;
        var damage = buildModifiers.Apply(BuildStatId.Damage, baseDamage) * damageScale * build.SchoolDamageMultiplier(spell.School) * (meteorHeart ? 1.15 : 1);
        var chains = (passiveProfile.LivingStorm ? 4 : passiveProfile.Chainstorm ? 1 : 0) + buildModifiers.ApplyInt(BuildStatId.BonusChains);
        var piercingArcaneOrb = id == SpellId.ArcaneOrb && rank >= 2;
        var masteredArcaneOrb = id == SpellId.ArcaneOrb && rank >= spell.MaxRank;
        var masteredFrostShard = id == SpellId.FrostShard && FrostShardMastery.IsActive(rank);
        var status = CreateProjectileStatus(spell, rank);

        for (var index = 0; index < count; index++)
        {
            var volleyTarget = volleyTargets.Count > 0 ? volleyTargets[index % volleyTargets.Count] : target;
            var offset = prismatic || count == 1 ? 0 : (index - (count - 1) / 2d) * 0.16;
            var aimedDirection = manualAimEngaged || volleyTarget is null ? baseDirection : Vector2D.DirectionTo(player.Position, volleyTarget.Position);
            var direction = Vector2D.Rotate(prismatic ? aimedDirection : baseDirection, offset);
            var baseRadius = inferno ? 9 : masteredArcaneOrb ? 7 : profile.Radius;
            var radius = baseRadius * evolution.ProjectileRadiusMultiplier * focused.RadiusMultiplier * surge.RadiusMultiplier * (meteorHeart ? 1.45 : 1);
            var pierces = (piercingArcaneOrb ? 1 : 0) + (passiveProfile.ArcaneReservoir ? 1 : 0) + evolution.BonusPierces + focused.BonusPierces + surge.BonusPierces;
            var masterySplash = id == SpellId.FireBolt && rank >= spell.MaxRank ? 56 : 0;
            var masteryNova = masteredFrostShard ? FrostShardMastery.NovaRadius : 0;
            var mutationSplash = id != SpellId.FireBolt ? 0 :
                HasFireballMutation(FireballMutationId.Detonation) ? 46 :
                HasFireballMutation(FireballMutationId.ScorchedEarth) ? 8 : 0;
            var effects = new ProjectileEffects(
                inferno,
                chains + evolution.BonusChains,
                Math.Max(mutationSplash, Math.Max(surge.SplashRadius, Math.Max(focused.SplashRadius, Math.Max(masterySplash, evolution.SplashRadius)))),
                status,
                pierces,
                Math.Max(masteryNova, evolution.FrostNovaRadius))
            {
                Combination = SpellCombinationResolver.ActiveFor(id, build.Spells, build.Synergies),
                Rank = rank,
                Surge = surge.IsSurge,
                AdditionalStatuses = SpellCombinationResolver.Resolve(id, build.Spells, build.Synergies),
            };
            projectiles.Add(new ProjectileState(player.Position, direction * speed, radius, damage * (inferno ? 4 : 1), id, effects));
        }
    }

    private void CastChainLightning(int rank, Vector2D origin, double damageScale, int bonusJumps = 0)
    {
        var spell = SpellCatalog.Get(SpellId.ChainLightning);
        if (spell.Ability.Delivery is not ChainAbilityProfile chain) throw new InvalidOperationException("Chain Lightning must use chain delivery.");
        CastChainSpell(spell, chain, rank, origin, damageScale, bonusJumps);
    }

    private void CastChainSpell(SpellDefinition spell, ChainAbilityProfile profile, int rank, Vector2D origin, double damageScale,
        int bonusJumps = 0, SynergyId? combination = null, FocusedSurgeProfile? surge = null, bool primary = false)
    {
        var current = origin;
        var surgeProfile = surge ?? FocusedSurgeProfile.Identity;
        var evolution = EvolutionProfile(spell.Id);
        var baseDamage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * evolution.DamageMultiplier;
        var damage = buildModifiers.Apply(BuildStatId.Damage, baseDamage) * damageScale * build.SchoolDamageMultiplier(spell.School);
        var jumps = profile.CalculateJumps(rank) + buildModifiers.ApplyInt(BuildStatId.BonusChains) + bonusJumps + evolution.BonusChains + surgeProfile.BonusChains;
        var falloff = Math.Min(1, profile.DamageFalloff * evolution.ChainFalloffMultiplier);
        var hit = new HashSet<int>();
        var bonusJumpsTriggered = false;
        var forkPending = spell.Id == SpellId.ChainLightning && ChainLightningMastery.IsActive(rank);

        for (var jump = 0; jump < jumps; jump++)
        {
            var target = jump == 0 && primary ? PrimaryTarget(current, manualAimEngaged) : NearestTarget(current, hit);
            if (target is null) break;
            hit.Add(target.Id);
            hitCount++;
            lightning.Add(new LightningTrace(current, target.Position, 0.12));
            var hitDamage = ApplyChainInteractions(spell.Id, target, damage, ref jumps, ref bonusJumpsTriggered);
            RegisterElementalImpact(target.Position, spell.Id, rank, combination, surgeProfile.IsSurge);
            var killed = DamageTarget(target, hitDamage);
            if (!killed) ApplyAbilityStatus(spell, rank, target, firstLink: jump == 0);
            if (!killed) ApplyHitRules(spell.Id, target);

            if (forkPending)
            {
                CastChainFork(spell, rank, target.Position, damage, hit, ref jumps, ref bonusJumpsTriggered, combination, surgeProfile.IsSurge);
                forkPending = false;
            }

            current = target.Position;
            damage *= falloff;
        }
    }

    private void CastChainFork(SpellDefinition spell, int rank, Vector2D origin, double damage, HashSet<int> hit, ref int jumps,
        ref bool bonusJumpsTriggered, SynergyId? combination, bool surged)
    {
        var target = NearestTarget(origin, hit);
        if (target is null) return;
        hit.Add(target.Id);
        hitCount++;
        lightning.Add(new LightningTrace(origin, target.Position, 0.16));
        var forkDamage = ApplyChainInteractions(spell.Id, target, ChainLightningMastery.CalculateForkDamage(damage), ref jumps, ref bonusJumpsTriggered);
        RegisterElementalImpact(target.Position, spell.Id, rank, combination, surged);
        var killed = DamageTarget(target, forkDamage);
        if (!killed) ApplyAbilityStatus(spell, rank, target, firstLink: false);
        if (!killed) ApplyHitRules(spell.Id, target);
    }

    private SpellEvolutionProfile EvolutionProfile(SpellId spell)
    {
        var evolution = build.Evolutions.For(spell);
        return evolution is { } id ? SpellEvolutionCatalog.Get(id).Profile : SpellEvolutionProfile.Identity;
    }

    private double ApplyChainInteractions(SpellId spellId, ICombatTarget target, double damage, ref int jumps, ref bool bonusJumpsTriggered)
    {
        var interactions = ResolveStatusInteractions(spellId, target);
        if (interactions.Count > 0) RecordReaction();
        foreach (var interaction in interactions) damage *= interaction.DamageMultiplier;
        if (bonusJumpsTriggered) return damage;

        var bonusJumps = interactions.Sum(interaction => interaction.BonusJumps);
        if (bonusJumps <= 0) return damage;
        jumps += bonusJumps;
        bonusJumpsTriggered = true;
        return damage;
    }
}
