using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Progression.Forge;

[TestClass]
public sealed class ForgeProgressionStateTests
{
    [TestMethod]
    public void Discover_StormEssence_RevealsStormcraftWithoutForgingRecipes()
    {
        var state = new ForgeProgressionState();

        var discoveries = state.Discover(ForgeDiscoveryContext.FromEssences([DragonEssenceId.TempestWing]));

        Assert.AreEqual(1, discoveries.Count);
        Assert.AreEqual(ForgeDiscoveryId.Stormcraft, discoveries[0].Id);
        Assert.IsFalse(state.UnlocksOffering(DragonEssenceId.StormHeart));
        Assert.IsFalse(state.UnlocksOffering(DragonEssenceId.ChargedScale));
        Assert.IsFalse(state.UnlocksOffering(DragonEssenceId.TempestWing));
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
    public void Forge_FirstTier_ConsumesSpecificEssenceAndUnlocksOffering()
    {
        var state = new ForgeProgressionState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.StormHeart);
        state.Discover(ForgeDiscoveryContext.FromEssences(vault.SecuredEssences));

        var forged = state.Forge(ForgeMasteryId.StormheartBinding, vault);

        Assert.IsTrue(forged);
        Assert.AreEqual(0, vault.Count(DragonEssenceId.StormHeart));
        Assert.IsTrue(state.IsForged(ForgeMasteryId.StormheartBinding));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.StormHeart));
    }

    [TestMethod]
    public void Forge_SecondTier_RequiresPreviousTierThenUnlocksSpell()
    {
        var state = new ForgeProgressionState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.StormHeart);
        vault.Store(DragonEssenceId.ChargedScale);
        state.Discover(ForgeDiscoveryContext.FromEssences(vault.SecuredEssences));

        Assert.IsFalse(state.Forge(ForgeMasteryId.ChargedSmithing, vault));
        Assert.IsTrue(state.Forge(ForgeMasteryId.StormheartBinding, vault));
        Assert.IsTrue(state.Forge(ForgeMasteryId.ChargedSmithing, vault));

        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.ChargedScale));
        Assert.IsTrue(state.UnlocksSpell(SpellId.BallLightning));
    }

    [TestMethod]
    public void Forge_Masterwork_UnlocksLineageRelic()
    {
        var state = new ForgeProgressionState();
        state.Restore([ForgeDiscoveryId.Voidcraft]);
        state.RestoreMasteries([ForgeMasteryId.VoidheartBinding, ForgeMasteryId.NullSmithing, ForgeMasteryId.PhaseMasterwork]);

        Assert.IsTrue(state.UnlocksRelic(RelicId.MirrorPrism));
        Assert.IsTrue(state.UnlocksSpell(SpellId.AetherDart));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.PhaseWing));
    }

    [TestMethod]
    public void Restore_MasteryState_RemainsAvailableWithoutCurrentEssence()
    {
        var state = new ForgeProgressionState();

        state.Restore([ForgeDiscoveryId.Rimecraft]);
        state.RestoreMasteries([ForgeMasteryId.RimeheartBinding, ForgeMasteryId.GlacialSmithing]);

        Assert.IsTrue(state.Contains(ForgeDiscoveryId.Rimecraft));
        Assert.IsTrue(state.IsForged(ForgeMasteryId.GlacialSmithing));
        Assert.IsTrue(state.UnlocksSpell(SpellId.IceLance));
        Assert.IsTrue(state.UnlocksOffering(DragonEssenceId.GlacialScale));
    }
}
