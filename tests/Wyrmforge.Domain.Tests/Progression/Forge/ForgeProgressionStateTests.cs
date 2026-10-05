using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;

namespace Wyrmforge.Domain.Tests.Progression.Forge;

[TestClass]
public sealed class ForgeProgressionStateTests
{
    [TestMethod]
    public void Discover_StormEssence_UnlocksStormcraftAndAllStormOfferingRecipes()
    {
        var state = new ForgeProgressionState();

        var discoveries = state.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.TempestWing]));

        Assert.AreEqual(1, discoveries.Count);
        Assert.AreEqual(ForgeDiscoveryId.Stormcraft, discoveries[0].Id);
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.StormHeart));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.ChargedScale));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.TempestWing));
        Assert.IsFalse(state.UnlocksOffering(DragonEssenceId.VoidHeart));
    }

    [TestMethod]
    public void Discover_SameLineageTwice_DoesNotDuplicatePermanentKnowledge()
    {
        var state = new ForgeProgressionState();
        Assert.AreEqual(1, state.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.CinderHeart])).Count);

        var second = state.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.AshenWing]));

        Assert.AreEqual(0, second.Count);
        Assert.AreEqual(1, state.Count);
    }

    [TestMethod]
    public void Discover_MultipleLineages_UnlocksEachMatchingDiscovery()
    {
        var state = new ForgeProgressionState();

        var discoveries = state.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.RimeHeart, DragonEssenceId.PhaseWing]));

        CollectionAssert.AreEquivalent(
            new[] { ForgeDiscoveryId.Rimecraft, ForgeDiscoveryId.Voidcraft },
            discoveries.Select(discovery => discovery.Id).ToArray());
    }

    [TestMethod]
    public void Restore_PermanentKnowledge_RemainsAvailableWithoutCurrentEssence()
    {
        var state = new ForgeProgressionState();

        state.Restore([ForgeDiscoveryId.Voidcraft]);

        Assert.IsTrue(state.Contains(ForgeDiscoveryId.Voidcraft));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.NullScale));
    }
}
