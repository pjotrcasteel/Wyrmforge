using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class FrostEncounterTests
{
    [TestMethod]
    public void Packling_BiteChillsAndBitesHarderAtChilledPrey()
    {
        var (simulation, player, enemies) = Encounter();
        var packling = new EnemyState(500, player.Position + new Vector2D(110, 0), 9, 1000, 60, EnemyKind.FrostlingPackling);
        enemies.Add(packling);
        var sawCrouch = false;
        for (var time = 0d; time < 4 && !packling.Packling!.BiteLanded; time += 0.05)
        {
            Step(simulation, 0.05);
            sawCrouch |= simulation.CreateSnapshot().Enemies.Single().Telegraph?.Kind == "skitter";
        }
        Assert.IsTrue(sawCrouch, "The skitter lane is telegraphed.");
        Assert.IsTrue(packling.Packling!.BiteLanded);
        Assert.AreEqual(FrostlingPacklingBehaviorState.BiteDamage, simulation.MaxHealth - simulation.Health, 0.001);
        Assert.AreEqual(1, player.Chill.Stacks);
        Assert.AreEqual(1, simulation.CreateSnapshot().Player.Chill);

        // The next bite lands on chilled prey.
        var before = simulation.Health;
        for (var time = 0d; time < 4 && packling.Packling.Phase != FrostlingPhase.Skitter; time += 0.05)
        {
            player.Chill.Apply();
            Step(simulation, 0.05);
        }
        player.Position = packling.Position;
        for (var time = 0d; time < 1 && packling.Packling.Phase == FrostlingPhase.Skitter; time += 0.05) Step(simulation, 0.05);
        Assert.AreEqual(FrostlingPacklingBehaviorState.BiteDamageAgainst(true), before - simulation.Health, 0.001);
    }

    [TestMethod]
    [DataRow(false, 2)]
    [DataRow(true, 0)]
    public void Shardcaster_LanceAndBloomOnlyPunishTheLane(bool dodge, int expectedChill)
    {
        var (simulation, player, enemies) = Encounter(graceElapsed: true);
        enemies.Add(new EnemyState(500, player.Position + new Vector2D(260, 0), 11, 1000, 0, EnemyKind.Shardcaster));
        while (simulation.CreateSnapshot().Enemies.Single().Telegraph is null) Step(simulation, 0.05);
        var lane = simulation.CreateSnapshot().Enemies.Single().Telegraph!;
        Assert.AreEqual("ice-lance", lane.Kind);
        Assert.AreEqual(player.Position.Y, lane.TargetY, 0.001, "The lane is drawn straight through the hunter.");
        if (dodge) player.Position += new Vector2D(0, ShardcasterBehaviorState.BloomRadius + player.Radius + 6);
        var start = simulation.Health;
        var sawLance = false;
        var sawBloom = false;
        for (var time = 0d; time < ShardcasterBehaviorState.AimSeconds + 1.6; time += 0.05)
        {
            Step(simulation, 0.05);
            sawLance |= simulation.CreateSnapshot().IceLances.Count > 0;
            sawBloom |= simulation.CreateSnapshot().SplinterBlooms.Count > 0;
        }
        Assert.IsTrue(sawLance, "The lance is visible in flight.");
        Assert.IsTrue(sawBloom, "Splinters bloom where the lance stopped.");
        var expected = dodge ? 0 : ShardcasterBehaviorState.LanceDamage + ShardcasterBehaviorState.BloomDamage;
        Assert.AreEqual(expected, start - simulation.Health, 0.001);
        Assert.AreEqual(expectedChill, player.Chill.Stacks);
    }

    [TestMethod]
    public void BlackIce_StealsFootingAndChillsOnlyWhileStoodOn()
    {
        var (simulation, player, _) = Encounter();
        var right = new Vector2D(190, 0);
        Assert.AreEqual(right, Velocity(simulation, right), "Off the ice, movement snaps to the input.");
        Assert.AreEqual(right * -1, Velocity(simulation, right * -1));

        Velocity(simulation, right);
        Invoke(simulation, "AddBlackIcePatch", player.Position);
        Assert.IsTrue(simulation.CreateSnapshot().Player.OnBlackIce);
        Assert.HasCount(1, simulation.CreateSnapshot().BlackIce);
        var reversed = Velocity(simulation, right * -1);
        Assert.IsGreaterThan(0d, reversed.X, "On black ice the hunter still slides the old way after reversing.");

        for (var time = 0d; time < 1.3; time += 0.05)
        {
            player.Chill.Tick(0.05);
            Invoke(simulation, "UpdateFrostHazards", 0.05);
        }
        Assert.IsGreaterThanOrEqualTo(2, player.Chill.Stacks);

        for (var time = 0d; time < ShardcasterBehaviorState.PatchSeconds; time += 0.1) Invoke(simulation, "UpdateFrostHazards", 0.1);
        Assert.IsEmpty(simulation.CreateSnapshot().BlackIce, "The patch thaws.");
    }

    [TestMethod]
    public void Chill_SlowsTheHuntersPace()
    {
        var (simulation, player, _) = Encounter();
        player.Chill.Apply(3);
        var velocity = Velocity(simulation, new Vector2D(100, 0));
        Assert.AreEqual(100 * (1 - 3 * HunterChillState.SlowPerStack), velocity.X, 0.5);
    }

    [TestMethod]
    public void CinderPlans_NeverDrawTheFrostRoster()
    {
        var random = new SeededRandomSource(1701);
        foreach (var pattern in Enum.GetValues<EnemyEncounterPattern>())
        {
            for (var depth = 1; depth <= 5; depth++)
            {
                Assert.IsFalse(EnemyEncounterComposition.CreatePlan(pattern, depth, random).Enemies.Any(IsFrost), $"{pattern} depth {depth}");
                foreach (var habitat in Enum.GetValues<WyrmrealmHabitat>())
                    Assert.IsFalse(EnemyEncounterComposition.CreatePlan(pattern, depth, random, habitat: habitat).Enemies.Any(IsFrost), $"{habitat}");
            }
        }

        static bool IsFrost(EnemyKind kind) => EnemyCatalog.Get(kind).Realm == EnemyRealm.Frost;
    }

    private static Vector2D Velocity(RunSimulation simulation, Vector2D desired) =>
        (Vector2D)typeof(RunSimulation).GetMethod("FrostMovementVelocity", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [desired, 0.05])!;

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
        Field<PlayerState>(simulation, "player").Chill.Tick(delta);
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
