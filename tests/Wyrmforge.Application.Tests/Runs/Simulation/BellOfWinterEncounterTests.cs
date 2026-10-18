using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class BellOfWinterEncounterTests
{
    [TestMethod]
    public void FrostLairRoad_IsTheBellOfWinter_AndItComesAlone()
    {
        var (simulation, _, enemies) = Fight(21);
        Assert.AreEqual(EnemyKind.BellOfWinter, simulation.BellRoadKind);
        Assert.AreEqual(EnemyKind.BellOfWinter, enemies.Single().Kind, "No reinforcements: the winter bell boxes in, it does not rally.");
        Assert.IsNotNull(enemies.Single().WinterBell);
        var snapshot = simulation.CreateSnapshot();
        Assert.AreEqual("winter", snapshot.BellWarden!.Variant);
        Assert.AreEqual("Silence the Bell of Winter", snapshot.Trail!.Objective);
        Assert.IsTrue(simulation.MapNodes.Where(node => node.PreLair).All(node => node.EncounterName == "Bell of Winter"));
    }

    [TestMethod]
    public void Slam_HitsInTheCrater_AndLeavesPermafrostThatStaysAndTakesGrip()
    {
        var (simulation, player, enemies) = Fight(22);
        var bell = enemies.Single();
        bell.Position = player.Position + new Vector2D(160, 0);
        for (var step = 0; step < 200 && bell.WinterBell!.Phase != BellOfWinterPhase.Windup; step++) Step(simulation, 0.05);
        Assert.AreEqual(BellOfWinterMove.Slam, bell.WinterBell!.Move);
        Assert.AreEqual("winter-slam", simulation.CreateSnapshot().Enemies.Single().Telegraph!.Kind);
        player.Position = bell.WinterBell.Target;
        for (var step = 0; step < 60 && bell.WinterBell.Phase == BellOfWinterPhase.Windup; step++) Step(simulation, 0.05);
        Assert.IsLessThan(player.MaxHealth, player.Health);
        var scars = simulation.CreateSnapshot().PermafrostScars;
        Assert.HasCount(BellOfWinterBehaviorState.SlamScars, scars);

        var scar = scars[0];
        player.Position = new Vector2D((scar.X1 + scar.X2) / 2, (scar.Y1 + scar.Y2) / 2);
        Assert.IsTrue(Property<bool>(simulation, "PlayerOnBlackIce"), "Permafrost is ice underfoot.");
        player.Position = new Vector2D(-500, -500);
        Assert.IsFalse(Property<bool>(simulation, "PlayerOnBlackIce"));

        Invoke(simulation, "UpdateWinterBellHazards", RunSimulation.PermafrostScarSeconds / 2);
        Assert.HasCount(BellOfWinterBehaviorState.SlamScars, simulation.CreateSnapshot().PermafrostScars, "The scars outlast the fight's next moves.");
        Invoke(simulation, "UpdateWinterBellHazards", RunSimulation.PermafrostScarSeconds);
        Assert.IsEmpty(simulation.CreateSnapshot().PermafrostScars);
    }

    [TestMethod]
    public void TollRing_SparesAHunterInAnOpenLane_AndHitsOneOutsideOnce()
    {
        foreach (var inLane in new[] { true, false })
        {
            var (simulation, player, enemies) = Fight(23);
            var bell = enemies.Single();
            bell.Position = player.Position + new Vector2D(600, 0);
            for (var step = 0; step < 200 && bell.WinterBell!.Phase != BellOfWinterPhase.Windup; step++) Step(simulation, 0.05);
            Assert.AreEqual(BellOfWinterMove.Toll, bell.WinterBell!.Move);
            for (var step = 0; step < 60 && bell.WinterBell.Phase == BellOfWinterPhase.Windup; step++) Step(simulation, 0.05);
            enemies.Clear();
            var rings = simulation.CreateSnapshot().WinterRings;
            Assert.HasCount(BellOfWinterBehaviorState.TollRings, rings);

            // Only the first ring: a hunter placed inside its lane (or not) at mid radius as it rolls through.
            var first = rings[0];
            var pending = Field<System.Collections.IList>(simulation, "winterRings");
            while (pending.Count > 1) pending.RemoveAt(pending.Count - 1);
            var angle = inLane ? first.GapAngles[0] : first.GapAngles[0] + Math.PI / 3;
            var radius = (RunSimulation.WinterRingStartRadius + RunSimulation.WinterRingMaxRadius) / 2;
            player.Position = new Vector2D(first.X, first.Y) + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * radius;
            player.Health = player.MaxHealth;
            var hits = 0;
            for (var time = 0d; time < RunSimulation.WinterRingExpandSeconds + 0.1; time += 0.05)
            {
                Invoke(simulation, "BeginPlayerDamageFrame", 0.05);
                Invoke(simulation, "UpdateWinterBellHazards", 0.05);
                var before = player.Health;
                Invoke(simulation, "ResolvePlayerDamage");
                if (player.Health < before) hits++;
            }
            Assert.AreEqual(inLane ? 0 : 1, hits, inLane ? "The open lane is safe." : "A ring hits once.");
        }
    }

    [TestMethod]
    public void Recall_DropsIciclesOnTheScars_AndClearsTheFloor()
    {
        var (simulation, player, enemies) = Fight(24);
        var bell = enemies.Single();
        Invoke(simulation, "AddPermafrostScar", player.Position + new Vector2D(200, 0), new Vector2D(1, 0));
        Invoke(simulation, "RecallIcicles", bell.WinterBell!);
        var snapshot = simulation.CreateSnapshot();
        Assert.IsEmpty(snapshot.PermafrostScars, "The scars are consumed by the recall.");
        Assert.HasCount(3, snapshot.Icicles, "The hunter's spot, then the scar's middle and tip.");
        Assert.IsTrue(snapshot.Icicles.All(icicle => !icicle.Fallen));

        player.Position = new Vector2D(snapshot.Icicles[0].X, snapshot.Icicles[0].Y);
        player.Health = player.MaxHealth;
        for (var time = 0d; time < RunSimulation.IcicleFallSeconds + 0.1; time += 0.05)
        {
            Invoke(simulation, "BeginPlayerDamageFrame", 0.05);
            Invoke(simulation, "UpdateWinterBellHazards", 0.05);
            Invoke(simulation, "ResolvePlayerDamage");
        }
        Assert.IsLessThan(player.MaxHealth, player.Health, "Staying under a marked icicle is punished.");
        for (var time = 0d; time < 1; time += 0.05) Invoke(simulation, "UpdateWinterBellHazards", 0.05);
        Assert.IsEmpty(simulation.CreateSnapshot().Icicles);
    }

    [TestMethod]
    public void EmptyFloorRecall_RingsTheHunter()
    {
        var (simulation, _, enemies) = Fight(25);
        Invoke(simulation, "RecallIcicles", enemies.Single().WinterBell!);
        Assert.HasCount(5, simulation.CreateSnapshot().Icicles);
    }

    [TestMethod]
    public void OverflowStopsAtHalf_RimeClearsHangingIcicles_ThenDeathOpensTheRoad()
    {
        var (simulation, _, enemies) = Fight(26);
        var bell = enemies.Single();
        Invoke(simulation, "RecallIcicles", bell.WinterBell!);
        Invoke(simulation, "DamageTarget", bell, bell.MaxHealth * 5, null, null);
        Assert.AreEqual(bell.MaxHealth * BellOfWinterBehaviorState.RimeHealthFraction, bell.Health, 1e-9);
        Assert.AreEqual(BellOfWinterPhase.Rime, bell.WinterBell!.Phase);
        Assert.AreEqual(1, simulation.WinterBellRimes);
        Assert.IsEmpty(simulation.CreateSnapshot().Icicles, "The rime is a true free window.");
        Assert.AreEqual("winter-rime", simulation.CreateSnapshot().Enemies.Single().Telegraph!.Kind);

        Invoke(simulation, "AddPermafrostScar", bell.Position, new Vector2D(0, 1));
        Invoke(simulation, "DamageTarget", bell, bell.Health * 10 + 1, null, null);
        Assert.IsNotNull(simulation.BellWardenDefeat);
        Assert.IsEmpty(simulation.CreateSnapshot().PermafrostScars, "Its winter thaws with it.");
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.IsTrue(simulation.PendingMapChoice || Field<bool>(simulation, "trailExitPending"));
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Fight(int seed)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, region: RegionCatalog.FrostRegionId);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        for (var hop = 0; hop < 20 && !simulation.AvailableMapNodes.Any(node => node.PreLair); hop++)
        {
            var node = simulation.AvailableMapNodes.Where(node => node.Type == WyrmrealmNodeType.Combat).OrderBy(node => node.Id).First();
            Assert.IsTrue(simulation.ChooseMapNode(node.Id));
            for (var kill = map.CurrentNodeKills; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill();
        }
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.Single(node => node.PreLair).Id));
        simulation.Tick(0, default, 390, 700);
        for (var time = 0d; time < 6 && simulation.BellWardenStage != BellWardenStage.Fight; time += 0.05)
            Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(BellWardenStage.Fight, simulation.BellWardenStage);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static T Property<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
