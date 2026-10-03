using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RunSimulationTests
{
    [TestMethod]
    public void Tick_OnFirstFrame_CentersPlayerInArena()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);

        var snapshot = simulation.Tick(0, default, 800, 600);

        Assert.AreEqual(400, snapshot.Player.X);
        Assert.AreEqual(300, snapshot.Player.Y);
    }
}
