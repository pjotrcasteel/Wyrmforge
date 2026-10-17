using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class BellWardenEncounterTests
{
    [TestMethod]
    public void EveryMap_HasOnePreLairRoad_LeadingIntoTheLair_AndNoReliquaryMayClaimIt()
    {
        for (var depth = 1; depth <= 3; depth++)
        for (var seed = 1; seed <= 200; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(depth, seed);
            var lair = nodes.Single(node => node.Type == WyrmrealmNodeType.Dragon);
            var preLair = nodes.Where(node => node.PreLair).ToArray();
            Assert.IsNotEmpty(preLair);
            foreach (var road in preLair)
            {
                Assert.AreEqual(WyrmrealmNodeType.Combat, road.Type);
                Assert.Contains(road.Id, lair.PreviousNodeIds, "Route-graph semantics: the Warden guards the lair's doorstep.");
                Assert.IsFalse(RunSimulation.IsReliquaryEligible(road));
                Assert.AreEqual("Bell Warden", road.EncounterName);
            }
            Assert.IsTrue(nodes.Where(node => !node.PreLair).All(node => !lair.PreviousNodeIds.Contains(node.Id)));
        }
    }

    [TestMethod]
    public void PreLairRoad_TollsThenRaisesTheWarden_WithNoHordeEliteOrReliquary()
    {
        var simulation = WalkToPreLair(77);
        // Even a Reliquary hunt that has not yet found its road never claims the Warden's.
        SetField(simulation, "reliquaryMap", ((int, int)?)(Field<WyrmrealmMapState>(simulation, "mapState").Seed, 1));
        SetField(simulation, "reliquaryMapPending", true);
        var road = simulation.AvailableMapNodes.Single(node => node.PreLair);
        Assert.IsTrue(simulation.ChooseMapNode(road.Id));
        Assert.AreEqual(BellWardenStage.Waiting, simulation.BellWardenStage);
        Assert.AreEqual(ReliquaryStage.Absent, simulation.ReliquaryStage, "Warden and Reliquary never co-spawn.");
        Assert.AreEqual(-1, Field<int>(simulation, "eliteSpawnIndex"), "No elite on the Warden's road.");

        simulation.Tick(0, default, 390, 700);
        var player = Field<PlayerState>(simulation, "player");
        var enemies = Field<List<EnemyState>>(simulation, "enemies");
        for (var time = 0d; time < 2.2; time += 0.05) Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(BellWardenStage.Tolling, simulation.BellWardenStage);
        Assert.AreEqual(1, simulation.BellWardenArrivals);
        var mark = simulation.CreateSnapshot().BellWarden!;
        Assert.AreEqual("tolling", mark.Stage);
        Assert.IsGreaterThanOrEqualTo(ArenaEnvironmentState.MinimumSpawnDistance, Vector2D.Distance(player.Position, new Vector2D(mark.X, mark.Y)));
        Assert.IsEmpty(enemies, "The bell tolls before anything enters.");

        for (var time = 0d; time < 20; time += 0.05) Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(BellWardenStage.Fight, simulation.BellWardenStage);
        Assert.AreEqual(EnemyKind.BellWarden, enemies.Single().Kind, "No horde: only the Warden and its rally call.");
        Assert.AreEqual("fight", simulation.CreateSnapshot().BellWarden!.Stage);
        Assert.AreEqual("Silence the Bell Warden", simulation.CreateSnapshot().Trail!.Objective);
        Assert.AreEqual(ReliquaryStage.Absent, simulation.ReliquaryStage);
    }

    [TestMethod]
    public void RallyCall_StaysBounded_FarBelowTheHordePeak()
    {
        var (simulation, _, enemies) = Fight(91);
        for (var call = 0; call < 3; call++) Invoke(simulation, "RallyBellWardenAdds", RunSimulation.BellCrackedRallyAdds);
        var adds = enemies.Where(enemy => enemy.Kind != EnemyKind.BellWarden).ToArray();
        Assert.HasCount(RunSimulation.BellWardenMaxLiveAdds, adds);
        Assert.IsLessThan(EnemyStagePressure.ActiveEnemyCap(8, 1) / 2, adds.Length + 1);
        Assert.IsTrue(adds.All(add => add.Kind is EnemyKind.Hollow or EnemyKind.Ashling && !add.IsElite));
        for (var wave = 0; wave < 10; wave++)
        {
            foreach (var add in enemies.Where(enemy => enemy.Kind != EnemyKind.BellWarden && enemy.Health > 0)) add.Health = 0;
            enemies.RemoveAll(enemy => enemy.Health <= 0);
            Invoke(simulation, "RallyBellWardenAdds", RunSimulation.BellCrackedRallyAdds);
        }
        Assert.AreEqual(RunSimulation.BellWardenMaxAddsPerFight, Field<int>(simulation, "bellWardenAddsRallied"));
    }

    [TestMethod]
    public void Smash_HitsInsideTheCrater_ThenTheShockwaveSparesAHunterWhoStepsIn()
    {
        var (simulation, player, enemies) = Fight(5);
        var warden = enemies.Single();
        warden.Position = player.Position + new Vector2D(160, 0);
        for (var time = 0d; time < 10 && warden.BellWarden!.Phase != BellWardenPhase.Windup; time += 0.05) Step(simulation, 0.05);
        Assert.AreEqual(BellWardenMove.Smash, warden.BellWarden!.Move);
        var crater = warden.BellWarden.Target;
        Assert.AreEqual("bell-smash", simulation.CreateSnapshot().Enemies.Single().Telegraph!.Kind);

        // Stand in the crater for the impact: one heavy hit.
        player.Position = crater;
        for (var time = 0d; time < 2 && warden.BellWarden.Phase == BellWardenPhase.Windup; time += 0.05) Step(simulation, 0.05);
        AssertTookOneHit(player, RunSimulation.BellSmashDamage);
        Assert.HasCount(1, simulation.CreateSnapshot().BellShockwaves);

        // Stay inside the crater while the ring rolls out: untouched.
        player.Health = player.MaxHealth;
        for (var time = 0d; time < RunSimulation.BellShockwaveDelaySeconds + RunSimulation.BellShockwaveExpandSeconds + 0.2; time += 0.05)
        {
            Step(simulation, 0.05);
            if (warden.BellWarden.Phase == BellWardenPhase.Windup) break;
        }
        Assert.AreEqual(player.MaxHealth, player.Health, "Inside the crater the shockwave passes harmlessly outward.");
        Assert.IsEmpty(simulation.CreateSnapshot().BellShockwaves);
    }

    [TestMethod]
    public void Shockwave_HitsAHunterInItsPath_Once()
    {
        var (simulation, player, _) = Fight(6);
        var center = player.Position + new Vector2D(-200, 0);
        Field<System.Collections.IList>(simulation, "bellShockwaves").Clear();
        Invoke(simulation, "UpdateBellShockwaves", 0d);
        var shockwaves = Field<System.Collections.IList>(simulation, "bellShockwaves");
        var waveType = typeof(RunSimulation).GetNestedType("BellShockwaveState", BindingFlags.NonPublic)!;
        shockwaves.Add(Activator.CreateInstance(waveType, center));
        var hits = 0;
        for (var time = 0d; time < 2; time += 0.05)
        {
            Invoke(simulation, "BeginPlayerDamageFrame", 0.05);
            Invoke(simulation, "UpdateBellShockwaves", 0.05);
            var before = player.Health;
            Invoke(simulation, "ResolvePlayerDamage");
            if (player.Health < before) hits++;
        }
        Assert.AreEqual(1, hits);
        AssertTookOneHit(player, RunSimulation.BellShockwaveDamage);
    }

    [TestMethod]
    public void NoBurstSkipsTheCrack_OverflowStopsAtHalfHealthUntilTheStaggerBegins()
    {
        var (simulation, _, enemies) = Fight(13);
        var warden = enemies.Single();
        var cracks = simulation.BellWardenCracks;
        Invoke(simulation, "DamageTarget", warden, warden.MaxHealth * 5, null, null);
        Assert.AreEqual(warden.MaxHealth * BellWardenBehaviorState.CrackHealthFraction, warden.Health, 1e-9, "Overflow is discarded.");
        // Regression: a frozen Warden is not ticked, so the blow itself must start the stagger or the gate would never lift.
        Assert.AreEqual(BellWardenPhase.Crack, warden.BellWarden!.Phase);
        Assert.AreEqual(cracks + 1, simulation.BellWardenCracks);
        Invoke(simulation, "DamageTarget", warden, 1d, null, null);
        Assert.IsLessThan(warden.MaxHealth * BellWardenBehaviorState.CrackHealthFraction, warden.Health, "The stagger is a damage window.");
    }

    [TestMethod]
    public void Defeat_PaysOnce_CrumblesItsAdds_AndOpensTheRoad()
    {
        var (simulation, _, enemies) = Fight(13);
        var warden = enemies.Single();
        Invoke(simulation, "RallyBellWardenAdds", 2);
        var adds = enemies.Where(enemy => enemy.Kind != EnemyKind.BellWarden).ToArray();
        Assert.IsNotEmpty(adds);
        var shards = Field<ExperienceShardField>(simulation, "experienceShards");
        var before = shards.TotalValue;
        Kill(simulation, warden);
        Kill(simulation, warden);
        Assert.AreEqual(before + RunSimulation.BellWardenExperience, shards.TotalValue);
        Assert.AreEqual(new BellWardenDefeat(RunSimulation.BellWardenExperience), simulation.BellWardenDefeat);
        Assert.IsTrue(adds.All(add => add.Health <= 0), "Its rallied reinforcements crumble with it.");
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.IsTrue(simulation.PendingMapChoice || Field<bool>(simulation, "trailExitPending"), "The road opens once the Warden falls.");
        Assert.IsTrue(simulation.AvailableMapNodes.All(node => node.Type == WyrmrealmNodeType.Dragon) || Field<bool>(simulation, "trailExitPending"));
        // Regression: the director never ran on this road, so the courtyard gates must open with the Warden's fall.
        var barriers = simulation.CreateSnapshot().Environment?.Barriers ?? [];
        Assert.IsNotEmpty(barriers.Where(barrier => barrier.Kind == "gate"));
        Assert.IsTrue(barriers.Where(barrier => barrier.Kind == "gate").All(barrier => barrier.Open), "Every crossing opens toward the exit.");
    }

    [TestMethod]
    public void FirstHunt_AlwaysClimaxesWithAshfang_LaterHuntsStayVaried()
    {
        var later = new HashSet<DragonId>();
        for (var seed = 1; seed <= 40; seed++)
        {
            var first = Create();
            first.InitializeRunSeed(seed);
            first.EnableFirstHunt(true);
            Invoke(first, "ResolveDragonAttraction");
            Assert.AreEqual(DragonId.Ashfang, first.AttractedDragon);

            var veteran = Create(new Wyrmforge.Application.Abstractions.Randomness.SeededRandomSource(seed));
            veteran.InitializeRunSeed(seed);
            Invoke(veteran, "ResolveDragonAttraction");
            later.Add(veteran.AttractedDragon!.Value);
        }
        Assert.IsGreaterThan(1, later.Count, "Only the first hunt is fixed; later Wyrms still come from the attraction roll.");
    }

    // The damage pipeline applies small run-level scaling; one hit lands within a narrow band of the raw value.
    private static void AssertTookOneHit(PlayerState player, double raw)
    {
        var taken = player.MaxHealth - player.Health;
        Assert.IsGreaterThan(raw * 0.9, taken);
        Assert.IsLessThan(raw * 1.2, taken);
    }

    private static RunSimulation WalkToPreLair(int seed)
    {
        var simulation = Create();
        simulation.InitializeRunSeed(seed);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        while (!simulation.AvailableMapNodes.Any(node => node.PreLair))
        {
            var node = simulation.AvailableMapNodes.Where(node => node.Type == WyrmrealmNodeType.Combat).OrderBy(node => node.Id).First();
            Assert.IsTrue(simulation.ChooseMapNode(node.Id));
            for (var kill = map.CurrentNodeKills; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill();
        }
        return simulation;
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Fight(int seed)
    {
        var simulation = WalkToPreLair(seed);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.Single(node => node.PreLair).Id));
        simulation.Tick(0, default, 390, 700);
        for (var time = 0d; time < 6 && simulation.BellWardenStage != BellWardenStage.Fight; time += 0.05)
            Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(BellWardenStage.Fight, simulation.BellWardenStage);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static RunSimulation Create(Wyrmforge.Application.Abstractions.Randomness.IRandomSource? random = null)
    {
        random ??= new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static void Kill(RunSimulation simulation, EnemyState enemy)
    {
        // The first blow stops at the half-health gate and starts the crack; the second lands in the stagger.
        Invoke(simulation, "DamageTarget", enemy, enemy.Health * 10 + 1, null, null);
        Invoke(simulation, "DamageTarget", enemy, enemy.Health * 10 + 1, null, null);
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object? value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
