using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class HuntEntranceTests
{
    [TestMethod]
    public void SelectedTrail_StagesActualSouthRoadBeforeCombatAndIgnoresMovementInput()
    {
        var run = CreateReadyHunt();
        var first = run.CreateSnapshot();
        Assert.IsTrue(first.HuntEntranceWalking);
        Assert.IsNotNull(first.Environment?.Terrain);
        Assert.AreEqual(ArenaMetricEnvelope.CombatWidth, first.World?.Width);
        Assert.AreEqual(ArenaMetricEnvelope.CombatHeight, first.World?.Height);
        var startX = first.Player.X;
        var startY = first.Player.Y;

        var current = first;
        for (var frame = 0; frame < 90 && run.HuntEntranceActive; frame++)
        {
            current = run.Tick(.05, new MovementInput(1, 0), 390, 700);
            Assert.AreEqual(first.Hud.Health, current.Hud.Health, "no damage behind or during the walk-in");
            Assert.AreEqual(first.Hud.Seconds, current.Hud.Seconds, "no combat clock during the walk-in");
            Assert.AreEqual(0, current.Enemies.Count, "no enemy spawn during the walk-in");
        }

        Assert.IsFalse(run.HuntEntranceActive, "the entrance must finish, not leave controls locked forever");
        Assert.IsTrue(current.Player.Y < startY - 40, "the actual player walks north into the map");
        Assert.IsTrue(current.Player.X != startX || current.Player.Y != startY);
        Assert.IsFalse(current.HuntEntranceWalking);
    }

    [TestMethod]
    public void ReducedMotion_CanSkipStagedWalkWithoutSkippingTheActualScene()
    {
        var run = CreateReadyHunt();
        var snapshot = run.CreateSnapshot();
        Assert.IsTrue(run.HuntEntranceActive);

        run.SkipHuntEntrance();

        var after = run.CreateSnapshot();
        Assert.IsFalse(after.HuntEntranceWalking);
        Assert.AreEqual(snapshot.Player.X, after.Player.X);
        Assert.AreEqual(snapshot.Player.Y, after.Player.Y);
        Assert.IsNotNull(after.Environment?.Terrain);
        Assert.IsNotNull(after.World);
    }

    private static RunSimulation CreateReadyHunt()
    {
        var run = new RunSimulationFactory(new FirstRandomSource())
            .Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        run.EnableHunt1Terrain();
        Assert.IsTrue(run.ChoosePrimary(SpellId.FireBolt));
        Assert.IsTrue(run.ChooseMapNode(run.AvailableMapNodes[0].Id));
        return run;
    }
}
