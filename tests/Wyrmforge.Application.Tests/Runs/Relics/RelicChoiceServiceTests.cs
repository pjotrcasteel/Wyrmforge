using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Relics;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Relics;

[TestClass]
public sealed class RelicChoiceServiceTests
{
    [TestMethod]
    public void Roll_WithUnownedRelics_ReturnsUniqueChoices()
    {
        var choices = new RelicChoiceService().Roll(new RelicInventoryState(), new FirstRandomSource());

        Assert.AreEqual(RelicChoiceService.ChoiceCount, choices.Count);
        Assert.AreEqual(choices.Count, choices.Select(choice => choice.Id).Distinct().Count());
    }

    [TestMethod]
    public void Roll_WhenRelicAlreadyOwned_ExcludesOwnedRelic()
    {
        var inventory = new RelicInventoryState();
        inventory.Acquire(RelicId.EmberheartCharm);

        var choices = new RelicChoiceService().Roll(inventory, new FirstRandomSource());

        Assert.IsFalse(choices.Any(choice => choice.Id == RelicId.EmberheartCharm));
    }

    [TestMethod]
    public void Roll_WithForgeContentPool_NeverOffersLockedRelic()
    {
        HashSet<RelicId> available = [RelicId.ChronoglassShard, RelicId.GalefootSigil, RelicId.Vitalstone];

        var choices = new RelicChoiceService().Roll(new RelicInventoryState(), new FirstRandomSource(), available);

        CollectionAssert.AreEquivalent(available.ToArray(), choices.Select(choice => choice.Id).ToArray());
        Assert.IsFalse(choices.Any(choice => choice.Id == RelicId.Stormhook));
    }

    [TestMethod]
    public void Roll_FirstCache_OffersPowerSurvivalAndMobility()
    {
        var choices = new RelicChoiceService().Roll(new RelicInventoryState(), new FirstRandomSource());
        CollectionAssert.AreEquivalent(new[] { RelicRole.Power, RelicRole.Survival, RelicRole.Mobility },
            choices.Select(choice => RelicChoiceService.Role(choice.Id)).ToArray());
    }

    [TestMethod]
    [DataRow(SpellSchool.Fire, RelicId.EmberheartCharm)]
    [DataRow(SpellSchool.Frost, RelicId.DuelistLens)]
    [DataRow(SpellSchool.Arcane, RelicId.ChronoglassShard)]
    public void Roll_AttunedSchool_OffersRelevantPowerAlongsideOtherRoles(SpellSchool school, RelicId expected)
    {
        var choices = new RelicChoiceService().Roll(new RelicInventoryState(), new FirstRandomSource(), preferredSchool: school);
        Assert.AreEqual(expected, choices[0].Id);
        Assert.IsTrue(choices.Any(relic => RelicChoiceService.Role(relic.Id) == RelicRole.Survival));
        Assert.IsTrue(choices.Any(relic => RelicChoiceService.Role(relic.Id) == RelicRole.Mobility));
    }

    [TestMethod]
    public void Roll_AttunedSchoolLockedRelic_DoesNotBypassUnlock()
    {
        HashSet<RelicId> available = [RelicId.ChronoglassShard, RelicId.GalefootSigil, RelicId.Vitalstone];
        var choices = new RelicChoiceService().Roll(new RelicInventoryState(), new FirstRandomSource(), available, SpellSchool.Fire);
        Assert.IsFalse(choices.Any(relic => relic.Id == RelicId.EmberheartCharm));
        Assert.AreEqual(3, choices.Count);
    }

    private sealed class FirstRandomSource : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => 0;
    }
}
