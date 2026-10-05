using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells;

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
        return spell.Ability.CalculateCooldownSeconds(rank) * passiveProfile.CastIntervalMultiplier * modifiers.CastIntervalMultiplier
            * relicModifiers.CastIntervalMultiplier * dragonEssenceModifiers.CastIntervalMultiplier * lightningFormMultiplier;
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
        var treeEcho = passiveProfile.ArcaneEcho && castCount % 6 == 0;
        var runEcho = modifiers.EchoEveryCasts > 0 && castCount % modifiers.EchoEveryCasts == 0;
        if (treeEcho) CastSpell(spell, rank, passiveProfile.EchoChamber ? damageScale : damageScale * 0.6, true);
        if (runEcho) CastSpell(spell, rank, damageScale * modifiers.EchoDamageMultiplier, true);
    }

    private void CastProjectileSpell(SpellDefinition spell, ProjectileAbilityProfile profile, int rank, double damageScale)
    {
        var target = NearestTarget(player.Position);
        if (target is null) return;
        var id = spell.Id;
        var inferno = passiveProfile.Inferno && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var prismatic = passiveProfile.Prismatic && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var baseCount = prismatic ? passiveProfile.AstralBarrage ? 5 : 3 : 1;
        var count = baseCount + modifiers.ExtraProjectiles;
        var baseDirection = Vector2D.DirectionTo(player.Position, target.Position);
        var speed = profile.CalculateSpeed(rank) * passiveProfile.ProjectileSpeedMultiplier * modifiers.ProjectileSpeedMultiplier;
        var damage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * relicModifiers.DamageMultiplier
            * dragonEssenceModifiers.DamageMultiplier * damageScale;
        var chains = (passiveProfile.LivingStorm ? 4 : passiveProfile.Chainstorm ? 1 : 0) + modifiers.BonusChains;
        var masteredArcaneOrb = id == SpellId.ArcaneOrb && rank >= spell.MaxRank;
        var masteredFrostShard = id == SpellId.FrostShard && FrostShardMastery.IsActive(rank);

        for (var index = 0; index < count; index++)
        {
            var offset = count == 1 ? 0 : (index - (count - 1) / 2d) * 0.16;
            var direction = Vector2D.Rotate(baseDirection, offset);
            var radius = inferno ? 9 : masteredArcaneOrb ? 7 : profile.Radius;
            var effects = new ProjectileEffects(
                inferno,
                chains,
                id == SpellId.FireBolt && rank >= spell.MaxRank ? 56 : 0,
                id == SpellId.FrostShard ? 0.35 + rank * 0.18 : 0,
                masteredArcaneOrb ? 1 : 0,
                masteredFrostShard ? FrostShardMastery.NovaRadius : 0);
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
        var damage = spell.Ability.CalculateDamage(rank) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * relicModifiers.DamageMultiplier
            * dragonEssenceModifiers.DamageMultiplier * damageScale;
        var jumps = profile.CalculateJumps(rank) + modifiers.BonusChains + bonusJumps;
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
            DamageTarget(target, hitDamage);

            if (forkPending)
            {
                CastChainFork(spell.Id, target.Position, damage, hit, ref jumps, ref bonusJumpsTriggered);
                forkPending = false;
            }

            current = target.Position;
            damage *= profile.DamageFalloff;
        }
    }

    private void CastChainFork(SpellId spellId, Vector2D origin, double damage, HashSet<int> hit, ref int jumps, ref bool bonusJumpsTriggered)
    {
        var target = NearestTarget(origin, hit);
        if (target is null) return;
        hit.Add(target.Id);
        lightning.Add(new LightningTrace(origin, target.Position, 0.16));
        var forkDamage = ApplyChainInteractions(spellId, target, ChainLightningMastery.CalculateForkDamage(damage), ref jumps, ref bonusJumpsTriggered);
        RegisterElementalImpact(target.Position, spellId);
        DamageTarget(target, forkDamage);
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
