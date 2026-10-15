using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Interactions;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Composition;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Domain.Tests.Spells.Composition;

[TestClass]
public sealed class BlueprintValidatorTests
{
    private static readonly SpellBlueprint Rime = new(SpellId.FireBolt, SpellComponentId.Bolt, SpellComponentId.RimeInfusion, SpellComponentId.ThermalShatter);

    private static BlueprintIssueCode[] Codes(SpellBlueprint blueprint, BlueprintRuleset? ruleset = null, IReadOnlyList<SpellTag>? socket = null) =>
        BlueprintValidator.Validate(blueprint, ruleset ?? BlueprintRuleset.V1, socket).Issues.Select(issue => issue.Code).ToArray();

    [TestMethod]
    public void Tags_AreDerivedFromTheSpellDefinition()
    {
        CollectionAssert.IsSubsetOf(new[] { SpellTag.Fire, SpellTag.Projectile, SpellTag.Impact }, SpellTags.For(SpellId.FireBolt).ToArray());
        CollectionAssert.Contains(SpellTags.For(SpellId.FrostShard).ToArray(), SpellTag.AppliesFreeze);
        var chain = SpellTags.For(SpellId.ChainLightning);
        Assert.IsTrue(chain.Contains(SpellTag.Chain) && !chain.Contains(SpellTag.Impact));
        foreach (var spell in SpellCatalog.All)
            Assert.AreEqual(1, SpellTags.For(spell.Id).Count(tag => tag is SpellTag.Fire or SpellTag.Frost or SpellTag.Storm or SpellTag.Arcane), spell.Name);
    }

    [TestMethod]
    public void Catalog_EveryMutationBlueprintIsValidInItsSocketAndRealizesItsSynergy()
    {
        var expected = new Dictionary<LaboratoryMutationId, SynergyId>
        {
            [LaboratoryMutationId.RimeInfusion] = SynergyId.Frostfire,
            [LaboratoryMutationId.StormInfusion] = SynergyId.ArcaneConduit,
        };
        foreach (var mutation in LaboratoryCatalog.Mutations)
        {
            var validation = mutation.Validation;
            Assert.IsTrue(validation.IsValid, $"{mutation.Name}: {string.Join("; ", validation.Issues.Select(issue => issue.Reason))}");
            Assert.AreEqual(expected[mutation.Id], mutation.Realizes);
            Assert.AreEqual(2, validation.Elements.Count, "Phase B/C.1 mutations are two-element hybrids.");
            Assert.IsTrue(validation.Complexity <= validation.Budget);
            Assert.IsTrue(SynergyCatalog.Get(mutation.Realizes).CanHost(mutation.Foundation), "The realized synergy must accept the foundation as its primary.");
        }
    }

    [TestMethod]
    public void Catalog_EveryReactionRealizesADistinctExistingSynergy()
    {
        var reactions = SpellComponentCatalog.All.Where(component => component.Kind == SpellComponentKind.Reaction).ToArray();
        Assert.IsTrue(reactions.All(reaction => reaction.Realizes is not null));
        Assert.AreEqual(reactions.Length, reactions.Select(reaction => reaction.Realizes).Distinct().Count());
        Assert.IsTrue(SpellComponentCatalog.All.Where(component => component.Kind != SpellComponentKind.Reaction).All(component => component.Realizes is null));
    }

    [TestMethod]
    public void Validate_RimeBlueprint_CostsFourOfSixAndSpansFireAndFrost()
    {
        var validation = BlueprintValidator.Validate(Rime, BlueprintRuleset.V1);
        Assert.IsTrue(validation.IsValid);
        Assert.AreEqual(4, validation.Complexity);
        Assert.AreEqual(6, validation.Budget);
        CollectionAssert.AreEquivalent(new[] { SpellSchool.Fire, SpellSchool.Frost }, validation.Elements.ToArray());
    }

    [TestMethod]
    public void Validate_FormThatTheFoundationCannotTake_IsAFormMismatch() =>
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.FormMismatch }, Codes(new SpellBlueprint(SpellId.ChainLightning, SpellComponentId.Bolt)));

    [TestMethod]
    public void Validate_ImpactInfusionOnAChainFoundation_IsMissingARequirement() =>
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.MissingRequirement },
            Codes(new SpellBlueprint(SpellId.ChainLightning, SpellComponentId.Chain, SpellComponentId.StormCharge)));

    [TestMethod]
    public void Validate_ReactionWithoutItsCondition_IsRejectedWithACorrectiveAction()
    {
        var validation = BlueprintValidator.Validate(new SpellBlueprint(SpellId.FireBolt, SpellComponentId.Bolt, Reaction: SpellComponentId.ThermalShatter), BlueprintRuleset.V1);
        var issue = validation.Issues.Single();
        Assert.AreEqual(BlueprintIssueCode.MissingRequirement, issue.Code);
        StringAssert.Contains(issue.Reason, "freezes");
        StringAssert.Contains(issue.Fix, "infusion");
        Assert.IsNull(validation.Realizes, "A rejected reaction realizes nothing.");
    }

    [TestMethod]
    public void Validate_ReactionOnTheWrongElement_IsRejected()
    {
        var blueprint = new SpellBlueprint(SpellId.ArcaneOrb, SpellComponentId.Bolt, SpellComponentId.RimeInfusion, SpellComponentId.ThermalShatter);
        var issue = BlueprintValidator.Validate(blueprint, BlueprintRuleset.V1).Issues.Single();
        Assert.AreEqual(BlueprintIssueCode.MissingRequirement, issue.Code);
        StringAssert.Contains(issue.Reason, "Fire");
    }

    [TestMethod]
    public void Validate_ComponentInTheWrongSlot_IsRejected() =>
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.WrongComponentKind },
            Codes(new SpellBlueprint(SpellId.FireBolt, SpellComponentId.Bolt, SpellComponentId.ThermalShatter)));

    [TestMethod]
    public void Validate_OverTheComplexityBudget_IsRejected() =>
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.OverBudget }, Codes(Rime, BlueprintRuleset.V1 with { Version = 99, ComplexityBudget = 2 }));

    [TestMethod]
    public void Validate_MoreElementsThanTheRulesetAllows_IsRejected() =>
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.TooManyElements }, Codes(Rime, BlueprintRuleset.V1 with { Version = 99, MaxElements = 1 }));

    [TestMethod]
    public void Validate_SocketOnAnotherBridge_RejectsTheBlueprint()
    {
        var chargedFocus = LaboratoryCatalog.Get(ArcaneMutationSocketId.ChargedFocus).Accepts;
        CollectionAssert.AreEqual(new[] { BlueprintIssueCode.SocketRejects }, Codes(Rime, socket: chargedFocus));
        Assert.AreEqual(0, Codes(Rime, socket: LaboratoryCatalog.Get(ArcaneMutationSocketId.Rimebrand).Accepts).Length);
    }

    [TestMethod]
    public void Validate_IsDeterministicAndEveryIssueExplainsItself()
    {
        var broken = new SpellBlueprint(SpellId.ChainLightning, SpellComponentId.Bolt, SpellComponentId.StormCharge, SpellComponentId.ConduitDischarge);
        var strict = BlueprintRuleset.V1 with { Version = 99, ComplexityBudget = 1, MaxElements = 0 };
        var first = BlueprintValidator.Validate(broken, strict, [SpellTag.Fire]);
        var second = BlueprintValidator.Validate(broken, strict, [SpellTag.Fire]);
        CollectionAssert.AreEqual(first.Issues.ToArray(), second.Issues.ToArray());
        Assert.IsTrue(first.Issues.Count >= 4);
        Assert.IsTrue(first.Issues.All(issue => issue.Reason.Length > 0 && issue.Fix.Length > 0));
    }

    [TestMethod]
    public void RulesetV1_IsVersionedAndCurrent()
    {
        Assert.AreEqual(1, BlueprintRuleset.V1.Version);
        Assert.AreSame(BlueprintRuleset.V1, BlueprintRuleset.Current);
        Assert.AreEqual(3, BlueprintRuleset.V1.MaxElements, "Ordinary spells cap at three elemental roles (handover §5).");
    }

    [TestMethod]
    public void ReactionBudget_CapsEventsPerStepAndCountsSuppressed()
    {
        var budget = new ReactionBudget(2);
        Assert.IsTrue(budget.TrySpend());
        Assert.IsTrue(budget.TrySpend());
        Assert.IsFalse(budget.TrySpend());
        Assert.AreEqual(1, budget.Suppressed);
        budget.BeginStep();
        Assert.IsTrue(budget.TrySpend());
        Assert.AreEqual(2, budget.PeakPerStep);
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ReactionBudget(0));
    }
}
