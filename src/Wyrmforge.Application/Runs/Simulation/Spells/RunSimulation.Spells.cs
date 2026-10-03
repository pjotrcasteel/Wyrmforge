using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

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
            CastSpell(spell.Id, rank, 1, false);
            spellCooldowns[spell.Id] = GetSpellCooldown(spell.Id, rank, moving);
        }
    }

    private double GetSpellCooldown(SpellId id, int rank, bool moving)
    {
        var rankMultiplier = 1 - Math.Max(0, rank - 1) * 0.06;
        var lightningFormMultiplier = passiveProfile.LightningForm && moving ? 1 / 1.5 : 1;
        return BaseSpellCooldowns[id] * rankMultiplier * passiveProfile.CastIntervalMultiplier * modifiers.CastIntervalMultiplier * lightningFormMultiplier;
    }

    private void CastSpell(SpellId id, int rank, double damageScale, bool echo)
    {
        if (!echo)
        {
            castCount++;
            if (id != SpellId.ChainLightning) projectileCastCount++;
            ApplyDragonEssenceCastEffects();
        }

        if (id == SpellId.ChainLightning) CastChainLightning(rank, player.Position, damageScale);
        else CastProjectileSpell(id, rank, damageScale);
        if (echo) return;

        var treeEcho = passiveProfile.ArcaneEcho && castCount % 6 == 0;
        var runEcho = modifiers.EchoEveryCasts > 0 && castCount % modifiers.EchoEveryCasts == 0;
        if (treeEcho) CastSpell(id, rank, passiveProfile.EchoChamber ? damageScale : damageScale * 0.6, true);
        if (runEcho) CastSpell(id, rank, damageScale * modifiers.EchoDamageMultiplier, true);
    }

    private void CastProjectileSpell(SpellId id, int rank, double damageScale)
    {
        var target = NearestTarget(player.Position, CombatTargets());
        if (target is null) return;
        var inferno = passiveProfile.Inferno && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var prismatic = passiveProfile.Prismatic && projectileCastCount > 0 && projectileCastCount % 5 == 0;
        var baseCount = prismatic ? passiveProfile.AstralBarrage ? 5 : 3 : 1;
        var count = baseCount + modifiers.ExtraProjectiles;
        var baseDirection = Vector2D.DirectionTo(player.Position, target.Position);
        var speed = GetSpellProjectileSpeed(id, rank) * passiveProfile.ProjectileSpeedMultiplier * modifiers.ProjectileSpeedMultiplier;
        var damage = GetSpellDamage(id, rank) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * damageScale;
        var chains = (passiveProfile.LivingStorm ? 4 : passiveProfile.Chainstorm ? 1 : 0) + modifiers.BonusChains;

        for (var index = 0; index < count; index++)
        {
            var offset = count == 1 ? 0 : (index - (count - 1) / 2d) * 0.16;
            var direction = Vector2D.Rotate(baseDirection, offset);
            projectiles.Add(new ProjectileState(
                player.Position,
                direction * speed,
                inferno ? 9 : id == SpellId.FireBolt ? 7 : 5,
                damage * (inferno ? 4 : 1),
                id,
                inferno,
                chains,
                id == SpellId.FireBolt && rank >= 3 ? 56 : 0,
                id == SpellId.FrostShard ? 0.35 + rank * 0.18 : 0));
        }
    }

    private void CastChainLightning(int rank, Vector2D origin, double damageScale, int bonusJumps = 0)
    {
        var current = origin;
        var damage = (15 + (rank - 1) * 5) * passiveProfile.DamageMultiplier * modifiers.DamageMultiplier * damageScale;
        var jumps = rank + 1 + modifiers.BonusChains + bonusJumps;
        var hit = new HashSet<int>();
        var stormglassTriggered = false;

        for (var jump = 0; jump < jumps; jump++)
        {
            var target = NearestTarget(current, CombatTargets().Where(target => !hit.Contains(target.Id)));
            if (target is null) break;
            hit.Add(target.Id);
            lightning.Add(new LightningTrace(current, target.Position, 0.12));
            var hitDamage = damage;
            if (build.Synergies.Contains(SynergyId.Stormglass) && target.FrozenFor > 0)
            {
                hitDamage *= 1.5;
                if (!stormglassTriggered)
                {
                    jumps += 2;
                    stormglassTriggered = true;
                }
            }
            RegisterElementalImpact(target.Position, SpellId.ChainLightning);
            DamageTarget(target, hitDamage);
            current = target.Position;
            damage *= 0.84;
        }
    }

    private static double GetSpellDamage(SpellId id, int rank)
    {
        if (id == SpellId.ArcaneOrb) return 18 * (1 + (rank - 1) * 0.28);
        if (id == SpellId.FireBolt) return 30 * (1 + (rank - 1) * 0.3);
        return 12 * (1 + (rank - 1) * 0.25);
    }

    private static double GetSpellProjectileSpeed(SpellId id, int rank)
    {
        if (id == SpellId.FireBolt) return 330 + (rank - 1) * 20;
        if (id == SpellId.FrostShard) return 500 + (rank - 1) * 25;
        return 410 + (rank - 1) * 20;
    }
}
