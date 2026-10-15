using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class FocusedMagicChoiceTests
{
    [TestMethod]
    public void Apply_NewPrimary_PreservesPreviousLearnedSpell()
    {
        var build = new RunBuildState();
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "spell:FireBolt");

        Assert.IsTrue(service.Apply(build, choice));

        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        Assert.AreEqual(1, build.Spells[SpellId.ArcaneOrb]);
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
    }

    [TestMethod]
    public void Apply_KnownSpellUpgrade_ExplicitlySwitchesPrimary()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "spell:FireBolt");

        Assert.IsTrue(service.Apply(build, choice));

        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        StringAssert.Contains(choice.Description, "Replaces Arcane Orb");
        Assert.AreEqual(2, build.Spells[SpellId.FireBolt]);
    }

    [TestMethod]
    public void Apply_FocusMasteredKnownSpell_ChangesPrimaryWithoutLosingRanks()
    {
        var build = new RunBuildState();
        while (build.Spells.LearnOrUpgrade(SpellId.FireBolt)) { }
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "focus:FireBolt");

        Assert.AreEqual(LevelChoiceKind.SpellFocus, choice.Kind);
        Assert.IsTrue(service.Apply(build, choice));
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        Assert.AreEqual(3, build.Spells[SpellId.FireBolt]);
    }

    [TestMethod]
    public void TryFocus_UnlearnedSpell_LeavesPrimaryUnchanged()
    {
        var spells = new SpellBook();
        Assert.IsFalse(spells.TryFocus(SpellId.FireBolt));
        Assert.AreEqual(SpellId.ArcaneOrb, spells.ActiveSpell);
    }

    [TestMethod]
    [DataRow(SpellId.ArcaneOrb, SynergyId.Frostfire, false)]
    [DataRow(SpellId.FireBolt, SynergyId.Frostfire, true)]
    [DataRow(SpellId.FrostShard, SynergyId.Frostfire, true)]
    [DataRow(SpellId.FrostShard, SynergyId.Stormglass, false)]
    [DataRow(SpellId.ChainLightning, SynergyId.Stormglass, true)]
    [DataRow(SpellId.ChainLightning, SynergyId.ArcaneConduit, false)]
    [DataRow(SpellId.ArcaneOrb, SynergyId.ArcaneConduit, true)]
    public void Roll_CombinationRequirementsLearned_OnlyOffersCompatiblePrimary(SpellId primary, SynergyId synergy, bool expected)
    {
        var build = new RunBuildState();
        foreach (var spell in new[] { SpellId.FireBolt, SpellId.FrostShard, SpellId.ChainLightning }) build.Spells.LearnOrUpgrade(spell);
        build.Spells.TryFocus(primary);
        var service = new LevelChoiceService(new FirstRandomSource());

        var offered = service.Roll(build, count: 50).Any(choice => choice.Id == $"synergy:{synergy}");

        Assert.AreEqual(expected, offered);
    }

    [TestMethod]
    public void Roll_ReadyCombinationAndRouteAttunement_OffersBoth()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FrostShard);
        build.Spells.TryFocus(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(build, SpellSchool.Fire);

        Assert.IsTrue(choices.Any(choice => choice.Id == "synergy:Frostfire"));
        Assert.IsTrue(choices.Any(choice => choice.Id == "spell:FireBolt"));
    }

    [TestMethod]
    public void Apply_CombinationCardAfterIncompatibleFocusChange_RejectsWithoutSpendingUnlock()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FrostShard);
        build.Spells.TryFocus(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "synergy:Frostfire");
        build.Spells.TryFocus(SpellId.ArcaneOrb);

        Assert.IsFalse(service.Apply(build, choice));
        Assert.IsFalse(build.Synergies.Contains(SynergyId.Frostfire));
    }

    [TestMethod]
    public void Roll_NewSpellCannotHostCompletedCombination_DoesNotPromiseCombinationNext()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.ChainLightning);
        build.Spells.TryFocus(SpellId.ChainLightning);
        var service = new LevelChoiceService(new FirstRandomSource(), new HashSet<SpellId> { SpellId.FrostShard });

        var converge = service.Roll(build).Single(choice => choice.Role == LevelChoiceDraftRole.Converge);

        Assert.AreEqual("spell:FrostShard", converge.Id);
        Assert.IsFalse(converge.Hint!.Contains("Stormglass", StringComparison.Ordinal));
    }

    [TestMethod]
    public void Apply_RankTwoPrimaryWithUnlockedSupport_AcquiresCombinationWithoutSwitching()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.TryFocus(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "synergy:Frostfire");

        Assert.AreEqual(0, build.Spells[SpellId.FrostShard]);
        Assert.IsTrue(service.Apply(build, choice));

        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        Assert.AreEqual(2, build.Spells[SpellId.FireBolt]);
        Assert.AreEqual(1, build.Spells[SpellId.FrostShard]);
        Assert.IsTrue(build.Synergies.Contains(SynergyId.Frostfire));
        Assert.IsFalse(service.Apply(build, choice));
        Assert.AreEqual(1, build.Spells[SpellId.FrostShard]);
        StringAssert.Contains(choice.Description, "Keeps Fire Bolt");
    }

    [TestMethod]
    public void Roll_RankOnePrimaryWithUnlearnedSupport_RequiresPrimaryUpgradeFirst()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.TryFocus(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());

        Assert.IsFalse(service.Roll(build, count: 50).Any(choice => choice.Id == "synergy:Frostfire"));
    }

    [TestMethod]
    public void Apply_LockedSupportingMagic_RejectsCombinationWithoutLearningIt()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.TryFocus(SpellId.FireBolt);
        var unrestricted = new LevelChoiceService(new FirstRandomSource());
        var choice = unrestricted.Roll(build, count: 50).Single(choice => choice.Id == "synergy:Frostfire");
        var restricted = new LevelChoiceService(new FirstRandomSource(), new HashSet<SpellId> { SpellId.ArcaneOrb, SpellId.FireBolt });

        Assert.IsFalse(restricted.Roll(build, count: 50).Any(item => item.Id == choice.Id));
        Assert.IsFalse(restricted.Apply(build, choice));
        Assert.AreEqual(0, build.Spells[SpellId.FrostShard]);
        Assert.IsFalse(build.Synergies.Contains(SynergyId.Frostfire));
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
    }

    [TestMethod]
    public void Apply_AlreadyRankedSupportingMagic_PreservesItsRank()
    {
        var build = new RunBuildState();
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        while (build.Spells.LearnOrUpgrade(SpellId.FrostShard)) { }
        build.Spells.TryFocus(SpellId.FireBolt);
        var service = new LevelChoiceService(new FirstRandomSource());
        var choice = service.Roll(build, count: 50).Single(choice => choice.Id == "synergy:Frostfire");

        Assert.IsTrue(service.Apply(build, choice));

        Assert.AreEqual(3, build.Spells[SpellId.FrostShard]);
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
    }
}
