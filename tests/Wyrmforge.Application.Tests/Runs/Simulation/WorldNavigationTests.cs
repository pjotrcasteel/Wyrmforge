using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class WorldNavigationTests
{
    [TestMethod]
    public void Tick_CombatRoute_UsesWorldBiggerThanViewportAndCameraIndependentPosition()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var initial = simulation.Tick(0, default, 390, 844);
        Assert.IsNotNull(initial.World);
        Assert.IsGreaterThan(390, initial.World.Width);
        Assert.IsGreaterThan(844, initial.World.Height);
        Assert.IsGreaterThan(390, initial.Player.X);
        Assert.IsGreaterThan(844, initial.Player.Y);
        var next = simulation.Tick(.05, new MovementInput(1, 0), 390, 844);
        Assert.IsGreaterThan(initial.Player.X, next.Player.X);
        Assert.AreEqual(initial.World, next.World);
    }

    [TestMethod]
    public void Tick_WorldBoundary_ClampsToWorldInsteadOfCanvas()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var scene = simulation.Tick(0, default, 390, 844);
        Assert.IsNotNull(scene.World);
        var field = typeof(RunSimulation).GetField("player", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var player = (Wyrmforge.Domain.Combat.Player.PlayerState)field.GetValue(simulation)!;
        player.Position = new Vector2D(scene.World.Width - player.Radius - 2, scene.World.Height / 2);
        var next = simulation.Tick(.05, new MovementInput(1, 0), 390, 844);
        Assert.IsLessThanOrEqualTo(scene.World.Width - player.Radius, next.Player.X);
        Assert.IsGreaterThan(390, next.Player.X);
    }
}
