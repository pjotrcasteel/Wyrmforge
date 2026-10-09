using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Relics;
using Wyrmforge.Domain.Progression.Relics;

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

    private sealed class FirstRandomSource : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => 0;
    }
}
