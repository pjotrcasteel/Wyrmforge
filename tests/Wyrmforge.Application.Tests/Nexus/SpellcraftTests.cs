using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Nexus;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class SpellcraftTests
{
    private static readonly HashSet<string> NoNodes = [];

    [TestMethod]
    public void Families_CoverEveryPairOfTheFourElementsOnce()
    {
        Assert.AreEqual(6, Spellcraft.Families.Count);
        foreach (var a in Spellcraft.Elements)
            foreach (var b in Spellcraft.Elements.Where(other => other != a))
                Assert.AreEqual(1, Spellcraft.Families.Count(family => family.Joins(a, b)), $"{a}+{b}");
    }

    [TestMethod]
    public void Recipes_SitInTheSeatOrderOfTheirFoundation()
    {
        Assert.AreEqual((SpellSchool.Fire, SpellSchool.Frost), Spellcraft.SeatsOf(LaboratoryCatalog.Get(LaboratoryMutationId.RimeInfusion)));
        Assert.AreEqual((SpellSchool.Arcane, SpellSchool.Storm), Spellcraft.SeatsOf(LaboratoryCatalog.Get(LaboratoryMutationId.StormInfusion)));
        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, Spellcraft.RecipeFor(SpellSchool.Fire, SpellSchool.Frost)!.Id);
        Assert.IsNull(Spellcraft.RecipeFor(SpellSchool.Frost, SpellSchool.Fire));
    }

    [TestMethod]
    public void Circle_GuidesEmptyPartialAndSameElementSeats()
    {
        var lab = new LaboratoryState();
        var vault = new DragonEssenceVault();

        Assert.AreEqual(SpellcraftState.Empty, Spellcraft.Circle(null, null, lab, vault, NoNodes).State);
        Assert.AreEqual(SpellcraftState.AwaitingInfusion, Spellcraft.Circle(SpellSchool.Fire, null, lab, vault, NoNodes).State);
        Assert.AreEqual(SpellcraftState.AwaitingInfusion, Spellcraft.Circle(null, SpellSchool.Frost, lab, vault, NoNodes).State);
        var same = Spellcraft.Circle(SpellSchool.Storm, SpellSchool.Storm, lab, vault, NoNodes);
        Assert.AreEqual(SpellcraftState.SameElement, same.State);
        Assert.IsNull(same.Family);
    }

    [TestMethod]
    public void Circle_KnownRecipe_HidesItsNameUntilDiscovered()
    {
        var lab = new LaboratoryState();
        var vault = new DragonEssenceVault();

        var circle = Spellcraft.Circle(SpellSchool.Fire, SpellSchool.Frost, lab, vault, NoNodes);

        Assert.AreEqual(SpellcraftState.Research, circle.State);
        Assert.AreEqual("Frostfire", circle.Title, "The family is known; the recipe's name is earned.");
        Assert.AreEqual(NexusResearchStage.NeedsMaterial, circle.Research!.Stage);
        Assert.AreEqual(3, circle.Research.ConditionsNeeded);
    }

    [TestMethod]
    public void Circle_ReversedOrderIsSealedWithAnHonestClue()
    {
        var circle = Spellcraft.Circle(SpellSchool.Frost, SpellSchool.Fire, new LaboratoryState(), new DragonEssenceVault(), NoNodes);

        Assert.AreEqual(SpellcraftState.Sealed, circle.State);
        Assert.AreEqual("Frostfire", circle.Family!.Name);
        StringAssert.Contains(circle.Text, "begins with Fire");
    }

    [TestMethod]
    public void Circle_UnwrittenFamilyIsSealedWithoutAClue()
    {
        var circle = Spellcraft.Circle(SpellSchool.Fire, SpellSchool.Storm, new LaboratoryState(), new DragonEssenceVault(), NoNodes);

        Assert.AreEqual(SpellcraftState.Sealed, circle.State);
        Assert.AreEqual("Flashpoint", circle.Title);
        Assert.IsFalse(circle.Text.Contains("begins with"));
    }

    [TestMethod]
    public void Grimoire_AndLog_RecordFailuresAsKnowledge()
    {
        var lab = new LaboratoryState();
        var vault = new DragonEssenceVault();
        vault.Store(DragonEssenceId.RimeHeart);
        Assert.IsFalse(lab.Run(LaboratoryExperimentId.ExamineRimeHeart, vault).Rejected);
        Assert.IsFalse(lab.Run(LaboratoryExperimentId.QuenchFireBoltInRime, vault).Rejected);

        var log = Spellcraft.Log(lab);
        CollectionAssert.AreEqual(
            new[] { LaboratoryExperimentOutcome.Insight, LaboratoryExperimentOutcome.Incompatibility },
            log.Select(entry => entry.Outcome).ToArray());

        var grimoire = Spellcraft.Grimoire(lab, vault, NoNodes);
        Assert.AreEqual(6, grimoire.Count);
        var frostfire = grimoire.Single(page => page.Family.Name == "Frostfire");
        Assert.IsTrue(frostfire.Studied);
        Assert.IsFalse(frostfire.Known);
        Assert.AreEqual(SpellSchool.Fire, frostfire.RecipeFoundation);
        Assert.IsNull(grimoire.Single(page => page.Family.Name == "Glacial Echo").Research);
        Assert.IsNotNull(grimoire.Single(page => page.Family.Name == "Arcane Conduit").Research);
    }
}
