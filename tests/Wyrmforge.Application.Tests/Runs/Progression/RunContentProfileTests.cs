using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Progression;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

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
        Assert.IsTrue(profile.Evolutions.Contains(SpellEvolutionId.WildfireNeedles));
        Assert.IsFalse(profile.Evolutions.Contains(SpellEvolutionId.EmberTempest));
    }

    [TestMethod]
    public void From_WyrmforgedLineage_AddsBranchOnlyAfterMasteryAndWyrmFeat()
    {
        var forge = new ForgeProgressionState();
        var mastery = new Wyrmforge.Domain.Progression.SpellMastery.SpellMasteryState();
        var evidence = new Wyrmforge.Domain.Progression.SpellMastery.MasteryRunEvidence(
            1, 2, false, new HashSet<SpellId> { SpellId.FireBolt },
            [new Wyrmforge.Domain.Progression.SpellMastery.MasteryRunSpell(SpellId.FireBolt, 3)]);

        Assert.IsFalse(RunContentProfile.From(forge, mastery).Evolutions.Contains(SpellEvolutionId.Wyrmfire));
        for (var run = 0; run < 4; run++) mastery.RecordRun(evidence);
        var unlocked = RunContentProfile.From(forge, mastery);
        Assert.IsTrue(unlocked.Evolutions.Contains(SpellEvolutionId.Wyrmfire));
        Assert.IsFalse(unlocked.Evolutions.Contains(SpellEvolutionId.GlacialRequiem));
        Assert.IsTrue(unlocked.Evolutions.Contains(SpellEvolutionId.MeteorHeart));
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
        Assert.IsTrue(profile.Evolutions.Contains(SpellEvolutionId.ThunderCrown));
        Assert.IsTrue(profile.Evolutions.Contains(SpellEvolutionId.MirrorChoir));
        Assert.IsFalse(profile.Evolutions.Contains(SpellEvolutionId.CrystalDivide));
    }
}
