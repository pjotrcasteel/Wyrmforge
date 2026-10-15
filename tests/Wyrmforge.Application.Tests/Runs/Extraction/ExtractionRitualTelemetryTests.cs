using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Extraction;

[TestClass]
public sealed class ExtractionRitualTelemetryTests
{
    [TestMethod]
    public void Tick_RitualCompletes_CountsSuccessOnceAndOpensCheckpoint()
    {
        var simulation = Create();
        PrepareUnpausedSimulation(simulation);
        Assert.IsTrue(Field<RunExtractionState>(simulation, "extractionState").Start(new Vector2D(195, 350)));

        for (var frame = 0; frame < 201; frame++) simulation.Tick(.05, default, 390, 700);

        Assert.AreEqual(1, simulation.ExtractionRitualsCompleted);
        Assert.AreEqual(0, simulation.DeathsDuringExtraction);
        Assert.IsTrue(simulation.AtCheckpoint);
    }

    [TestMethod]
    public void Tick_DyingWithActiveRitual_TracksFailedExtractionWithoutReward()
    {
        var simulation = Create();
        PrepareUnpausedSimulation(simulation);
        Assert.IsTrue(Field<RunExtractionState>(simulation, "extractionState").Start(new Vector2D(195, 350)));
        var player = Field<Wyrmforge.Domain.Combat.Player.PlayerState>(simulation, "player");
        player.Health = 0;

        simulation.Tick(.05, default, 390, 700);

        Assert.AreEqual(1, simulation.DeathsDuringExtraction);
        Assert.AreEqual(0, simulation.ExtractionRitualsCompleted);
        Assert.IsFalse(simulation.EvacuationActive);
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static void PrepareUnpausedSimulation(RunSimulation simulation)
    {
        typeof(RunSimulation).GetField("developmentHunt", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, true);
        simulation.Tick(0, default, 390, 700);
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
}
