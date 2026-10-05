using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Combat.Interactions;

[TestClass]
public sealed class StatusInteractionResolverTests
{
    [TestMethod]
    public void Resolve_MatchingSpellAndStatus_ReturnsFrostfireRule()
    {
        var statuses = FrozenStatuses();
        var rules = SynergyCatalog.Get(SynergyId.Frostfire).InteractionRules;

        var resolved = StatusInteractionResolver.Resolve(rules, SpellId.FireBolt, statuses);

        Assert.HasCount(1, resolved);
        Assert.AreEqual(2d, resolved[0].DamageMultiplier, 0.0001);
        Assert.AreEqual(92d, resolved[0].SplashRadius, 0.0001);
        Assert.AreEqual(0.45d, resolved[0].SplashDamageMultiplier, 0.0001);
    }

    [TestMethod]
    public void Resolve_WrongSpell_ReturnsNoInteraction()
    {
        var statuses = FrozenStatuses();
        var rules = SynergyCatalog.Get(SynergyId.Frostfire).InteractionRules;

        var resolved = StatusInteractionResolver.Resolve(rules, SpellId.ArcaneOrb, statuses);

        Assert.IsEmpty(resolved);
    }

    [TestMethod]
    public void Resolve_MissingRequiredStatus_ReturnsNoInteraction()
    {
        var rules = SynergyCatalog.Get(SynergyId.Stormglass).InteractionRules;

        var resolved = StatusInteractionResolver.Resolve(rules, SpellId.ChainLightning, new CombatStatusCollection());

        Assert.IsEmpty(resolved);
    }

    [TestMethod]
    public void StormglassRule_PreservesDamageAndJumpBehavior()
    {
        var rule = SynergyCatalog.Get(SynergyId.Stormglass).InteractionRules.Single();

        Assert.AreEqual(1.5d, rule.DamageMultiplier, 0.0001);
        Assert.AreEqual(2, rule.BonusJumps);
    }

    private static CombatStatusCollection FrozenStatuses()
    {
        var statuses = new CombatStatusCollection();
        statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 1);
        return statuses;
    }
}
