using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.GreatHunt;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Tests.Runs.Hunts;

[TestClass]
public sealed class FireSignatureMasteryLoopTests
{
    [TestMethod]
    public void SecuredEssences_UpgradeCoreAndEnableAReachableGreatHuntOathWithoutRankCards()
    {
        var core = new FireballCoreState();
        var vault = new DragonEssenceVault();
        var materials = new HuntMaterialSatchel();
        var mastery = new SpellMasteryState();
        var oath = new GreatHuntState();
        var spells = new SpellBook();
        Assert.IsTrue(spells.TryChoosePrimary(SpellId.FireBolt));
        Assert.AreEqual(1, spells[SpellId.FireBolt]);

        vault.Store(DragonEssenceId.CinderHeart);
        Assert.IsTrue(core.DiscoverSecured([DragonEssenceId.CinderHeart]));
        Assert.IsTrue(core.Upgrade(vault, materials));
        Assert.AreEqual(2, core.Level);
        Assert.IsTrue(core.Equip(0, FireballMutationId.Detonation));

        for (var run = 0; run < 4; run++)
            mastery.RecordRun(MeaningfulHunt(core));

        Assert.AreEqual(4, mastery.Get(SpellId.FireBolt).MeaningfulRuns);
        Assert.IsFalse(mastery.Unlocks(SpellEvolutionId.Wyrmfire));

        vault.Store(DragonEssenceId.MoltenFang);
        Assert.IsTrue(core.DiscoverSecured([DragonEssenceId.MoltenFang]));
        Assert.IsTrue(core.Upgrade(vault, materials));
        Assert.AreEqual(3, core.Level);
        Assert.IsTrue(core.Equip(1, FireballMutationId.MeteorHeart));
        Assert.IsFalse(GreatHuntDuelQualification.QualifiesFireSignature(DragonCatalog.Ashfang, HuntSelection.FireTierOne,
            spells, core.Level, core.Equipped));
        Assert.IsTrue(GreatHuntDuelQualification.QualifiesFireSignature(DragonCatalog.Ashfang, HuntSelection.FireTierTwo,
            spells, core.Level, core.Equipped));

        var awakened = mastery.RecordRun(MeaningfulHunt(core) with
        {
            QualifiedWyrmFeats = new HashSet<SpellId> { SpellId.FireBolt },
        });
        oath.RecordRun(new GreatHuntRunEvidence(2, false, new HashSet<DragonId> { DragonId.Ashfang },
            new HashSet<DragonId> { DragonId.Ashfang }, [DragonEssenceId.MoltenFang]));

        CollectionAssert.AreEqual(new[] { SpellEvolutionId.Wyrmfire }, awakened.NewlyUnlocked.ToArray());
        Assert.IsTrue(oath.IsSealed(DragonId.Ashfang, mastery));
        Assert.AreEqual(1, spells[SpellId.FireBolt], "The milestone must not revive obsolete in-Hunt rank cards.");
        Assert.AreEqual(3, core.Level, "Mastery and oath rewards cannot silently advance permanent core levels.");
    }

    private static MasteryRunEvidence MeaningfulHunt(FireballCoreState core) =>
        new(3, 1, false, new HashSet<SpellId>(), [new MasteryRunSpell(SpellId.FireBolt, 1)])
        {
            ActiveSpell = SpellId.FireBolt,
            Extracted = true,
            FireballLevel = core.Level,
            FireballMutations = core.Equipped,
        };
}
