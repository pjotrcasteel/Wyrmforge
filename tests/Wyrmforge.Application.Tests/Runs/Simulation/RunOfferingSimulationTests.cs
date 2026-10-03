using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RunOfferingSimulationTests
{
    [TestMethod]
    public void CreateSnapshot_WithCinderHeartOffering_StartsWithFireBoltLearned()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random, DragonEssenceId.CinderHeart);

        var snapshot = simulation.CreateSnapshot();

        Assert.IsTrue(snapshot.Hud.Spells.Any(spell => spell.Name == "Fire Bolt" && spell.Rank == 1));
        Assert.AreEqual(DragonEssenceId.CinderHeart, simulation.Offering);
    }
}
