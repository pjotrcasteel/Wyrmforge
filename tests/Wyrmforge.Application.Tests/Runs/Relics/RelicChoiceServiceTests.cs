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

    private sealed class FirstRandomSource : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => 0;
    }
}
