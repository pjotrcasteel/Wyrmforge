using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class ExtractionDefenseProfileTests
{
    [TestMethod]
    public void ActiveEnemyCap_DeeperHunts_StayBounded()
    {
        Assert.AreEqual(4, ExtractionDefenseProfile.ActiveEnemyCap(1));
        Assert.AreEqual(5, ExtractionDefenseProfile.ActiveEnemyCap(2));
        Assert.AreEqual(8, ExtractionDefenseProfile.ActiveEnemyCap(100));
        Assert.IsTrue(ExtractionDefenseProfile.SpawnIntervalSeconds(3) < ExtractionDefenseProfile.SpawnIntervalSeconds(1));
    }

    [TestMethod]
    public void UpdateSpawn_AfterWyrmDefeatWithoutRitual_DoesNotResumeEndlessSpawning()
    {
        var simulation = Create();
        Set(simulation, "dragonEncounterStarted", true);
        for (var i = 0; i < 30; i++) InvokeSpawn(simulation, .5);
        Assert.AreEqual(0, Enemies(simulation).Count);
    }

    [TestMethod]
    public void UpdateSpawn_DuringRitual_SpawnsBoundedThreatAndStopsFreshWavesAtTheEnd()
    {
        var simulation = Create();
        Set(simulation, "dragonEncounterStarted", true);
        var extraction = Field<RunExtractionState>(simulation, "extractionState");
        var anchor = new Vector2D(195, 350);
        Assert.IsTrue(extraction.Start(anchor));

        for (var i = 0; i < 80; i++) InvokeSpawn(simulation, .25);
        Assert.AreEqual(ExtractionDefenseProfile.ActiveEnemyCap(1), Enemies(simulation).Count);
        Enemies(simulation).Clear();
        Assert.IsFalse(extraction.Tick(8.2, anchor));
        Assert.IsFalse(ExtractionDefenseProfile.CanSpawn(extraction.RemainingSeconds));
        for (var i = 0; i < 50; i++) InvokeSpawn(simulation, .25);
        Assert.AreEqual(0, Enemies(simulation).Count, "The final ritual countdown must not spawn new enemies.");

        Assert.IsTrue(extraction.Tick(extraction.RemainingSeconds, anchor));
        InvokeSpawn(simulation, 2);
        Assert.AreEqual(0, Enemies(simulation).Count, "Completion must not restart ambient spawning.");
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static List<EnemyState> Enemies(RunSimulation simulation) => Field<List<EnemyState>>(simulation, "enemies");

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Set(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void InvokeSpawn(RunSimulation simulation, double delta) =>
        typeof(RunSimulation).GetMethod("UpdateSpawn", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [delta, 390d, 700d]);
}
