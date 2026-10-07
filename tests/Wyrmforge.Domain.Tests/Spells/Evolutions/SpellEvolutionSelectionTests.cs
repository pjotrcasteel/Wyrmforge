using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Domain.Tests.Spells.Evolutions;

[TestClass]
public sealed class SpellEvolutionSelectionTests
{
    [TestMethod]
    public void Select_BeforeSpellReachesRankThree_ReturnsFalse()
    {
        var spells = new SpellBook();
        var selection = new SpellEvolutionSelection();

        var selected = selection.Select(SpellEvolutionId.RiftSpear, spells);

        Assert.IsFalse(selected);
        Assert.IsNull(selection.For(SpellId.ArcaneOrb));
    }

    [TestMethod]
    public void Select_AfterSpellReachesRankThree_ClosesSisterBranch()
    {
        var spells = new SpellBook();
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        Assert.IsTrue(spells.LearnOrUpgrade(SpellId.ArcaneOrb));
        var selection = new SpellEvolutionSelection();

        Assert.IsTrue(selection.Select(SpellEvolutionId.RiftSpear, spells));
        Assert.IsFalse(selection.Select(SpellEvolutionId.StarSwarm, spells));
        Assert.AreEqual(SpellEvolutionId.RiftSpear, selection.For(SpellId.ArcaneOrb));
    }
}
