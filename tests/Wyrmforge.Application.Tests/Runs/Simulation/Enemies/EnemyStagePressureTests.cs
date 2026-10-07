using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EnemyStagePressureTests
{
    [TestMethod]
    public void StageOne_UsesBaselinePressure()
    {
        Assert.AreEqual(1d, EnemyStagePressure.HealthMultiplier(1));
        Assert.AreEqual(1d, EnemyStagePressure.SpeedMultiplier(1));
        Assert.AreEqual(0.65d, EnemyStagePressure.SpawnIntervalSeconds(1));
    }

    [TestMethod]
    public void LaterStages_IncreasePressureWithoutDependingOnElapsedTime()
    {
        Assert.AreEqual(1.36d, EnemyStagePressure.HealthMultiplier(4), 0.0001);
        Assert.AreEqual(1.30d, EnemyStagePressure.SpeedMultiplier(4), 0.0001);
        Assert.AreEqual(0.44d, EnemyStagePressure.SpawnIntervalSeconds(4), 0.0001);
    }

    [TestMethod]
    public void StageOutsideMapRange_ClampsToImplementedBounds()
    {
        Assert.AreEqual(EnemyStagePressure.HealthMultiplier(1), EnemyStagePressure.HealthMultiplier(0));
        Assert.AreEqual(EnemyStagePressure.SpawnIntervalSeconds(4), EnemyStagePressure.SpawnIntervalSeconds(99));
    }
}
