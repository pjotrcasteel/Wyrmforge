using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.LevelUp;

[TestClass]
public sealed class FireHuntBreakthroughTests
{
    [TestMethod]
    public void MegaAndEvolution_RequireLegalMilestonesAndPreparedBuild()
    {
        var service = new LevelChoiceService(new FirstRandomSource());
        var build = new RunBuildState();
        build.Spells.TryChoosePrimary(SpellId.FireBolt);
        var mega = Card(RunUpgradeId.CinderCascade);
        var evolution = Card(RunUpgradeId.SolarWake);
        Assert.IsFalse(service.ApplyForProgression(build, mega, 10, false));
        build.RunUpgrades.Apply(RunUpgradeId.Emberbrand);
        Assert.IsFalse(service.ApplyForProgression(build, mega, 5, false));
        Assert.IsFalse(service.ApplyForProgression(build, mega, 10, true));
        Assert.IsTrue(service.ApplyForProgression(build, mega, 10, false));
        Assert.IsFalse(service.ApplyForProgression(build, mega, 10, false));
        Assert.IsFalse(service.ApplyForProgression(build, evolution, 15, false));
        build.PreparedFireballLevel = 2;
        build.PreparedFireballMutations = new HashSet<FireballMutationId> { FireballMutationId.Detonation };
        Assert.IsFalse(service.ApplyForProgression(build, evolution, 10, false));
        Assert.IsTrue(service.ApplyForProgression(build, evolution, 15, false));
        Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
        Assert.AreEqual(0, new RunBuildState().RunUpgrades[RunUpgradeId.SolarWake]);
    }

    [TestMethod]
    public void EligibleEvolution_IsInDraftPoolButCannotBypassGateThroughLegacyApply()
    {
        var build = new RunBuildState { PreparedFireballLevel = 2,
            PreparedFireballMutations = new HashSet<FireballMutationId> { FireballMutationId.ScorchedEarth } };
        build.Spells.TryChoosePrimary(SpellId.FireBolt);
        build.RunUpgrades.Apply(RunUpgradeId.Emberbrand);
        build.RunUpgrades.Apply(RunUpgradeId.CinderCascade);
        var service = new LevelChoiceService(new FirstRandomSource());
        var offers = service.RollForProgression(build, 15, false, count: 100);
        Assert.IsTrue(offers.Any(choice => choice.Id == "rune:SolarWake"));
        Assert.IsFalse(service.RollForProgression(build, 14, false, count: 100).Any(choice => choice.Id == "rune:SolarWake"));
        Assert.IsFalse(service.Apply(build, Card(RunUpgradeId.SolarWake)));
    }

    private static LevelChoice Card(RunUpgradeId id)
    {
        var definition = RunUpgradeCatalog.Get(id);
        return new($"rune:{id}", LevelChoiceKind.Rune, definition.Name, definition.Description, definition.Icon, 0, 1);
    }
}
