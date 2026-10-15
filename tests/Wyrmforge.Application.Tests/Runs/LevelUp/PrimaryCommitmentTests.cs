using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class PrimaryCommitmentTests
{
    [TestMethod]
    [DataRow(SpellId.ArcaneOrb)]
    [DataRow(SpellId.FireBolt)]
    [DataRow(SpellId.FrostShard)]
    [DataRow(SpellId.ChainLightning)]
    public void TryChoosePrimary_OpeningChoice_StaysCommittedAndUsesExactlyOneStarter(SpellId primary)
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.TryChoosePrimary(primary));
        Assert.IsTrue(spells.IsPrimaryCommitted);
        Assert.AreEqual(primary, spells.ActiveSpell);
        Assert.AreEqual(1, spells.LearnedCount);
        Assert.AreEqual(1, spells[primary]);
        Assert.IsFalse(spells.TryChoosePrimary(SpellId.ArcaneOrb));
        Assert.IsFalse(spells.TryFocus(SpellId.ArcaneOrb));
        Assert.AreEqual(primary, spells.ActiveSpell);
    }

    [TestMethod]
    public void Roll_CommittedPrimary_OffersOnlyPrimaryRanksRunesAndCompatibleSynergies()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
        var service = new LevelChoiceService(new FirstRandomSource());
        var opening = service.Roll(build, count: 50);
        Assert.IsTrue(opening.Any(choice => choice.Id == "spell:FireBolt"));
        Assert.IsFalse(opening.Any(choice => choice.Id.StartsWith("focus:", StringComparison.Ordinal)));
        Assert.IsFalse(opening.Any(choice => choice.Kind == LevelChoiceKind.NewSpell));
        Assert.IsFalse(opening.Any(choice => choice.Id is "spell:ArcaneOrb" or "spell:FrostShard" or "spell:ChainLightning"));

        Assert.IsTrue(service.Apply(build, opening.Single(choice => choice.Id == "spell:FireBolt")));
        var second = service.Roll(build, count: 50);
        var fusion = second.Single(choice => choice.Id == "synergy:Frostfire");
        Assert.IsTrue(service.Apply(build, fusion));
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        Assert.AreEqual(2, build.Spells[SpellId.FireBolt]);
        Assert.AreEqual(1, build.Spells[SpellId.FrostShard], "Combination learns the required supporting school without replacing the cast.");
        Assert.IsTrue(build.Synergies.Contains(SynergyId.Frostfire));
    }

    [TestMethod]
    public void Apply_StalePivotChoices_RejectedWithoutSpendingRankOrChangingSpell()
    {
        var build = new RunBuildState();
        var service = new LevelChoiceService(new FirstRandomSource());
        var staleSpell = service.Roll(build, count: 50).Single(choice => choice.Id == "spell:FrostShard");
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));

        Assert.IsFalse(service.Apply(build, staleSpell));
        Assert.AreEqual(0, build.Spells[SpellId.FrostShard]);
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
    }

    [TestMethod]
    public void Roll_OffSchoolRoute_ProvidesRelevantAttunementInsteadOfDeadDamage()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.Roll(build, SpellSchool.Storm);
        Assert.IsTrue(choices.Any(choice => choice.Id == "spell:FireBolt"));
        Assert.IsFalse(choices.Any(choice => choice.Id == "power:Storm"));
        Assert.IsFalse(choices.Any(choice => choice.Kind == LevelChoiceKind.NewSpell));
    }

    [TestMethod]
    public void ChoosePrimary_RunSimulation_OnlyAllowsOneStartingSelectionBeforeCombat()
    {
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(new FirstRandomSource()), new FirstRandomSource());
        Assert.IsFalse(simulation.PrimaryCommitted);
        Assert.IsTrue(simulation.PrimaryChoices.Any(choice => choice.Id == SpellId.ChainLightning));
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.ChainLightning));
        Assert.IsTrue(simulation.PrimaryCommitted);
        Assert.IsFalse(simulation.ChoosePrimary(SpellId.FireBolt));
        var snapshot = simulation.CreateSnapshot();
        Assert.AreEqual(SpellId.ChainLightning, snapshot.Hud.Spells.Single().Id);
    }
}
