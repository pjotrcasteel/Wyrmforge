using System.Reflection;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
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
    public void RegularHunt_RolloutFlag_PreservesDefaultAndUsesArchetypeCapabilities()
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var legacy = factory.Create(new HashSet<string>(), seed: 42);
        var opted = factory.Create(new HashSet<string>(), seed: 42, agents: new(true, true));
        var field = typeof(RunSimulation).GetField("enemies", BindingFlags.Instance | BindingFlags.NonPublic)!;
        foreach (var run in new[] { legacy, opted })
        {
            var enemies = (List<EnemyState>)field.GetValue(run)!;
            enemies.Add(new(1001, new(300, 200), 13, 100, 40, EnemyKind.Hollow));
            enemies.Add(new(1002, new(400, 200), 13, 100, 40, EnemyKind.MireHound));
            run.ChoosePrimary(SpellId.FireBolt);
            var update = typeof(RunSimulation).GetMethod("UpdateEnemies", BindingFlags.Instance | BindingFlags.NonPublic)!;
            for (var i = 0; i < 10; i++) update.Invoke(run, new object[] { .025 });
        }
        Assert.AreEqual(0, legacy.InspectEnemyAgents().Count);
        Assert.AreEqual("Instinctive", opted.InspectEnemyAgents().Single(a => a.Identity.Id == 1001).Observations.Single(f => f.Key == "tier").Value);
        Assert.AreEqual("Tactical", opted.InspectEnemyAgents().Single(a => a.Identity.Id == 1002).Observations.Single(f => f.Key == "tier").Value);
    }

    [TestMethod]
    [DataRow(1)]
    [DataRow(2)]
    public void AdaptiveBoss_ActualPhases_ReplayWithoutBypassingCommitments(int phase)
    {
        RunSimulation Boss() => new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentHunt(new HashSet<string>(),
            new(DragonId.Ashfang, false, phase, SpellId.FireBolt, 42, 800, 600, true)
            { AdaptiveAgents = true, Casting = false, BossReadySpell = false });
        var first = Boss(); var replay = Boss(); var actions = new HashSet<string>(); var flight = false;
        for (var i = 0; i < 1200; i++)
        {
            var input = i < 400 ? default : new MovementInput(Math.Sin(i * .01), Math.Cos(i * .013));
            var actual = first.Tick(.025, input, 800, 600);
            Assert.AreEqual(JsonSerializer.Serialize(actual), JsonSerializer.Serialize(replay.Tick(.025, input, 800, 600)));
            if (actual.Dragon is { } dragon)
            {
                if (dragon.Action is { } action && action != "idle") actions.Add(action);
                flight |= dragon.FlightStage == "overhead";
            }
            Assert.IsTrue(first.InspectBossAgent()!.Observations.All(f => !f.Source.Contains("legacy")));
        }
        Assert.IsTrue(actions.Count >= 2, "The phase-local policy should demonstrate multiple legal attacks.");
        Assert.IsTrue(flight, "Adaptive utility may not suppress authored aerial phases.");
        Assert.AreEqual(JsonSerializer.Serialize(first.InspectBossAgent()), JsonSerializer.Serialize(replay.InspectBossAgent()));
    }

    [TestMethod]
    public void Horde_64Agents_RespectsQueryCapsAndReportsActualCosts()
    {
        var run = Create(64, AgentTier.Tactical);
        for (var i = 0; i < 400; i++) run.Tick(.025, default, 800, 600);
        var metrics = run.InspectAgentPerformance();
        Assert.AreEqual(64, metrics.Population);
        Assert.IsTrue(metrics.MaxSightQueries <= 32 && metrics.MaxPathQueries <= 32);
        Assert.IsTrue(metrics.MaxCommittedThreats <= 2);
        Assert.IsTrue(metrics.P95Milliseconds >= 0);
        Console.WriteLine("AI6_HOST_PROFILE " + JsonSerializer.Serialize(metrics));
    }

    [TestMethod]
    public void TacticalPack_ActualSimulation_ReplaysWithBoundedPressureAndDiverseActions()
    {
        var first = Create(8, AgentTier.Tactical); var replay = Create(8, AgentTier.Tactical);
        var actions = new HashSet<string>(); var attacked = new HashSet<int>();
        for (var i = 0; i < 1800; i++)
        {
            var input = i < 600 ? default : new MovementInput(Math.Sin(i * .01), Math.Cos(i * .013));
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
