using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Combat.Modifiers;

[TestClass]
public sealed class CombatRuleResolverTests
{
    [TestMethod]
    public void Resolve_FrostTouchRankThree_OnFourthHit_ReturnsFreezeEffect()
    {
        var profile = RunUpgradeCatalog.Get(RunUpgradeId.FrostTouch).ProfileForRank(3);
        var context = new CombatRuleContext(CombatRuleTrigger.Hit, 4, SpellId.FireBolt, SpellSchool.Fire, new CombatStatusCollection());

        var resolved = CombatRuleResolver.Resolve(profile.Rules, context);

        Assert.HasCount(1, resolved);
        var effect = (ApplyStatusRuleEffect)resolved[0].Effect;
        Assert.AreEqual(CombatStatusId.Frozen, effect.Status);
        Assert.AreEqual(1.25d, effect.DurationSeconds, 0.0001);
    }

    [TestMethod]
    public void Resolve_FrostTouch_BeforeCadence_ReturnsNoRule()
    {
        var profile = RunUpgradeCatalog.Get(RunUpgradeId.FrostTouch).ProfileForRank(1);
        var context = new CombatRuleContext(CombatRuleTrigger.Hit, 5, SpellId.ArcaneOrb, SpellSchool.Arcane, new CombatStatusCollection());

        var resolved = CombatRuleResolver.Resolve(profile.Rules, context);

        Assert.IsEmpty(resolved);
    }

    [TestMethod]
    public void Resolve_ArcaneEchoRankTwo_OnFifthCast_ReturnsEchoEffect()
    {
        var profile = RunUpgradeCatalog.Get(RunUpgradeId.ArcaneEcho).ProfileForRank(2);
        var context = new CombatRuleContext(CombatRuleTrigger.Cast, 5, SpellId.FrostShard, SpellSchool.Frost);

        var resolved = CombatRuleResolver.Resolve(profile.Rules, context);

        Assert.HasCount(1, resolved);
        var effect = (EchoCastRuleEffect)resolved[0].Effect;
        Assert.AreEqual(0.8d, effect.DamageMultiplier, 0.0001);
    }

    [TestMethod]
    public void Condition_RequiredStatus_MatchesOnlyWhenTargetHasStatus()
    {
        var statuses = new CombatStatusCollection();
        var rule = new CombatRuleDefinition(CombatRuleTrigger.Hit, 1, new EchoCastRuleEffect(1), new CombatRuleCondition(RequiredTargetStatus: CombatStatusId.Frozen));
        var withoutStatus = new CombatRuleContext(CombatRuleTrigger.Hit, 1, TargetStatuses: statuses);
        statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 1);
        var withStatus = new CombatRuleContext(CombatRuleTrigger.Hit, 1, TargetStatuses: statuses);

        Assert.IsEmpty(CombatRuleResolver.Resolve([rule], withoutStatus));
        Assert.HasCount(1, CombatRuleResolver.Resolve([rule], withStatus));
    }
}
