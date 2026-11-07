using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly Queue<(Vector2D Position, int IgnoreId, ResolvedSynergy Effect)> pendingSynergies = new();
    private const int MaximumSynergyFields = 12;
    public int SynergyEffectsResolved { get; private set; }

    private IEnumerable<SynergyRule> ActiveSynergyRules()
    {
        var radius = buildModifiers.Apply(BuildStatId.MutationRadius, 54);
        if (HasFireballMutation(FireballMutationId.Detonation)) radius *= FireballEffectFactor(FireballMutationId.Detonation,
            Domain.Progression.PassiveTree.MutationEffectCapability.Area) * 1.2;
        if (HasFireballMutation(FireballMutationId.CinderNeedle)) radius *= .8;
        const EffectTags required = EffectTags.Fire | EffectTags.Kill | EffectTags.Burning;
        if (ActivePassiveNodes().Contains("fire-ember-covenant"))
            yield return new("web:ember-covenant", EffectLifetime.ArcaneWeb, required, SynergyOutput.Explosion, .12, radius, "burning-kill", EffectTags.Fire);
        if (build.RunUpgrades[RunUpgradeId.CinderCascade] > 0)
        {
            var evolved = build.RunUpgrades[RunUpgradeId.SolarWake] > 0;
            yield return new(evolved ? "hunt:solar-wake" : "hunt:cinder-cascade", EffectLifetime.Hunt, required,
                evolved ? SynergyOutput.BurningField : SynergyOutput.Explosion, evolved ? .045 : .35, radius, "burning-kill", EffectTags.Fire);
        }
    }

    private void QueueSynergyKill(ICombatTarget target, ProjectileState? source)
    {
        // Primary impacts seed a chain. Secondary effects retain ancestry explicitly;
        // they never masquerade as fresh primary hits or multiply their parent damage.
        if (source?.Spell != SpellId.FireBolt || !target.Statuses.Has(CombatStatusId.Burning)) return;
        EnqueueSynergies(target.Position, target.Id, new(EffectTags.Fire | EffectTags.Projectile | EffectTags.Kill | EffectTags.Burning,
            source.Damage, []));
    }

    private void EnqueueSynergies(Vector2D position, int ignoreId, SynergyEvent input)
    {
        foreach (var effect in SynergyResolver.Resolve(ActiveSynergyRules(), input, reactionBudget))
            pendingSynergies.Enqueue((position, ignoreId, effect));
    }

    private void ResolvePendingSynergies()
    {
        while (pendingSynergies.TryDequeue(out var queued))
        {
            var (position, ignoreId, effect) = queued;
            SynergyEffectsResolved++;
            RecordReaction();
            if (effect.Output == SynergyOutput.BurningField)
            {
                if (burningGrounds.Count >= MaximumSynergyFields) continue;
                var duration = buildModifiers.Apply(BuildStatId.MutationDuration, 1);
                if (HasFireballMutation(FireballMutationId.ScorchedEarth))
                    duration *= FireballEffectFactor(FireballMutationId.ScorchedEarth, Domain.Progression.PassiveTree.MutationEffectCapability.Duration) * 1.2;
                burningGrounds.Add(new(position, buildModifiers.Apply(BuildStatId.BurnDamage, effect.Damage), duration, effect.Radius / BurningGroundState.Radius));
                continue;
            }
            RegisterSplashPulse(position, effect.Radius);
            combatSpatialIndex.CollectWithinRadius(position, effect.Radius, ignoreId, spatialQueryBuffer);
            // Snapshot before child deaths touch the shared spatial scratch buffer.
            foreach (var target in spatialQueryBuffer.OrderBy(target => target.Id).ToArray())
            {
                var burning = target.Statuses.Has(CombatStatusId.Burning);
                if (!DamageTargetWithFeedback(target, effect.Damage * ShieldMultiplier(target, position, effect.Damage), spellId: SpellId.FireBolt)) continue;
                if (burning) EnqueueSynergies(target.Position, target.Id, effect.Child with { Tags = effect.Child.Tags | EffectTags.Kill | EffectTags.Burning });
            }
        }
    }
}
