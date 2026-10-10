using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EnemyStagePressureTests
{
    [TestMethod]
    public void OpeningRamp_DeeperHuntsKeepFullPressureAndInvalidStagesClamp()
    {
        for (var stage = 1; stage <= 6; stage++)
        {
            Assert.AreEqual(EnemyEncounterComposition.GetActiveEnemyCap(2), EnemyStagePressure.ActiveEnemyCap(stage, 2));
            Assert.AreEqual(1d, EnemyStagePressure.OpeningSpawnIntervalMultiplier(stage, 2));
        }
        Assert.AreEqual(EnemyStagePressure.ActiveEnemyCap(1, 1), EnemyStagePressure.ActiveEnemyCap(0, 1));
        Assert.AreEqual(EnemyStagePressure.ActiveEnemyCap(6, 1), EnemyStagePressure.ActiveEnemyCap(99, 1));
        Assert.AreEqual(1d, EnemyStagePressure.OpeningSpawnIntervalMultiplier(6, 1));
    }

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
        Assert.AreEqual(1.36d, EnemyStagePressure.HealthMultiplier(6), 0.0001);
        Assert.AreEqual(1.30d, EnemyStagePressure.SpeedMultiplier(6), 0.0001);
        Assert.AreEqual(0.44d, EnemyStagePressure.SpawnIntervalSeconds(6), 0.0001);
    }

    [TestMethod]
    public void StageOutsideMapRange_ClampsToImplementedBounds()
    {
        Assert.AreEqual(EnemyStagePressure.HealthMultiplier(1), EnemyStagePressure.HealthMultiplier(0));
        Assert.AreEqual(EnemyStagePressure.SpawnIntervalSeconds(6), EnemyStagePressure.SpawnIntervalSeconds(99));
    }
}
