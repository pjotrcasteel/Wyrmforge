using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class FateweaveTests
{
    [TestMethod]
    public void EachSlotRewovenOnce_OtherCardsKept_OneChargeEach()
    {
        var simulation = AtFirstDraft(seed: 1204);
        var before = simulation.PendingChoices.ToArray();
        var charges = simulation.Fateweave.Charges;

        Assert.IsTrue(simulation.RerollChoice(1));

        Assert.AreEqual(charges - 1, simulation.Fateweave.Charges);
        Assert.AreEqual(before[0], simulation.PendingChoices[0]);
        Assert.AreEqual(before[2], simulation.PendingChoices[2]);
        Assert.AreNotEqual(before[1].Id, simulation.PendingChoices[1].Id);
        Assert.IsTrue(simulation.Fateweave.Slots[1].Used);
        Assert.IsFalse(simulation.RerollChoice(1), "A rewoven slot cannot be rewoven again this round.");
        Assert.AreEqual(charges - 1, simulation.Fateweave.Charges);
    }

    [TestMethod]
    public void VisibleCardsNeverDuplicate()
    {
        var simulation = AtFirstDraft(seed: 77, charges: 3);
        for (var slot = 0; slot < 3; slot++)
        {
            Assert.IsTrue(simulation.RerollChoice(slot));
            Assert.AreEqual(3, simulation.PendingChoices.Select(choice => choice.Id).Distinct().Count());
        }
    }

    [TestMethod]
    public void NewRoundClearsSlotsButNeverRefillsCharges()
    {
        var simulation = AtFirstDraft(seed: 1204);
        Assert.IsTrue(simulation.RerollChoice(0));
        var charges = simulation.Fateweave.Charges;

        Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        Assert.IsTrue(simulation.PendingChoices.Count > 0, "35 experience leaves a second level-up waiting.");

        Assert.AreEqual(charges, simulation.Fateweave.Charges);
        Assert.IsTrue(simulation.Fateweave.Slots.All(slot => !slot.Used));
    }

    [TestMethod]
    public void DepletedCharges_RefuseWithoutChangingTheDraft()
    {
        var simulation = AtFirstDraft(seed: 1204);
        while (simulation.Fateweave.Charges > 0)
            Assert.IsTrue(simulation.RerollChoice(simulation.Fateweave.Slots.ToList().FindIndex(slot => !slot.Used)));
        var before = simulation.PendingChoices.ToArray();
        var free = simulation.Fateweave.Slots.ToList().FindIndex(slot => !slot.Used);

        Assert.IsFalse(simulation.Fateweave.Slots[free].Available);
        Assert.IsFalse(simulation.RerollChoice(free));
        CollectionAssert.AreEqual(before, simulation.PendingChoices.ToArray());
    }

    [TestMethod]
    public void GoldenFlagsComeFromTheSeed_NotFromRendering()
    {
        static string Flags(RunSimulation simulation) => string.Concat(Enumerable.Range(0, 40).Select(_ =>
        {
            var flags = string.Concat(simulation.Fateweave.Slots.Select(slot => slot.Golden ? 'G' : '.'));
            return flags;
        }));

        for (var seed = 1; seed <= 30; seed++)
        {
            var first = AtFirstDraft(seed);
            var second = AtFirstDraft(seed);
            Assert.AreEqual(Flags(first), Flags(second));
            CollectionAssert.AreEqual(first.PendingChoices.Select(choice => choice.Id).ToArray(), second.PendingChoices.Select(choice => choice.Id).ToArray());
        }
    }

    [TestMethod]
    public void RerollsNeverTouchTheMainRewardStream()
    {
        var plain = AtFirstDraft(seed: 31);
        var rewoven = AtFirstDraft(seed: 31, charges: 3);
        var kept = plain.PendingChoices[2].Id;
        Assert.IsTrue(rewoven.RerollChoice(0));
        Assert.IsTrue(rewoven.RerollChoice(1));
        Assert.AreEqual(kept, rewoven.PendingChoices[2].Id);

        Assert.IsTrue(plain.ApplyChoice(kept));
        Assert.IsTrue(rewoven.ApplyChoice(kept));

        CollectionAssert.AreEqual(plain.PendingChoices.Select(choice => choice.Id).ToArray(), rewoven.PendingChoices.Select(choice => choice.Id).ToArray());
    }

    [TestMethod]
    public void GildedRefinement_GrantsTwoRanks_AndNeverPastTheCap()
    {
        var build = new RunBuildState();
        for (var rank = 0; rank < RunRefinementDefinition.MaxRank - 1; rank++) build.Refinements.Apply(RunRefinementId.Force);
        var service = new LevelChoiceService(new SeededRandomSource(5));
        var visible = service.RollForProgression(build, rewardLevel: 2, trailReward: false);
        var slot = 0;

        var gilded = service.Reweave(build, visible, slot, new HashSet<string>(), 2, false, null, gilded: true, new SeededRandomSource(9));

        Assert.IsNotNull(gilded);
        Assert.IsTrue(gilded.Gilded);
        Assert.AreNotEqual("refine:Force", gilded.Id, "Force is one rank from its cap and cannot take a gilded double rank.");
        var id = Enum.Parse<RunRefinementId>(gilded.Id["refine:".Length..]);
        var rankBefore = build.Refinements[id];
        Assert.IsTrue(service.ApplyForProgression(build, gilded, 2, false));
        Assert.AreEqual(rankBefore + 2, build.Refinements[id]);
    }

    [TestMethod]
    public void GildedBreakthrough_StaysInTheMilestonePool_AndOutranksTheCard()
    {
        var build = new RunBuildState();
        var primary = build.Spells.ActiveSpell;
        build.Spells.LearnOrUpgrade(primary);
        var support = SpellCatalog.All.First(spell => spell.School != SpellCatalog.Get(primary).School).Id;
        build.Spells.LearnOrUpgrade(support);
        var service = new LevelChoiceService(new SeededRandomSource(3));
        var pool = service.RollForProgression(build, 10, false, count: 50);
        Assert.IsTrue(pool.Any(choice => choice.Rarity == RewardRarity.Legendary), "A learned second school makes a synergy legal at level 10.");
        var visible = pool.Where(choice => choice.Rarity < RewardRarity.Legendary).Take(3).ToArray();
        Assert.AreEqual(3, visible.Length);

        Assert.IsTrue(service.CanGild(build, visible, 0, new HashSet<string>(), 10, false));
        var gilded = service.Reweave(build, visible, 0, new HashSet<string>(), 10, false, null, gilded: true, new SeededRandomSource(4))!;

        Assert.IsTrue(gilded.Gilded);
        Assert.IsTrue(gilded.Rarity > visible[0].Rarity);
        Assert.IsTrue(PowerMilestoneProfile.IsMajorChoice(build, gilded, 10));
        Assert.IsFalse(service.CanGild(build, visible, 0, new HashSet<string>(), 5, false), "Level 5 never reaches past the Rank II breakthrough.");
    }

    [TestMethod]
    public void EvolutionDraftsCannotBeRewoven()
    {
        var build = new RunBuildState();
        var primary = build.Spells.ActiveSpell;
        while (build.Spells[primary] < SpellCatalog.Get(primary).MaxRank) build.Spells.LearnOrUpgrade(primary);
        var service = new LevelChoiceService(new SeededRandomSource(1));
        var evolutions = service.RollForProgression(build, 15, false);
        Assert.IsTrue(evolutions.All(choice => choice.Kind == LevelChoiceKind.Evolution));

        Assert.IsFalse(service.CanReweave(build, evolutions, new HashSet<string>(), 15, false));
        Assert.IsFalse(service.CanGild(build, evolutions, 0, new HashSet<string>(), 15, false));
    }

    [TestMethod]
    public void GuaranteedRankTwo_HasNoAlternative()
    {
        var build = new RunBuildState();
        var service = new LevelChoiceService(new SeededRandomSource(1));
        var draft = service.RollForProgression(build, 5, false);
        Assert.AreEqual(1, draft.Count);

        Assert.IsFalse(service.CanReweave(build, draft, new HashSet<string>(), 5, false));
    }

    [TestMethod]
    public void Grants_RespectCapacity()
    {
        var ledger = new FateweaveState(new SeededRandomSource(1), startingCharges: 1, capacity: 2);

        Assert.AreEqual(1, ledger.Grant(5));
        Assert.AreEqual(2, ledger.Charges);
        Assert.AreEqual(0, ledger.Grant());
        ledger.RaiseCapacity(1);
        Assert.AreEqual(1, ledger.Grant());
        Assert.AreEqual(3, ledger.Charges);
    }

    private static RunSimulation AtFirstDraft(int seed, int charges = FateweaveState.DefaultStartingCharges)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: seed);
        simulation.FateweaveLedger.Grant(charges - simulation.FateweaveLedger.Charges);
        typeof(RunSimulation).GetMethod("GainExperience", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(simulation, [35]);
        Assert.AreEqual(3, simulation.PendingChoices.Count);
        return simulation;
    }
}