using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Progression;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Progression;

[TestClass]
public sealed class RunContentProfileTests
{
    [TestMethod]
    public void From_FreshForge_ContainsCoreContentButNotMasteryBlueprints()
    {
        var profile = RunContentProfile.From(new ForgeProgressionState());

        Assert.IsTrue(profile.Spells.Contains(SpellId.ArcaneOrb));
        Assert.IsTrue(profile.Spells.Contains(SpellId.FireBolt));
        Assert.IsFalse(profile.Spells.Contains(SpellId.CinderNeedle));
        Assert.IsFalse(profile.Spells.Contains(SpellId.BallLightning));
        Assert.IsTrue(profile.Relics.Contains(RelicId.Vitalstone));
        Assert.IsFalse(profile.Relics.Contains(RelicId.MirrorPrism));
        Assert.IsFalse(profile.Relics.Contains(RelicId.Stormhook));
    }

    [TestMethod]
    public void From_ForgedMasteries_AddsUnlockedSpellAndRelicToFutureRuns()
    {
        var progression = new ForgeProgressionState();
        progression.Restore([ForgeDiscoveryId.Stormcraft, ForgeDiscoveryId.Voidcraft]);
        progression.RestoreMasteries([
            ForgeMasteryId.StormheartBinding,
            ForgeMasteryId.ChargedSmithing,
            ForgeMasteryId.TempestMasterwork,
            ForgeMasteryId.VoidheartBinding,
            ForgeMasteryId.NullSmithing,
            ForgeMasteryId.PhaseMasterwork,
        ]);

        var profile = RunContentProfile.From(progression);

        Assert.IsTrue(profile.Spells.Contains(SpellId.BallLightning));
        Assert.IsTrue(profile.Spells.Contains(SpellId.AetherDart));
        Assert.IsTrue(profile.Relics.Contains(RelicId.Stormhook));
        Assert.IsTrue(profile.Relics.Contains(RelicId.MirrorPrism));
        Assert.IsFalse(profile.Spells.Contains(SpellId.CinderNeedle));
    }
}
