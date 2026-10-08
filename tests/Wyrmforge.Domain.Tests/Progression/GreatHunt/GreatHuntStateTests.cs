using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.GreatHunt;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Progression.GreatHunt;

[TestClass]
public sealed class GreatHuntStateTests
{
    [TestMethod]
    public void RecordRun_AbandonedOrNoCompletedTrail_DoesNotAwardFeats()
    {
        var state = new GreatHuntState();
        var evidence = Evidence(DragonId.Ashfang) with { DeepEvolvedDuels = new HashSet<DragonId> { DragonId.Ashfang } };

        Assert.AreEqual(0, state.RecordRun(evidence with { Abandoned = true }).Count);
        Assert.AreEqual(0, state.RecordRun(evidence with { CompletedRoutes = 0 }).Count);
        Assert.AreEqual(0, state.Get(DragonId.Ashfang).Feats);
    }

    [TestMethod]
    public void RecordRun_DuelRequiresDefeatedWyrmAndSecuredEssenceDoesNotRequireUnspentInventory()
    {
        var state = new GreatHuntState();
        state.RecordRun(Evidence(DragonId.Stormcoil) with
        {
            DefeatedWyrms = new HashSet<DragonId>(),
            DeepEvolvedDuels = new HashSet<DragonId> { DragonId.Stormcoil },
        });

        Assert.IsFalse(state.Get(DragonId.Stormcoil).DeepEvolvedDuel);
        state.RecordRun(Evidence(DragonId.Stormcoil) with
        {
            DeepEvolvedDuels = new HashSet<DragonId> { DragonId.Stormcoil },
            SecuredEssences = [DragonEssenceId.StormHeart],
        });

        Assert.AreEqual(3, state.Get(DragonId.Stormcoil).Feats);
        Assert.AreEqual(0, state.Get(DragonId.Ashfang).Feats);
    }

    [TestMethod]
    public void IsSealed_FourIndependentConditions_RequiresMatchingWyrmforgedLineage()
    {
        var state = new GreatHuntState();
        var mastery = new SpellMasteryState();
        state.RecordRun(Evidence(DragonId.Ashfang) with
        {
            DeepEvolvedDuels = new HashSet<DragonId> { DragonId.Ashfang },
            SecuredEssences = [DragonEssenceId.MoltenFang],
        });

        Assert.IsFalse(state.IsSealed(DragonId.Ashfang, mastery));
        for (var run = 0; run < 4; run++) mastery.RecordRun(new MasteryRunEvidence(1, 2, false,
            new HashSet<SpellId> { SpellId.FireBolt }, [new MasteryRunSpell(SpellId.FireBolt, 3)]));

        Assert.IsTrue(state.IsSealed(DragonId.Ashfang, mastery));
        Assert.AreEqual(1, state.CompletedCount(mastery));
        Assert.IsFalse(state.IsSealed(DragonId.Rimeclaw, mastery));
    }

    [TestMethod]
    public void ReconcileForgeHistory_ExistingDiscoveriesBackfillOnlyHistoricSlayAndEssence()
    {
        var forge = new ForgeProgressionState();
        forge.Restore([ForgeDiscoveryId.Rimecraft]);
        var state = new GreatHuntState();

        Assert.IsTrue(state.ReconcileForgeHistory(forge));
        Assert.IsFalse(state.ReconcileForgeHistory(forge));
        Assert.AreEqual(2, state.Get(DragonId.Rimeclaw).Feats);
        Assert.IsFalse(state.Get(DragonId.Rimeclaw).DeepEvolvedDuel);
    }

    [TestMethod]
    public void ReconcileMasteryHistory_PreexistingKillTimeWyrmFeat_RestoresSlayWithoutInventingEssenceOrDuel()
    {
        var state = new GreatHuntState();
        var mastery = new SpellMasteryState();
        mastery.RecordRun(new MasteryRunEvidence(1, 2, false,
            new HashSet<SpellId> { SpellId.FrostShard }, [new MasteryRunSpell(SpellId.FrostShard, 3)]));

        Assert.IsTrue(state.ReconcileMasteryHistory(mastery));
        Assert.IsFalse(state.ReconcileMasteryHistory(mastery));
        var entry = state.Get(DragonId.Rimeclaw);
        Assert.IsTrue(entry.Slain);
        Assert.IsFalse(entry.EssenceSecured);
        Assert.IsFalse(entry.DeepEvolvedDuel);
    }

    [TestMethod]
    public void Restore_DuplicateSavedEntriesAndLaterRuns_DoNotLoseCompletedFeats()
    {
        var state = new GreatHuntState();
        state.Restore([new GreatHuntEntry(DragonId.Voidweaver, true, false, true)]);
        state.RecordRun(Evidence(DragonId.Voidweaver) with { SecuredEssences = [DragonEssenceId.NullScale] });

        Assert.AreEqual(3, state.Get(DragonId.Voidweaver).Feats);
        CollectionAssert.AreEqual(new[] { DragonId.Voidweaver }, state.Snapshot().Select(entry => entry.Wyrm).ToArray());
    }

    [TestMethod]
    public void Next_ActiveOaths_ProvideActionableGoalsAndExcludeCompletedSeals()
    {
        var state = new GreatHuntState();
        var mastery = new SpellMasteryState();
        var fresh = GreatHuntGoalPlanner.Next(state, mastery);

        Assert.AreEqual(3, fresh.Count);
        Assert.IsTrue(fresh.All(goal => goal.Objective.StartsWith("Defeat ", StringComparison.Ordinal)));
        state.RecordRun(Evidence(DragonId.Ashfang) with
        {
            DeepEvolvedDuels = new HashSet<DragonId> { DragonId.Ashfang },
            SecuredEssences = [DragonEssenceId.CinderHeart],
        });
        for (var run = 0; run < 4; run++) mastery.RecordRun(new MasteryRunEvidence(1, 2, false,
            new HashSet<SpellId> { SpellId.FireBolt }, [new MasteryRunSpell(SpellId.FireBolt, 3)]));

        Assert.IsFalse(GreatHuntGoalPlanner.Next(state, mastery, 4).Any(goal => goal.Wyrm == DragonId.Ashfang));
    }

    private static GreatHuntRunEvidence Evidence(DragonId wyrm) => new(1, false,
        new HashSet<DragonId> { wyrm }, new HashSet<DragonId>(), []);
}
