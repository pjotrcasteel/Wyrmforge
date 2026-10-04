using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class LevelChoiceServiceTests
{
    [TestMethod]
    public void Roll_WhenOnlyStarterSpellIsKnown_OffersNewSpell()
    {
        var service = new LevelChoiceService(new FirstRandomSource());
        var choices = service.Roll(new RunBuildState());

        Assert.AreEqual(3, choices.Count);
        Assert.IsTrue(choices.Any(choice => choice.Kind == LevelChoiceKind.NewSpell));
    }

    [TestMethod]
    public void Roll_WhenSynergyBecomesAvailable_SurfacesSynergyFirst()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FrostShard));
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(build);

        Assert.AreEqual(LevelChoiceKind.Synergy, choices[0].Kind);
        Assert.AreEqual("Frostfire", choices[0].Name);
    }

    [TestMethod]
    public void Roll_WithPreferredSchool_GuaranteesMatchingSpellChoice()
    {
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(new RunBuildState(), SpellSchool.Storm);

        Assert.IsTrue(choices.Any(choice => choice.Id == $"spell:{SpellId.ChainLightning}"));
    }
}
