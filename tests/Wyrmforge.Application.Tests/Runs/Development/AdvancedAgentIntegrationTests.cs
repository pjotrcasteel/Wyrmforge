using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Agents;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class AdvancedAgentIntegrationTests
{
    private static RunSimulation Create(int count, AgentTier tier) => new RunSimulationFactory(new SeededRandomSource(1))
        .CreateDevelopmentEnemy(SelfPlayBuildCatalog.All.First().SelectedNodes,
            new(EnemyKind.MireHound, 42, 800, 600) { Intelligence = tier, Count = count });

    [TestMethod]
    public void TacticalPack_ActualSimulation_ReplaysWithBoundedPressureAndDiverseActions()
    {
        var first = Create(8, AgentTier.Tactical); var replay = Create(8, AgentTier.Tactical);
        var actions = new HashSet<string>(); var attacked = new HashSet<int>();
        for (var i = 0; i < 1800; i++)
        {
            var input = new MovementInput(Math.Sin(i * .01), Math.Cos(i * .013));
            Assert.AreEqual(JsonSerializer.Serialize(first.Tick(.025, input, 800, 600)), JsonSerializer.Serialize(replay.Tick(.025, input, 800, 600)));
            Assert.IsTrue(first.InspectAgentPack().Leases.Length <= 2);
            foreach (var agent in first.InspectEnemyAgents())
            {
                if (agent.CurrentAction is { } action) actions.Add(action.Action);
                if (agent.Observations.Any(f => f.Key == "phase" && f.Value == "Windup")) attacked.Add(agent.Identity.Id);
            }
        }
        Assert.IsTrue(actions.Contains("chase"));
        Assert.IsTrue(actions.Contains("strafe") || actions.Contains("retreat"));
        Assert.IsTrue(attacked.Count > 0, "A pressure budget must not deadlock all attacks.");
    }
    [TestMethod]
    public void ReactiveHound_TargetLost_KeepsWarnedLaneAndRecovery()
    {
        var enemy = new EnemyState(1, Vector2D.Zero, 13, 100, 40, EnemyKind.MireHound);
        var adapter = new LegacyEnemyAgent(enemy, 42, AgentTier.Reactive);
        var target = new Vector2D(100, 0);
        var seen = new AgentPerceptionSnapshot(1, 2, new(target, Vector2D.Zero, 1, "vision"), -1, true);
        for (var i = 0; i < 80 && !enemy.MireHound!.IsCommitted; i++) adapter.Step(.05, target, target, 40, true, seen);
        Assert.AreEqual(MireHoundPhase.Windup, enemy.MireHound!.Phase);
        var lane = enemy.MireHound.PounceDirection; var pounced = false;
        for (var i = 0; i < 100; i++)
        {
            var move = adapter.Step(.05, enemy.Position, enemy.Position, 40, true, seen with { Contact = null, Visible = false });
            Assert.IsFalse(move.Committed);
            if (enemy.MireHound.Phase == MireHoundPhase.Pounce) { pounced = true; Assert.AreEqual(lane, move.Direction); }
            else Assert.AreEqual(0, move.Speed);
        }
        Assert.IsTrue(pounced);
    }
}
