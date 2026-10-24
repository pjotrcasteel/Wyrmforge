using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Development;

[TestClass]
public sealed class DevelopmentEnemyTests
{
    private static RunSimulation Create(EnemyKind kind, bool casting = false) =>
        new RunSimulationFactory(new SeededRandomSource(1)).CreateDevelopmentEnemy(SelfPlayBuildCatalog.All.First().SelectedNodes,
            new DevelopmentEnemySetup(kind, 42, 800, 600, casting));

    [TestMethod]
    public void EveryImplementedKind_UsesActualSimulationAndIsDeterministic()
    {
        foreach (var kind in Enum.GetValues<EnemyKind>())
        {
            var first = Create(kind);
            var second = Create(kind);
            Assert.IsTrue(first.CreateSnapshot().Enemies.Any(enemy => enemy.Kind == kind), $"Missing {kind}");
            var health = first.Health;
            var agentA = new HeuristicRunAgent(RunAgentPersonality.Kiter, 42);
            var agentB = new HeuristicRunAgent(RunAgentPersonality.Kiter, 42);
            for (var frame = 0; frame < 400; frame++)
            {
                foreach (var (run, agent) in new[] { (first, agentA), (second, agentB) })
                {
                    var observation = new RunAgentObservation(run.CreateSnapshot(), [], [], [], [], [], run.Depth, 0, false);
                    run.Tick(.05, agent.ChooseMovement(observation), 800, 600);
                }
            }
            Assert.AreEqual(JsonSerializer.Serialize(first.CreateSnapshot()), JsonSerializer.Serialize(second.CreateSnapshot()), $"Nondeterministic {kind}");
            Assert.AreEqual(health, first.Health, $"Practice damage {kind}");
            Assert.AreEqual(0, first.CreateSnapshot().Hud.Kills, $"Casting disabled {kind}");
            Assert.AreEqual(0, first.CompletedMapNodes.Count);
            Assert.IsFalse(first.IsEnded);
        }
    }

    [TestMethod]
    public void OrdinaryRun_RemainsAtMapChoice()
    {
        var normal = new RunSimulationFactory(new SeededRandomSource(1)).Create(SelfPlayBuildCatalog.All.First().SelectedNodes, seed: 42);
        Assert.IsTrue(normal.CreateSnapshot().Paused);
        Assert.IsEmpty(normal.CreateSnapshot().Enemies);
    }

    [TestMethod]
    public void ActualDeathBurst_CarriesBodyIdentityAndExpiresAtOriginalDuration()
    {
        var run = Create(EnemyKind.MireHound);
        var enemies = (List<EnemyState>)typeof(RunSimulation).GetField("enemies", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(run)!;
        var enemy = enemies.Single();
        typeof(RunSimulation).GetMethod("DamageTarget", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(run, [enemy, enemy.Health + 1, null, null]);
        var death = run.CreateSnapshot().DeathBursts.Single();
        Assert.AreEqual(enemy.Kind, death.Kind);
        Assert.AreEqual(enemy.Id, death.EntityId);
        Assert.AreEqual(enemy.Radius, death.BodyRadius);
        for (var i = 0; i < 5; i++) run.Tick(.05, default, 800, 600);
        Assert.HasCount(1, run.CreateSnapshot().DeathBursts);
        run.Tick(.05, default, 800, 600);
        Assert.IsEmpty(run.CreateSnapshot().DeathBursts);
    }

    [TestMethod]
    public void InvalidDimensionsOrKind_AreRejected()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new DevelopmentEnemySetup((EnemyKind)99, 1, 800, 600).Validate());
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new DevelopmentEnemySetup(EnemyKind.Hollow, 1, double.NaN, 600).Validate());
    }
}
