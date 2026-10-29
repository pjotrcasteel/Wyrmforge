using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class AgentFoundationTests
{
    private static RunSimulation Create(EnemyKind kind, bool enabled, int seed = 42) =>
        new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentEnemy(SelfPlayBuildCatalog.All.First().SelectedNodes,
            new DevelopmentEnemySetup(kind, seed, 800, 600, AgentFoundation: enabled));

    [TestMethod]
    [DataRow(EnemyKind.Hollow)]
    [DataRow(EnemyKind.MireHound)]
    public void RealSimulation_OptInMatchesLegacyEveryFrame_AndRepeatsExactly(EnemyKind kind)
    {
        var legacy = Create(kind, false); var ai = Create(kind, true); var repeat = Create(kind, true);
        for (var i = 0; i < 1200; i++)
        {
            var input = new MovementInput(Math.Sin(i * .009) * .3, Math.Cos(i * .013) * .3);
            var expected = JsonSerializer.Serialize(legacy.Tick(.025, input, 800, 600));
            Assert.AreEqual(expected, JsonSerializer.Serialize(ai.Tick(.025, input, 800, 600)), $"frame {i}");
            Assert.AreEqual(expected, JsonSerializer.Serialize(repeat.Tick(.025, input, 800, 600)), $"repeat {i}");
        }
        Assert.IsEmpty(legacy.InspectEnemyAgents());
        var state = ai.InspectEnemyAgents().Single();
        Assert.AreEqual(kind == EnemyKind.Hollow ? "chase" : "hound-cycle", state.CurrentAction!.Action);
        Assert.IsTrue(state.Observations.Any(f => f.Source == "legacy-exact-target/world-units"));
        Assert.IsTrue(state.Trace.Last().Alternatives.Any(a => !a.Allowed));
        Assert.AreEqual(JsonSerializer.Serialize(ai.InspectEnemyAgents()), JsonSerializer.Serialize(repeat.InspectEnemyAgents()));
    }

    [TestMethod]
    public void HoundAdapter_PreservesPressureDenialAndLockedLaneBetweenDecisions()
    {
        var enemy = new EnemyState(1, Vector2D.Zero, 13, 100, 40, EnemyKind.MireHound);
        var adapter = new LegacyEnemyAgent(enemy, 42);
        var target = new Vector2D(100, 0);
        for (var i = 0; i < 60; i++) Assert.IsFalse(adapter.Step(.05, target, target, 40, false).Committed);
        Assert.AreEqual(MireHoundPhase.Stalk, enemy.MireHound!.Phase);
        Assert.IsTrue(adapter.Step(.05, target, target, 40, true).Committed);
        var lane = enemy.MireHound.PounceDirection;
        for (var i = 0; i < 12; i++) adapter.Step(.05, new(0, 100), new(0, 100), 40, false);
        Assert.AreEqual(MireHoundPhase.Pounce, enemy.MireHound.Phase);
        Assert.AreEqual(lane, enemy.MireHound.PounceDirection);
        Assert.IsTrue(adapter.Runtime.Inspect().Trace.Length < adapter.Runtime.Inspect().Tick);
    }

    [TestMethod]
    public void RemovedEnemy_DoesNotLeaveAgentOrMemoryBehind()
    {
        var run = Create(EnemyKind.Hollow, true);
        run.Tick(.025, default, 800, 600);
        Assert.HasCount(1, run.InspectEnemyAgents());
        var enemies = (List<EnemyState>)typeof(RunSimulation).GetField("enemies", BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(run)!;
        enemies.Clear();
        run.Tick(.025, default, 800, 600);
        Assert.IsEmpty(run.InspectEnemyAgents());
    }

    [TestMethod]
    public void OtherArchetypes_KeepOriginalExecutorAndNoAgentAllocation()
    {
        var run = Create(EnemyKind.AshSlinger, true);
        for (var i = 0; i < 20; i++) run.Tick(.025, default, 800, 600);
        Assert.IsEmpty(run.InspectEnemyAgents());
    }
}
