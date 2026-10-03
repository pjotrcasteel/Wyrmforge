using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EnemyEncounterCompositionTests
{
    [TestMethod]
    public void Swarm_ContainsOnlyChasersAndUsesFastCadence()
    {
        for (var index = 0; index < EnemyEncounterComposition.SpawnsPerPattern; index++)
        {
            Assert.AreEqual(EnemyKind.Chaser, EnemyEncounterComposition.GetEnemyKind(EnemyEncounterPattern.Swarm, index));
        }

        Assert.AreEqual(0.55d, EnemyEncounterComposition.GetSpawnIntervalMultiplier(EnemyEncounterPattern.Swarm));
    }

    [TestMethod]
    public void StalkerPressure_AlternatesStalkersAndChasers()
    {
        var kinds = Enumerable.Range(0, EnemyEncounterComposition.SpawnsPerPattern)
            .Select(index => EnemyEncounterComposition.GetEnemyKind(EnemyEncounterPattern.StalkerPressure, index))
            .ToArray();

        CollectionAssert.AreEqual(
            new[] { EnemyKind.RiftStalker, EnemyKind.Chaser, EnemyKind.RiftStalker, EnemyKind.Chaser, EnemyKind.RiftStalker, EnemyKind.Chaser },
            kinds);
    }

    [TestMethod]
    public void SelectNext_NeverRepeatsPreviousPattern()
    {
        foreach (var pattern in Enum.GetValues<EnemyEncounterPattern>())
        {
            Assert.AreNotEqual(pattern, EnemyEncounterComposition.SelectNext(pattern, 0));
            Assert.AreNotEqual(pattern, EnemyEncounterComposition.SelectNext(pattern, 1));
        }
    }
}
