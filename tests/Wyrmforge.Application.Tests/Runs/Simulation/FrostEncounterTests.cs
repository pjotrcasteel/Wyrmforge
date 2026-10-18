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
    public void Whitefang_FeintsBehindTheHunterInASnowCloudThenPouncesWithTendonChill()
    {
        var (simulation, player, enemies) = Encounter();
        SetField(simulation, "playerHeading", new Vector2D(1, 0));
        var stalker = new EnemyState(500, player.Position + new Vector2D(0, -200), 13, 1000, 70, EnemyKind.WhitefangStalker);
        enemies.Add(stalker);
        while (stalker.Whitefang!.Phase != WhitefangPhase.Windup) Step(simulation, 0.05);
        var snapshot = simulation.CreateSnapshot();
        Assert.HasCount(1, snapshot.SnowClouds, "The feint leaves a snow cloud where the hunter last saw it.");
        Assert.IsLessThan(player.Position.X, stalker.Position.X, "It surfaces behind the hunter's heading.");
        Assert.AreEqual("flank-pounce", snapshot.Enemies.Single().Telegraph?.Kind);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health, "The feint itself never hurts.");

        for (var time = 0d; time < 2 && !stalker.Whitefang.PounceLanded; time += 0.05) Step(simulation, 0.05);
        Assert.IsTrue(stalker.Whitefang.PounceLanded);
        Assert.AreEqual(WhitefangStalkerBehaviorState.PounceDamage, simulation.MaxHealth - simulation.Health, 0.001);
        Assert.AreEqual(WhitefangStalkerBehaviorState.TendonChill, player.Chill.Stacks);
    }

    [TestMethod]
    [DataRow(0d, true)]
    [DataRow(90d, false)]
    [DataRow(180d, false)]
    public void CairnSentinel_AvalancheStepOnlyRollsAcrossItsFront(double bearingDegrees, bool hit)
    {
        var (simulation, player, enemies) = Encounter();
        var sentinel = new EnemyState(500, player.Position + new Vector2D(120, 0), 20, 1000, 0, EnemyKind.CairnSentinel);
        enemies.Add(sentinel);
        while (sentinel.Sentinel!.Phase != CairnPhase.Brace) Step(simulation, 0.05);
        var telegraph = simulation.CreateSnapshot().Enemies.Single().Telegraph!;
        Assert.AreEqual("avalanche", telegraph.Kind);
        Assert.IsLessThan(sentinel.Position.X, telegraph.TargetX, "The wave is drawn toward the hunter it braced against.");
        Assert.IsTrue(Invoke<bool>(simulation, "Immovable", sentinel), "A braced Sentinel cannot be shoved.");

        // The shield faced the hunter when it planted; the hunter now steps around it.
        var bearing = Math.PI - bearingDegrees * Math.PI / 180;
        player.Position = sentinel.Position + new Vector2D(Math.Cos(bearing), Math.Sin(bearing)) * 120;
        var start = simulation.Health;
        var sawWave = false;
        for (var time = 0d; time < CairnSentinelBehaviorState.BraceSeconds + CairnSentinelBehaviorState.RingSeconds + 0.2; time += 0.05)
        {
            Step(simulation, 0.05);
            sawWave |= simulation.CreateSnapshot().AvalancheRings.Count > 0;
        }
        Assert.IsTrue(sawWave);
        Assert.AreEqual(hit ? CairnSentinelBehaviorState.RingDamage : 0, start - simulation.Health, 0.001);
        Assert.AreEqual(hit ? CairnSentinelBehaviorState.RingChill : 0, player.Chill.Stacks);
    }

    [TestMethod]
    public void CairnSentinel_BraceSoaksFrontalProjectilesAndRecoveryIsExposed()
    {
        var sentinel = new EnemyState(1, Vector2D.Zero, 20, 1000, 0, EnemyKind.CairnSentinel);
        var front = new Vector2D(100, 0);
        while (sentinel.Sentinel!.Tick(0.05, sentinel.Position, front) != CairnEvent.BraceStarted) { }
        Assert.AreEqual(CairnSentinelBehaviorState.BracedFrontMultiplier, Shield(sentinel, front));
        Assert.AreEqual(1, Shield(sentinel, new Vector2D(-100, 0)));
        sentinel.Sentinel.Tick(CairnSentinelBehaviorState.BraceSeconds, sentinel.Position, front);
        Assert.AreEqual(CairnSentinelBehaviorState.ExposedMultiplier, Shield(sentinel, front));

        static double Shield(EnemyState enemy, Vector2D source) => (double)typeof(RunSimulation)
            .GetMethod("ShieldMultiplier", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [enemy, source, 1d])!;
    }

    [TestMethod]
    public void Cantor_RimeHymnArmoursThePackButNeverItself()
    {
        var (simulation, player, enemies) = Encounter();
        var cantor = new EnemyState(500, player.Position + new Vector2D(300, 0), 13, 1000, 0, EnemyKind.HoarfrostCantor);
        var left = new EnemyState(501, cantor.Position + new Vector2D(0, 60), 11, 1000, 0);
        var right = new EnemyState(502, cantor.Position + new Vector2D(0, -60), 11, 1000, 0);
        enemies.AddRange([cantor, left, right]);
        while (cantor.Cantor!.Phase != CantorPhase.Chant) Step(simulation, 0.05);
        Assert.AreEqual("rime-hymn", simulation.CreateSnapshot().Enemies.First(enemy => enemy.Kind == EnemyKind.HoarfrostCantor).Telegraph?.Kind);
        while (cantor.Cantor.Phase == CantorPhase.Chant) Step(simulation, 0.05);

        var crust = 1000 * HoarfrostCantorBehaviorState.RimeArmorFraction;
        Assert.AreEqual(crust, left.RimeArmor, 0.001);
        Assert.AreEqual(crust, right.RimeArmor, 0.001);
        Assert.AreEqual(0, cantor.RimeArmor, "The chanter stays bare: killing it is the answer.");
        Assert.AreEqual(1, simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 501).RimeArmor, 0.001);

        Damage(simulation, left, 100);
        Assert.AreEqual(1000, left.Health, "The crust soaks the hit before health moves.");
        Assert.AreEqual(crust - 100, left.RimeArmor, 0.001);
        Damage(simulation, left, crust);
        Assert.AreEqual(900, left.Health, 0.001, "Only the overflow past the crust lands.");
        Assert.AreEqual(0, left.RimeArmor);
    }

    [TestMethod]
    public void Cantor_ReknitsAFallenPacklingIntoAThrallThatPaysNothing()
    {
        var (simulation, player, enemies) = Encounter();
        var cantor = new EnemyState(500, player.Position + new Vector2D(300, 0), 13, 1000, 0, EnemyKind.HoarfrostCantor);
        var packling = new EnemyState(501, cantor.Position + new Vector2D(0, 80), 9, 10, 0, EnemyKind.FrostlingPackling);
        enemies.AddRange([cantor, packling]);
        Damage(simulation, packling, 50);
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        Assert.HasCount(1, simulation.CreateSnapshot().RimeHusks, "A fallen Frostling leaves a rime husk.");

        var sawThread = false;
        for (var time = 0d; time < 5 && simulation.ReknitThralls == 0; time += 0.05)
        {
            Step(simulation, 0.05);
            sawThread |= simulation.CreateSnapshot().Enemies.Any(enemy => enemy.Telegraph?.Kind == "reknit");
        }
        Assert.IsTrue(sawThread, "The reknit is telegraphed at the husk.");
        var thrall = enemies.Single(enemy => enemy.Kind == EnemyKind.FrostlingPackling);
        Assert.IsTrue(thrall.Revived);
        Assert.AreEqual(thrall.MaxHealth * HoarfrostCantorBehaviorState.ThrallHealthFraction, thrall.Health, 0.001);
        Assert.IsEmpty(simulation.CreateSnapshot().RimeHusks);

        Damage(simulation, thrall, thrall.MaxHealth);
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        Assert.IsEmpty(simulation.CreateSnapshot().RimeHusks, "A thrall that falls again shatters for good.");
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public void Cantor_StillnessVerseNumbsTheNearUnlessABurstBreaksIt(bool interrupt)
    {
        var (simulation, player, enemies) = Encounter();
        var cantor = new EnemyState(500, player.Position + new Vector2D(100, 0), 13, 1000, 0, EnemyKind.HoarfrostCantor);
        enemies.Add(cantor);
        while (cantor.Cantor!.Phase != CantorPhase.Chant) Step(simulation, 0.05);
        Assert.AreEqual(CantorVerse.StillnessVerse, cantor.Cantor.Verse);
        Assert.AreEqual("stillness", simulation.CreateSnapshot().Enemies.Single().Telegraph?.Kind);
        if (interrupt) Damage(simulation, cantor, 1000 * HoarfrostCantorBehaviorState.InterruptHealthFraction);
        for (var time = 0d; time < HoarfrostCantorBehaviorState.VerseSeconds + 0.1; time += 0.05) Step(simulation, 0.05);

        Assert.AreEqual(interrupt ? CantorPhase.Silenced : CantorPhase.Recover, cantor.Cantor.Phase);
        Assert.AreEqual(interrupt ? 0 : HoarfrostCantorBehaviorState.VerseDamage, simulation.MaxHealth - simulation.Health, 0.001);
        Assert.AreEqual(interrupt ? 0 : HoarfrostCantorBehaviorState.VerseChill, player.Chill.Stacks);
    }

    [TestMethod]
    public void Wisp_GlassStepsBesideTheHunterLeavesAFalseDoubleAndCuts()
    {
        var (simulation, player, enemies) = Encounter();
        var wisp = new EnemyState(500, player.Position + new Vector2D(250, 0), 11, 1000, 0, EnemyKind.MirrorWisp);
        enemies.Add(wisp);
        var origin = wisp.Position;
        Assert.AreEqual(0.6, simulation.CreateSnapshot().Enemies.Single().Opacity, 0.001, "The veiled Wisp is half there.");
        while (wisp.Wisp!.Phase != WispPhase.Shimmer) Step(simulation, 0.05);
        Assert.AreEqual("glass-step", simulation.CreateSnapshot().Enemies.Single().Telegraph?.Kind);
        while (wisp.Wisp.Phase == WispPhase.Shimmer) Step(simulation, 0.05);

        var reflection = enemies.Single(enemy => enemy.Kind == EnemyKind.MirrorDouble);
        Assert.AreEqual(origin, reflection.Position, "The double stays where the Wisp stood.");
        Assert.AreEqual(MirrorWispBehaviorState.StepDistance, Vector2D.Distance(wisp.Position, player.Position), 1);
        Assert.AreEqual("shiver-cut", simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 500).Telegraph?.Kind);
        while (wisp.Wisp.Phase == WispPhase.Windup) Step(simulation, 0.05);
        Assert.AreEqual(MirrorWispBehaviorState.CutDamage, simulation.MaxHealth - simulation.Health, 0.001);
        Assert.AreEqual(MirrorWispBehaviorState.CutChill, player.Chill.Stacks);

        // The double is an image: it holds no road open, and breaking it pays nothing.
        wisp.Health = 0;
        enemies.Remove(wisp);
        Assert.AreEqual(0, (int)typeof(RunSimulation).GetProperty("HostileCount", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!);
        var kills = Field<int>(simulation, "kills");
        Damage(simulation, reflection, 1);
        Assert.IsLessThanOrEqualTo(0d, reflection.Health);
        Assert.AreEqual(kills, Field<int>(simulation, "kills"));
    }

    [TestMethod]
    public void Wisp_DoubleBreaksOnItsOwn()
    {
        var (simulation, player, enemies) = Encounter();
        Invoke(simulation, "SpawnReflectionDouble", player.Position + new Vector2D(200, 0));
        for (var time = 0d; time < MirrorWispBehaviorState.DoubleSeconds + 0.1; time += 0.05) Step(simulation, 0.05);
        Assert.IsTrue(enemies.Single().Health <= 0);
        Assert.AreEqual(simulation.MaxHealth, simulation.Health, "The double never hurts.");
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

    private static void Damage(RunSimulation simulation, EnemyState target, double amount) =>
        Invoke(simulation, "DamageTarget", target, amount, null, null);

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

    private static T Invoke<T>(RunSimulation simulation, string name, params object?[] arguments) =>
        (T)typeof(RunSimulation).GetMethod(name, BindingFlags.Static | BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
