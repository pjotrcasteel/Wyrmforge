using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class AgentPerceptionIntegrationTests
{
    private static RunSimulation Create(EnemyKind kind) =>
        new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentEnemy(SelfPlayBuildCatalog.All.First().SelectedNodes,
            new DevelopmentEnemySetup(kind, 42, 800, 600, AgentPerception: true));
    private static List<EnemyState> Enemies(RunSimulation run) =>
        (List<EnemyState>)typeof(RunSimulation).GetField("enemies", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(run)!;

    private static T Field<T>(RunSimulation run, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(run)!;
    private static void Invoke(RunSimulation run, string name, params object[] args) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(run, args);

    [TestMethod]
    public void RoutedAgent_WithoutKnowledge_DoesNotFleeFromHiddenExactPosition()
    {
        var run = Create(EnemyKind.Hollow);
        var enemy = Enemies(run).Single();
        enemy.Position = new(30, 30);
        enemy.RoutedRemaining = 1;
        var start = enemy.Position;
        for (var i = 0; i < 50; i++) run.Tick(.025, default, 800, 600);
        Assert.AreEqual(start, enemy.Position);
        Assert.AreEqual("unknown", run.InspectEnemyAgents().Single().Observations.Single(f => f.Key == "target").Value);
    }

    [TestMethod]
    public void Movement_ClampedAtBoundary_DoesNotExposeUnexecutedInputHeading()
    {
        var run = Create(EnemyKind.WhitefangStalker);
        var player = Field<PlayerState>(run, "player");
        player.Position = new(player.Radius, 300);
        Invoke(run, "UpdatePlayer", .025, new MovementInput(-1, 0), 800d, 600d);
        Assert.AreEqual(Vector2D.Zero, Field<Vector2D>(run, "playerHeading"));
        Invoke(run, "UpdatePlayer", .025, new MovementInput(1, 0), 800d, 600d);
        Assert.AreEqual(new Vector2D(1, 0), Field<Vector2D>(run, "playerHeading"));
    }

    [TestMethod]
    public void ActualCast_BehindClosedGate_IsHeardAtEmissionLocationWithoutAttackPermission()
    {
        var run = Create(EnemyKind.MireHound);
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gate = terrain.Snapshot().Barriers.Where(b => b.Kind == "gate").OrderBy(b => b.Y).First();
        var x = (gate.X + gate.Width / 2) * 800;
        var enemy = Enemies(run).Single();
        enemy.Position = new(x, gate.Y * 600 - 30);
        var player = Field<PlayerState>(run, "player");
        player.Position = new(x, (gate.Y + gate.Height) * 600 + 30);
        typeof(RunSimulation).GetField("arenaEnvironment", BindingFlags.NonPublic | BindingFlags.Instance)!.SetValue(run, terrain);
        Invoke(run, "UpdateEnemies", .025);
        Assert.AreEqual("unknown", run.InspectEnemyAgents().Single().Observations.Single(f => f.Key == "target").Value);
        Invoke(run, "CastSpell", SpellCatalog.Get(SpellId.FireBolt), 1, 1d, false);
        Invoke(run, "UpdateEnemies", .025);
        var facts = run.InspectEnemyAgents().Single().Observations;
        Assert.AreEqual("hearing", facts.Single(f => f.Key == "target").Source);
        Assert.AreEqual("False", facts.Single(f => f.Key == "may-commit").Value);
        Assert.AreEqual(MireHoundPhase.Stalk, enemy.MireHound!.Phase);
    }

    [TestMethod]
    [DataRow(EnemyKind.Hollow)]
    [DataRow(EnemyKind.MireHound)]
    public void RealSimulation_OutOfRange_StaysIdleWithoutLeakingPlayerPosition(EnemyKind kind)
    {
        var run = Create(kind);
        var enemy = Enemies(run).Single();
        enemy.Position = new(30, 30);
        var start = enemy.Position;
        for (var i = 0; i < 180; i++) run.Tick(.025, default, 800, 600);
        Assert.AreEqual(start, enemy.Position);
        var state = run.InspectEnemyAgents().Single();
        Assert.AreEqual("unknown", state.Observations.Single(f => f.Key == "target").Value);
        Assert.IsFalse(state.Memory.Any(f => f.Source.Contains("legacy-exact")));
        Assert.AreEqual("False", state.Observations.Single(f => f.Key == "target-visible").Value);
    }

    [TestMethod]
    public void RealSimulation_SensedTargets_ProducesRepeatableSnapshotsAndInspector()
    {
        var first = Create(EnemyKind.MireHound); var second = Create(EnemyKind.MireHound);
        for (var i = 0; i < 600; i++)
        {
            var input = new MovementInput(Math.Sin(i * .01), Math.Cos(i * .013));
            Assert.AreEqual(JsonSerializer.Serialize(first.Tick(.025, input, 800, 600)), JsonSerializer.Serialize(second.Tick(.025, input, 800, 600)));
        }
        Assert.AreEqual(JsonSerializer.Serialize(first.InspectEnemyAgents()), JsonSerializer.Serialize(second.InspectEnemyAgents()));
    }

    [TestMethod]
    public void RealGeometry_ClosedGatePreventsAcquisition_OpeningAllowsSight()
    {
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gate = terrain.Snapshot().Barriers.Where(b => b.Kind == "gate").OrderBy(b => b.Y).First();
        const double width = 800, height = 1200;
        var x = (gate.X + gate.Width / 2) * width;
        var from = new Vector2D(x, gate.Y * height - 30);
        var to = new Vector2D(x, (gate.Y + gate.Height) * height + 30);
        var sensor = new AgentPerception(new(360, 220, 120, 1), 42, 1);
        Assert.IsNull(sensor.Observe(1, from, Vector2D.Zero, to, (a, b) => terrain.HasLineOfSight(a, b, width, height), new(1), []).Contact);
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.IsTrue(sensor.Observe(2, from, Vector2D.Zero, to, (a, b) => terrain.HasLineOfSight(a, b, width, height), new(1), []).Visible);
    }

    [TestMethod]
    public void Hound_SightLostDuringWindup_FinishesLockedLaneWithoutNewCommitment()
    {
        var enemy = new EnemyState(1, Vector2D.Zero, 13, 100, 40, EnemyKind.MireHound);
        var adapter = new LegacyEnemyAgent(enemy, 42);
        var target = new Vector2D(100, 0);
        var seen = new AgentPerceptionSnapshot(1, 2, new(target, Vector2D.Zero, 1, "vision"), -1, true);
        for (var i = 0; i < 40 && !enemy.MireHound!.IsCommitted; i++) adapter.Step(.05, target, target, 40, true, seen);
        Assert.AreEqual(MireHoundPhase.Windup, enemy.MireHound!.Phase);
        var lane = enemy.MireHound.PounceDirection;
        var lost = seen with { Contact = null, Visible = false };
        var pounced = false;
        for (var i = 0; i < 100; i++)
        {
            var result = adapter.Step(.05, enemy.Position, enemy.Position, 40, true, lost);
            Assert.IsFalse(result.Committed);
            if (enemy.MireHound.Phase == MireHoundPhase.Pounce)
            {
                pounced = true;
                Assert.AreEqual(lane, result.Direction);
                Assert.AreEqual(MireHoundBehaviorState.PounceSpeed, result.Speed);
            }
            else Assert.AreEqual(0, result.Speed);
        }
        Assert.IsTrue(pounced);
        Assert.AreEqual(MireHoundPhase.Stalk, enemy.MireHound.Phase);
    }
}
