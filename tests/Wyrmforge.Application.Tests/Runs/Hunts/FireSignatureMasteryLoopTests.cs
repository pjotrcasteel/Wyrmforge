using System.Text.Json;
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
        vault.Store(DragonEssenceId.AshenWing);
        materials.Restore([HuntMaterialId.EmberResidue, HuntMaterialId.EmberResidue,
            HuntMaterialId.CharredScrap, HuntMaterialId.CharredScrap]);
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

        // Persist the actual domain snapshot shapes used by the Nexus, Mastery and Great Hunt.
        // Reloading must preserve the sealed oath and equipped mutators without awarding anything again.
        var restoredCore = new FireballCoreState();
        restoredCore.Restore(JsonSerializer.Deserialize<FireballCoreSave>(JsonSerializer.Serialize(core.ToSave())));
        var restoredMastery = new SpellMasteryState();
        restoredMastery.Restore(JsonSerializer.Deserialize<SpellMasteryEntry[]>(JsonSerializer.Serialize(mastery.Snapshot()))!);
        var restoredOath = new GreatHuntState();
        restoredOath.Restore(JsonSerializer.Deserialize<GreatHuntEntry[]>(JsonSerializer.Serialize(oath.Snapshot()))!);

        Assert.AreEqual(3, restoredCore.Level);
        CollectionAssert.AreEquivalent(core.Equipped.ToArray(), restoredCore.Equipped.ToArray());
        Assert.AreEqual(mastery.Get(SpellId.FireBolt).MeaningfulRuns, restoredMastery.Get(SpellId.FireBolt).MeaningfulRuns);
        Assert.IsTrue(restoredMastery.Unlocks(SpellEvolutionId.Wyrmfire));
        Assert.IsTrue(restoredOath.IsSealed(DragonId.Ashfang, restoredMastery));
        Assert.AreEqual(0, restoredOath.RecordRun(new GreatHuntRunEvidence(2, false,
            new HashSet<DragonId> { DragonId.Ashfang }, new HashSet<DragonId> { DragonId.Ashfang },
            [DragonEssenceId.MoltenFang])).Count, "Replaying the same oath evidence must never award a second seal.");
    }

    [TestMethod]
    public void SignatureMilestones_RejectUnavailableOrOverCapacityMutations()
    {
        Assert.IsFalse(FireSignatureMasteryCriteria.QualifiesMeaningfulRun(1, [FireballMutationId.Detonation]),
            "The unupgraded Fireball has no unlocked sockets.");
        Assert.IsFalse(FireSignatureMasteryCriteria.QualifiesMeaningfulRun(2, [FireballMutationId.PhoenixVolley]),
            "Proposed mutations without playable combat effects cannot qualify for mastery.");
        Assert.IsFalse(FireSignatureMasteryCriteria.QualifiesEmpoweredDuel(3,
            [FireballMutationId.Detonation, FireballMutationId.MeteorHeart, FireballMutationId.ScorchedEarth]),
            "The Tier-II duel cannot claim a sealed third socket at Fireball level three.");
        Assert.IsFalse(FireSignatureMasteryCriteria.QualifiesEmpoweredDuel(3,
            [FireballMutationId.Detonation, FireballMutationId.Detonation]),
            "The same mutator cannot count twice.");
        Assert.IsTrue(FireSignatureMasteryCriteria.QualifiesEmpoweredDuel(3,
            [FireballMutationId.Detonation, FireballMutationId.MeteorHeart]));
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
