using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Progression.Bestiary;

[TestClass]
public sealed class BestiaryStateTests
{
    [TestMethod]
    public void Catalog_HasOneEntryPerCreature_WithCounterplay()
    {
        CollectionAssert.AreEquivalent(Enum.GetValues<EnemyKind>(), BestiaryCatalog.All.Select(entry => entry.Kind).ToArray());
        foreach (var entry in BestiaryCatalog.All)
        {
            Assert.IsFalse(string.IsNullOrWhiteSpace(entry.Counterplay), entry.Name);
            Assert.IsFalse(string.IsNullOrWhiteSpace(entry.Habitats), entry.Name);
            Assert.IsFalse(string.IsNullOrWhiteSpace(entry.HunterNote), entry.Name);
        }
    }

    [TestMethod]
    public void Record_AddsKills_AndReportsOnlyFirstSightings()
    {
        var bestiary = new BestiaryState();

        var first = bestiary.Record([(EnemyKind.Hollow, 4), (EnemyKind.MireHound, 0)], []);
        var second = bestiary.Record([(EnemyKind.Hollow, 7), (EnemyKind.Ashling, 2)], []);

        CollectionAssert.AreEqual(new[] { EnemyKind.Hollow, EnemyKind.MireHound }, first.NewCreatures.ToArray());
        CollectionAssert.AreEqual(new[] { EnemyKind.Ashling }, second.NewCreatures.ToArray());
        Assert.AreEqual(11, bestiary.Kills(EnemyKind.Hollow));
        Assert.IsTrue(bestiary.Encountered(EnemyKind.MireHound), "Met but never slain still counts.");
        Assert.AreEqual(0, bestiary.Kills(EnemyKind.MireHound));
        Assert.IsFalse(bestiary.Encountered(EnemyKind.Penitent));
        Assert.AreEqual(3, bestiary.EncounteredCount);
    }

    [TestMethod]
    public void HunterNoteAndStudied_UnlockAtTheirKillThresholds()
    {
        var bestiary = new BestiaryState();
        bestiary.Record([(EnemyKind.Ashling, BestiaryCatalog.HunterNoteKills - 1)], []);
        Assert.IsFalse(bestiary.HunterNoteRevealed(EnemyKind.Ashling));

        bestiary.Record([(EnemyKind.Ashling, 1)], []);
        Assert.IsTrue(bestiary.HunterNoteRevealed(EnemyKind.Ashling));
        Assert.IsFalse(bestiary.Studied(EnemyKind.Ashling));

        bestiary.Record([(EnemyKind.Ashling, BestiaryCatalog.StudiedKills)], []);
        Assert.IsTrue(bestiary.Studied(EnemyKind.Ashling));
    }

    [TestMethod]
    public void Record_SlainElite_IsNewOnce_AndMarksItsCreatureAsMet()
    {
        var bestiary = new BestiaryState();

        var first = bestiary.Record([], [EliteAffix.Drowncaller, EliteAffix.None]);
        var again = bestiary.Record([], [EliteAffix.Drowncaller]);

        CollectionAssert.AreEqual(new[] { EliteAffix.Drowncaller }, first.NewElites.ToArray());
        CollectionAssert.AreEqual(new[] { EnemyKind.DrownedWraith }, first.NewCreatures.ToArray());
        Assert.IsFalse(again.HasDiscoveries);
        Assert.IsTrue(bestiary.EliteSlain(EliteAffix.Drowncaller));
    }

    [TestMethod]
    public void Snapshot_RoundTrips_AndRestoreSkipsBadData()
    {
        var bestiary = new BestiaryState();
        bestiary.Record([(EnemyKind.Penitent, 12), (EnemyKind.AshPriest, 3)], [EliteAffix.Oathshield]);

        var restored = new BestiaryState();
        restored.Restore(bestiary.Snapshot());

        Assert.AreEqual(12, restored.Kills(EnemyKind.Penitent));
        Assert.AreEqual(3, restored.Kills(EnemyKind.AshPriest));
        Assert.IsTrue(restored.EliteSlain(EliteAffix.Oathshield));

        restored.Restore(new BestiarySave(
            [new BestiarySaveEntry("Gargoyle", 5), new BestiarySaveEntry(nameof(EnemyKind.Hollow), -4), new BestiarySaveEntry("99", 3)],
            ["None", "Unknown", nameof(EliteAffix.Packblood)]));

        Assert.AreEqual(0, restored.Kills(EnemyKind.Hollow));
        Assert.IsTrue(restored.Encountered(EnemyKind.Hollow));
        Assert.IsFalse(restored.Encountered(EnemyKind.Penitent), "Restore replaces the previous state.");
        Assert.IsTrue(restored.EliteSlain(EliteAffix.Packblood));
        Assert.IsTrue(restored.Encountered(EnemyKind.Ashling));
        Assert.AreEqual(2, restored.EncounteredCount);
    }
}
