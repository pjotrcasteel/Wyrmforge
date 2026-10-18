using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class EnemyTelegraphTests
{
    [TestMethod]
    public void AshSlinger_DoesNotThrowDuringTheOpeningGrace()
    {
        var (simulation, player, enemies) = Encounter();
        enemies.Add(new EnemyState(500, player.Position + new Vector2D(240, 0), 11, 1000, 0, EnemyKind.AshSlinger));
        for (var time = 0d; time < EnemyStagePressure.RangedGraceSeconds - 0.1; time += 0.05)
        {
            Step(simulation, 0.05);
            Assert.IsNull(simulation.CreateSnapshot().Enemies.Single().Telegraph, $"Ranged telegraph at {time:0.00}s");
        }
        for (var time = 0d; time < 1 && simulation.CreateSnapshot().Enemies.Single().Telegraph is null; time += 0.05) Step(simulation, 0.05);
        var telegraph = simulation.CreateSnapshot().Enemies.Single().Telegraph;
        Assert.IsNotNull(telegraph, "After the grace the slinger swings.");
        Assert.AreEqual("lob", telegraph.Kind);
    }

    [TestMethod]
    [DataRow(false, 14d)]
    [DataRow(true, 0d)]
    public void AshSlinger_EmberLandsOnlyInsideTheMarkShownAtWindup(bool dodge, double expectedDamage)
    {
        var (simulation, player, enemies) = Encounter(graceElapsed: true);
        enemies.Add(new EnemyState(500, player.Position + new Vector2D(240, 0), 11, 1000, 0, EnemyKind.AshSlinger));
        while (simulation.CreateSnapshot().Enemies.Single().Telegraph is null) Step(simulation, 0.05);
        var mark = simulation.CreateSnapshot().Enemies.Single().Telegraph!;
        Assert.AreEqual(player.Position.X, mark.TargetX, 0.001);
        if (dodge) player.Position += new Vector2D(0, AshSlingerBehaviorState.ImpactRadius + 4);
        var start = simulation.Health;
        var sawEmber = false;
        for (var time = 0d; time < AshSlingerBehaviorState.WindupSeconds + AshSlingerBehaviorState.FlightSeconds + 0.2; time += 0.05)
        {
            Step(simulation, 0.05);
            if (simulation.CreateSnapshot().HostileProjectiles.SingleOrDefault() is { } ember)
            {
                sawEmber = true;
                Assert.AreEqual(mark.TargetX, ember.TargetX, 0.001);
                Assert.IsGreaterThanOrEqualTo(0d, ember.Height);
            }
        }
        Assert.IsTrue(sawEmber, "The ember is visible in flight.");
        Assert.IsEmpty(simulation.CreateSnapshot().HostileProjectiles);
        Assert.AreEqual(expectedDamage, start - simulation.Health, 0.001);
    }

    [TestMethod]
    public void MireHound_BitesOnceAndThenStandsExposed()
    {
        var (simulation, player, enemies) = Encounter();
        var hound = new EnemyState(500, player.Position + new Vector2D(120, 0), 13, 1000, 60, EnemyKind.MireHound);
        enemies.Add(hound);
        var sawLane = false;
        for (var time = 0d; time < 4 && !hound.MireHound!.PounceLanded; time += 0.05)
        {
            Step(simulation, 0.05);
            if (simulation.CreateSnapshot().Enemies.Single().Telegraph is { Kind: "pounce" } lane)
            {
                sawLane = true;
                Assert.AreEqual(MireHoundBehaviorState.PounceDistance, Vector2D.Distance(hound.Position, new Vector2D(lane.TargetX, lane.TargetY)), 0.5);
            }
        }
        Assert.IsTrue(sawLane, "The pounce lane is telegraphed.");
        Assert.IsTrue(hound.MireHound!.PounceLanded);
        Assert.AreEqual(MireHoundBehaviorState.PounceDamage, simulation.MaxHealth - simulation.Health, 0.001);
        Assert.AreEqual(MireHoundPhase.Recover, hound.MireHound.Phase);
    }

    [TestMethod]
    public void CommittedThreats_StayWithinTheOpeningCap()
    {
        var (simulation, player, enemies) = Encounter(graceElapsed: true);
        for (var index = 0; index < 6; index++)
        {
            var angle = index * Math.PI / 3;
            var offset = new Vector2D(Math.Cos(angle), Math.Sin(angle)) * 130;
            enemies.Add(new EnemyState(600 + index, player.Position + offset, 13, 1000, 60, index % 2 == 0 ? EnemyKind.MireHound : EnemyKind.AshSlinger));
        }
        var cap = EnemyStagePressure.CommittedThreatCap(1);
        var peak = 0;
        for (var time = 0d; time < 8; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
            var snapshot = simulation.CreateSnapshot();
            var committed = snapshot.HostileProjectiles.Count + enemies.Count(enemy => enemy.MireHound?.IsCommitted == true || enemy.AshSlinger?.IsCommitted == true);
            peak = Math.Max(peak, committed);
            Assert.IsLessThanOrEqualTo(cap, committed, $"{committed} committed threats at {time:0.00}s");
        }
        Assert.AreEqual(cap, peak, "The cap is reached, so it is actually exercised.");
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter(bool graceElapsed = false)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        if (graceElapsed) SetField(simulation, "encounterSeconds", EnemyStagePressure.RangedGraceSeconds);
        return (simulation, Field<PlayerState>(simulation, "player"), Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
