using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class PlayerDamageBufferTests
{
    [TestMethod]
    public void Tick_StackedEnemies_DealOneContactHitInsteadOfCombinedDamage()
    {
        var simulation = Create();
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var player = Field<PlayerState>(simulation, "player");
        simulation.Tick(0, default, 390, 700);
        player.Health = 10;
        var enemies = Field<List<EnemyState>>(simulation, "enemies");
        for (var id = 100; id < 150; id++) enemies.Add(new EnemyState(id, player.Position, 11, 1000, 0));
        simulation.Tick(0, default, 390, 700);
        Assert.AreEqual(10d, simulation.Health);
        simulation.Tick(0.05, default, 390, 700);
        Assert.AreEqual(3.7, simulation.Health, 0.0001);
        Assert.IsFalse(simulation.IsEnded);
        simulation.Tick(0.05, default, 390, 700);
        Assert.AreEqual(3.7, simulation.Health, 0.0001);
    }

    [TestMethod]
    public void DamagePlayer_SimultaneousSources_UsesStrongestRegardlessOfOrder()
    {
        foreach (var hits in new[] { new[] { 6.3, 28d, 12d }, new[] { 28d, 12d, 6.3 } })
        {
            var simulation = Create();
            Frame(simulation, 0, hits);
            Assert.AreEqual(72d, simulation.Health);
        }
    }

    [TestMethod]
    public void DamagePlayer_GracePeriod_BlocksHitsWithoutExtendingItsDuration()
    {
        var simulation = Create();
        Frame(simulation, 0, 10);
        Frame(simulation, 0.20, 30);
        Frame(simulation, 0.14, 30);
        Assert.AreEqual(90d, simulation.Health);
        Frame(simulation, 0.01, 10);
        Assert.AreEqual(80d, simulation.Health);
    }

    [TestMethod]
    public void ContactDamage_SustainedPressure_PreservesSingleSourceRateAcrossTickSizes()
    {
        foreach (var delta in new[] { 0.05, 0.025 })
        {
            var simulation = Create();
            var hits = (int)Math.Round(1.4 / delta);
            for (var frame = 0; frame < hits; frame++)
            {
                Invoke(simulation, "BeginPlayerDamageFrame", delta);
                Invoke(simulation, "DamagePlayerContact", 18d);
                Invoke(simulation, "ResolvePlayerDamage");
            }
            Assert.AreEqual(100 - 18 * 1.4, simulation.Health, 0.0001);
        }
    }

    [TestMethod]
    public void Tick_MapDecisionPause_DoesNotConsumeGraceTime()
    {
        var simulation = Create();
        Frame(simulation, 0, 10);
        for (var frame = 0; frame < 40; frame++) simulation.Tick(0.05, default, 390, 700);
        Frame(simulation, 0.05, 30);
        Assert.AreEqual(90d, simulation.Health);
    }

    [TestMethod]
    public void DamagePlayer_WinterShell_PreventsHitAndKeepsItsExistingGuard()
    {
        var simulation = Create("winter-shell");
        Frame(simulation, 0, 30, 50);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health);
        Assert.IsFalse(Field<PlayerState>(simulation, "player").Barrier);
        Assert.IsGreaterThan(0d, Field<PlayerState>(simulation, "player").WinterShellGuardRemaining);
        Frame(simulation, 0.35, 50);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health);
    }

    [TestMethod]
    public void DamagePlayer_SeparateLethalHit_IsStillLethalAndHealthClampsToZero()
    {
        var simulation = Create();
        Frame(simulation, 0, 120);
        Assert.AreEqual(0d, simulation.Health);
    }

    private static RunSimulation Create(params string[] nodes)
    {
        var random = new FirstRandomSource();
        return new RunSimulation(nodes.ToHashSet(), new LevelChoiceService(random), random);
    }

    private static void Frame(RunSimulation simulation, double delta, params double[] hits)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        foreach (var hit in hits) Invoke(simulation, "DamagePlayer", hit);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
