using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Stats;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateSpellcasting(double delta, bool moving)
    {
        foreach (var spell in SpellCatalog.All)
        {
            var rank = build.Spells[spell.Id];
            if (rank <= 0) continue;
            spellCooldowns[spell.Id] -= delta;
            if (spellCooldowns[spell.Id] > 0 || !HasCombatTargets) continue;
            CastSpell(spell, rank, 1, false);
            spellCooldowns[spell.Id] = GetSpellCooldown(spell, rank, moving);
        }
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
        if (!echo)
        {
            castCount++;
            if (spell.Ability.Delivery is ProjectileAbilityProfile) projectileCastCount++;
            ApplyDragonEssenceCastEffects();
        }

        switch (spell.Ability.Delivery)
        {
            case ProjectileAbilityProfile projectile:
                CastProjectileSpell(spell, projectile, rank, damageScale);
                break;
            case ChainAbilityProfile chain:
                CastChainSpell(spell, chain, rank, player.Position, damageScale);
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

    private void CastProjectileSpell(SpellDefinition spell, ProjectileAbilityProfile profile, int rank, double damageScale)
    {
        var target = NearestTarget(player.Position);
        if (target is null) return;
        var id = spell.Id;
        var evolution = EvolutionProfile(id);
        var inferno = passiveProfile.Inferno && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var prismatic = passiveProfile.Prismatic && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var baseCount = prismatic ? passiveProfile.AstralBarrage ? 5 : 3 : 1;
        var count = baseCount + buildModifiers.ApplyInt(BuildStatId.ExtraProjectiles) + evolution.ExtraProjectiles;
        var volleyTargets = prismatic ? NearestTargets(player.Position, count) : Array.Empty<ICombatTarget>();
        var baseDirection = Vector2D.DirectionTo(player.Position, target.Position);
        var baseSpeed = profile.CalculateSpeed(rank) * passiveProfile.ProjectileSpeedMultiplier * evolution.ProjectileSpeedMultiplier;
        var speed = buildModifiers.Apply(BuildStatId.ProjectileSpeed, baseSpeed);
        var baseDamage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * evolution.DamageMultiplier;
        var damage = buildModifiers.Apply(BuildStatId.Damage, baseDamage) * damageScale * build.SchoolDamageMultiplier(spell.School);
        var chains = (passiveProfile.LivingStorm ? 4 : passiveProfile.Chainstorm ? 1 : 0) + buildModifiers.ApplyInt(BuildStatId.BonusChains);
        var masteredArcaneOrb = id == SpellId.ArcaneOrb && rank >= spell.MaxRank;
        var masteredFrostShard = id == SpellId.FrostShard && FrostShardMastery.IsActive(rank);
        var status = CreateProjectileStatus(spell, rank);

        for (var index = 0; index < count; index++)
        {
            var volleyTarget = volleyTargets.Count > 0 ? volleyTargets[index % volleyTargets.Count] : target;
            var offset = prismatic || count == 1 ? 0 : (index - (count - 1) / 2d) * 0.16;
            var aimedDirection = Vector2D.DirectionTo(player.Position, volleyTarget.Position);
            var direction = Vector2D.Rotate(prismatic ? aimedDirection : baseDirection, offset);
            var baseRadius = inferno ? 9 : masteredArcaneOrb ? 7 : profile.Radius;
            var radius = baseRadius * evolution.ProjectileRadiusMultiplier;
            var pierces = (masteredArcaneOrb ? 1 : 0) + (passiveProfile.ArcaneReservoir ? 1 : 0) + evolution.BonusPierces;
            var masterySplash = id == SpellId.FireBolt && rank >= spell.MaxRank ? 56 : 0;
            var masteryNova = masteredFrostShard ? FrostShardMastery.NovaRadius : 0;
            var effects = new ProjectileEffects(
                inferno,
                chains + evolution.BonusChains,
                Math.Max(masterySplash, evolution.SplashRadius),
                status,
                pierces,
                Math.Max(masteryNova, evolution.FrostNovaRadius));
            projectiles.Add(new ProjectileState(player.Position, direction * speed, radius, damage * (inferno ? 4 : 1), id, effects));
        }
    }

    private void CastChainLightning(int rank, Vector2D origin, double damageScale, int bonusJumps = 0)
    {
        var spell = SpellCatalog.Get(SpellId.ChainLightning);
        if (spell.Ability.Delivery is not ChainAbilityProfile chain) throw new InvalidOperationException("Chain Lightning must use chain delivery.");
        CastChainSpell(spell, chain, rank, origin, damageScale, bonusJumps);
    }

    private void CastChainSpell(SpellDefinition spell, ChainAbilityProfile profile, int rank, Vector2D origin, double damageScale, int bonusJumps = 0)
    {
        var current = origin;
        var evolution = EvolutionProfile(spell.Id);
        var baseDamage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * evolution.DamageMultiplier;
        var damage = buildModifiers.Apply(BuildStatId.Damage, baseDamage) * damageScale * build.SchoolDamageMultiplier(spell.School);
        var jumps = profile.CalculateJumps(rank) + buildModifiers.ApplyInt(BuildStatId.BonusChains) + bonusJumps + evolution.BonusChains;
        var falloff = Math.Min(1, profile.DamageFalloff * evolution.ChainFalloffMultiplier);
        var hit = new HashSet<int>();
        var bonusJumpsTriggered = false;
        var forkPending = spell.Id == SpellId.ChainLightning && ChainLightningMastery.IsActive(rank);

        for (var jump = 0; jump < jumps; jump++)
        {
            var target = NearestTarget(current, hit);
            if (target is null) break;
            hit.Add(target.Id);
            lightning.Add(new LightningTrace(current, target.Position, 0.12));
            var hitDamage = ApplyChainInteractions(spell.Id, target, damage, ref jumps, ref bonusJumpsTriggered);
            RegisterElementalImpact(target.Position, spell.Id);
            var killed = DamageTarget(target, hitDamage);
            if (!killed) ApplyAbilityStatus(spell, rank, target);

            if (forkPending)
            {
                CastChainFork(spell, rank, target.Position, damage, hit, ref jumps, ref bonusJumpsTriggered);
                forkPending = false;
            }

            current = target.Position;
            damage *= falloff;
        }
    }

    private void CastChainFork(SpellDefinition spell, int rank, Vector2D origin, double damage, HashSet<int> hit, ref int jumps, ref bool bonusJumpsTriggered)
    {
        var target = NearestTarget(origin, hit);
        if (target is null) return;
        hit.Add(target.Id);
        lightning.Add(new LightningTrace(origin, target.Position, 0.16));
        var forkDamage = ApplyChainInteractions(spell.Id, target, ChainLightningMastery.CalculateForkDamage(damage), ref jumps, ref bonusJumpsTriggered);
        RegisterElementalImpact(target.Position, spell.Id);
        var killed = DamageTarget(target, forkDamage);
        if (!killed) ApplyAbilityStatus(spell, rank, target);
    }

    private SpellEvolutionProfile EvolutionProfile(SpellId spell)
    {
        var evolution = build.Evolutions.For(spell);
        return evolution is { } id ? SpellEvolutionCatalog.Get(id).Profile : SpellEvolutionProfile.Identity;
    }

    private double ApplyChainInteractions(SpellId spellId, ICombatTarget target, double damage, ref int jumps, ref bool bonusJumpsTriggered)
    {
        var interactions = ResolveStatusInteractions(spellId, target);
        foreach (var interaction in interactions) damage *= interaction.DamageMultiplier;
        if (bonusJumpsTriggered) return damage;

        var bonusJumps = interactions.Sum(interaction => interaction.BonusJumps);
        if (bonusJumps <= 0) return damage;
        jumps += bonusJumps;
        bonusJumpsTriggered = true;
        return damage;
    }
}
