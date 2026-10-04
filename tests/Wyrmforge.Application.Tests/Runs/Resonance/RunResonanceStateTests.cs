using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class RunResonanceStateTests
{
    [TestMethod]
    public void Calculate_CombinesWyrmwebSpellAndRouteResonance()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.ChainLightning));
        var stormNode = new WyrmrealmMapNode(
            "storm-trail",
            "Storm Trail",
            new WyrmrealmNodePosition(1, 0),
            WyrmrealmNodeType.Combat,
            new WyrmrealmRouteProfile(new WyrmrealmEncounterProfile(WyrmrealmEncounterKind.Mixed), new WyrmrealmRewardProfile(SpellSchool.Storm)),
            new WyrmrealmNodeGraph(Array.Empty<string>()));
        var state = new RunResonanceState(new HashSet<string> { "storm-1" });

        var resonance = state.Calculate(build, [stormNode]);

        Assert.AreEqual(8, resonance.Single(entry => entry.School == SpellSchool.Storm).Value);
        Assert.AreEqual(3, resonance.Single(entry => entry.School == SpellSchool.Arcane).Value);
    }

    [TestMethod]
    public void Calculate_SelectedSynergyAddsResonanceToEachRequiredSchool()
    {
        var build = new RunBuildState();
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FireBolt));
        Assert.IsTrue(build.Spells.LearnOrUpgrade(SpellId.FrostShard));
        Assert.IsTrue(build.Synergies.Select(SynergyId.Frostfire, build.Spells));
        var state = new RunResonanceState(new HashSet<string>());

        var resonance = state.Calculate(build, Array.Empty<WyrmrealmMapNode>());

        Assert.AreEqual(5, resonance.Single(entry => entry.School == SpellSchool.Fire).Value);
        Assert.AreEqual(5, resonance.Single(entry => entry.School == SpellSchool.Frost).Value);
    }
}
