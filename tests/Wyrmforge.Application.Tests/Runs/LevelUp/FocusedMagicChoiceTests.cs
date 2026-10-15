using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

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
}
