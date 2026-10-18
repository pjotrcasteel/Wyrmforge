using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ReliquaryEncounterTests
{
    [TestMethod]
    public void HuntRoll_IsAboutSixPercent_AndSeeded()
    {
        const int maps = 10000;
        var hits = 0;
        for (var seed = 1; seed <= maps; seed++)
            if (RunSimulation.IsReliquaryHunt(seed, 1)) hits++;
        var rate = hits / (double)maps;
        // 3 sigma of a 6% binomial over 10k maps is about 0.7 percentage points.
        Assert.IsGreaterThan(RunSimulation.ReliquaryChance - 0.0072, rate, $"Saw {rate:P2}.");
        Assert.IsLessThan(RunSimulation.ReliquaryChance + 0.0072, rate, $"Saw {rate:P2}.");
        Assert.AreEqual(RunSimulation.IsReliquaryHunt(1234, 2), RunSimulation.IsReliquaryHunt(1234, 2));
    }

    [TestMethod]
    public void WalkedHunts_MeetItAtMostOnce_OnlyOnEligibleRoads()
    {
        const int hunts = 2000;
        var met = 0;
        for (var seed = 1; seed <= hunts; seed++)
        {
            var simulation = Create();
            simulation.InitializeRunSeed(seed);
            var marked = 0;
            for (var stage = 1; stage <= WyrmrealmMapState.CombatStages; stage++)
            {
                var node = simulation.MapNodes.FirstOrDefault(candidate => candidate.Stage == stage && candidate.Type == WyrmrealmNodeType.Combat);
                if (node is null) continue;
                Invoke(simulation, "PrepareReliquaryNode", node);
                if (simulation.ReliquaryStage != ReliquaryStage.Waiting) continue;
                Assert.IsTrue(RunSimulation.IsReliquaryEligible(node), $"Stage {node.Stage} {node.Habitat} is not a Reliquary road.");
                Assert.AreNotEqual(WyrmrealmHabitat.Outskirts, node.Habitat);
                Assert.IsLessThan(WyrmrealmMapState.CombatStages, node.Stage, "Never on the bell tower's approach.");
                marked++;
                Invoke(simulation, "ClearReliquaryState");
            }
            Assert.IsLessThanOrEqualTo(1, marked);
            met += marked;
        }
        var rate = met / (double)hunts;
        Assert.IsGreaterThan(0.035, rate, $"Every walked hunt crosses an eligible road, so it should stay near 6%; saw {rate:P1}.");
        Assert.IsLessThan(0.085, rate, $"Saw {rate:P1}.");
    }

    [TestMethod]
    public void Reveal_HushesTheField_ThenRisesWithoutBlockingTheRoad()
    {
        var (simulation, player, enemies) = Encounter();
        var hollow = new EnemyState(900, player.Position + new Vector2D(60, 0), 11, 400, 80, EnemyKind.Hollow);
        enemies.Add(hollow);
        ArmReveal(simulation);
        Assert.IsTrue(InvokeBool(simulation, "UpdateReliquaryReveal", 0.05));
        Assert.AreEqual(ReliquaryStage.Hush, simulation.ReliquaryStage);
        Assert.AreEqual(1, simulation.ReliquarySightings);
        var sigil = simulation.CreateSnapshot().Reliquary!;
        Assert.AreEqual("hush", sigil.Stage);
        Assert.IsGreaterThanOrEqualTo(150d, Vector2D.Distance(player.Position, new Vector2D(sigil.X, sigil.Y)), "Never rises on the hunter.");

        var start = hollow.Position;
        for (var time = 0d; time < RunSimulation.ReliquaryHushSeconds - 0.1; time += 0.05) simulation.Tick(0.05, default, 390, 700);
        Assert.AreEqual(start, hollow.Position, "Nothing hostile moves during the hush.");
        Assert.AreEqual(player.MaxHealth, player.Health, "Nothing hostile strikes during the hush.");

        for (var time = 0d; time < RunSimulation.ReliquaryEmergeSeconds + 0.4; time += 0.05) Invoke(simulation, "UpdateReliquaryReveal", 0.05);
        Assert.AreEqual(ReliquaryStage.Duel, simulation.ReliquaryStage);
        var boss = enemies.Single(enemy => enemy.Kind == EnemyKind.Reliquary);
        Assert.AreEqual(enemies.Count - 1, Property<int>(simulation, "HostileCount"), "The Reliquary never holds the road open.");
        Assert.AreEqual("duel", simulation.CreateSnapshot().Reliquary!.Stage);
        Assert.AreEqual(1d, simulation.CreateSnapshot().Reliquary!.HealthRatio);
        Assert.IsNotNull(boss.Reliquary);
    }

    [TestMethod]
    public void HalfHealth_StagesOneShift_ThenPlantsWardsUpToTheCap()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        boss.Health = boss.MaxHealth * 0.49;
        Step(simulation, 0.05);
        Assert.AreEqual(1, simulation.ReliquaryShifts);
        Assert.AreEqual(ReliquaryPhase.Shift, boss.Reliquary!.Phase);
        for (var time = 0d; time < ReliquaryBehaviorState.ShiftSeconds + 0.1; time += 0.05) Step(simulation, 0.05);
        Assert.IsTrue(boss.Reliquary.Shifted);
        Assert.AreEqual(1, simulation.ReliquaryShifts, "The shift happens once.");
        Assert.HasCount(RunSimulation.ReliquaryMaxLiveWards, enemies.Where(enemy => enemy.Kind == EnemyKind.ReliquaryWard && enemy.Health > 0));

        for (var time = 0d; time < 180; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
            Assert.IsLessThanOrEqualTo(RunSimulation.ReliquaryMaxLiveWards, enemies.Count(enemy => enemy.Kind == EnemyKind.ReliquaryWard && enemy.Health > 0));
            foreach (var ward in enemies.Where(enemy => enemy.Kind == EnemyKind.ReliquaryWard && enemy.Health > 0).ToArray()) Kill(simulation, ward);
            enemies.RemoveAll(enemy => enemy.Health <= 0);
        }
        Assert.AreEqual(RunSimulation.ReliquaryMaxWardsPerFight, Field<int>(simulation, "reliquaryWardsPlanted"));
    }

    [TestMethod]
    public void Wards_ShieldTheReliquary_EmpowerMinions_AndPayNothing()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Invoke(simulation, "PlantWard", boss);
        var ward = enemies.Single(enemy => enemy.Kind == EnemyKind.ReliquaryWard);

        var health = boss.Health;
        Invoke(simulation, "DamageTarget", boss, 10d, null, null);
        Assert.AreEqual(health - 10 * RunSimulation.ReliquaryWardedDamageMultiplier, boss.Health, 0.001);
        Assert.IsTrue(simulation.CreateSnapshot().Reliquary!.Warded);

        var minion = new EnemyState(901, ward.Position + new Vector2D(40, 0), 11, 40, 0, EnemyKind.Hollow);
        enemies.Add(minion);
        Assert.IsTrue(simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == minion.Id).Empowered);
        Assert.IsFalse(simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == boss.Id).Empowered);

        var shards = Field<ExperienceShardField>(simulation, "experienceShards").TotalValue;
        var kills = simulation.CreateSummary().Kills;
        Kill(simulation, ward);
        Assert.AreEqual(shards, Field<ExperienceShardField>(simulation, "experienceShards").TotalValue);
        Assert.AreEqual(kills, simulation.CreateSummary().Kills);
        Assert.AreEqual(0, simulation.CurrentMapNodeKills);
        Assert.IsFalse(simulation.CreateSummary().EnemyRecords.Any(record => record.Kind == EnemyKind.ReliquaryWard));
        health = boss.Health;
        Invoke(simulation, "DamageTarget", boss, 10d, null, null);
        Assert.AreEqual(health - 10, boss.Health, 0.001, "Breaking the ward drops the shield.");
    }

    [TestMethod]
    public void UnbrokenWard_BurstsBehindAMarkedBlast()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Invoke(simulation, "PlantWard", boss);
        var ward = enemies.Single(enemy => enemy.Kind == EnemyKind.ReliquaryWard);
        boss.Statuses.Apply(Wyrmforge.Domain.Combat.Statuses.CombatStatusCatalog.Get(Wyrmforge.Domain.Combat.Statuses.CombatStatusId.Frozen), 999);
        var warned = false;
        for (var time = 0d; time < ReliquaryWardState.FuseSeconds + 0.1 && ward.Health > 0; time += 0.05)
        {
            Invoke(simulation, "UpdateEnemies", 0.05);
            warned |= simulation.CreateSnapshot().Enemies.Any(enemy => enemy.Telegraph?.Kind == "ward-fuse");
        }
        Assert.IsTrue(warned, "The fuse is shown before it bursts.");
        Assert.AreEqual(0d, ward.Health);
        var blast = simulation.CreateSnapshot().HostileProjectiles.Single(shot => shot.Style == "ward");
        Assert.AreEqual(RunSimulation.ReliquaryWardBlastRadius, blast.Radius);
    }

    [TestMethod]
    public void Defeat_PaysOnce_RecordsTheKill_AndEndsTheRites()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Invoke(simulation, "PlantWard", boss);
        var shards = Field<ExperienceShardField>(simulation, "experienceShards");
        var before = shards.TotalValue;
        Kill(simulation, boss);
        Kill(simulation, boss);
        Assert.AreEqual(before + RunSimulation.ReliquaryExperience, shards.TotalValue);
        Assert.AreEqual(new ReliquaryDefeat(RunSimulation.ReliquaryExperience), simulation.ReliquaryDefeat);
        Assert.AreEqual(ReliquaryStage.Slain, simulation.ReliquaryStage);
        Assert.IsTrue(enemies.Where(enemy => enemy.Kind == EnemyKind.ReliquaryWard).All(ward => ward.Health <= 0), "Its wards fall with it.");
        var summary = simulation.CreateSummary();
        Assert.IsTrue(summary.ReliquarySlain);
        Assert.AreEqual(1, summary.EnemyRecords.Single(record => record.Kind == EnemyKind.Reliquary).Kills);
        Assert.AreEqual(0, simulation.CurrentMapNodeKills, "It never counts toward clearing the road.");
    }

    [TestMethod]
    public void ClearingTheRoadFirst_MakesItWithdraw_Unrewarded()
    {
        var (simulation, player, enemies) = Encounter();
        Duel(simulation, player, enemies);
        var node = Field<WyrmrealmMapState>(simulation, "mapState").CurrentNode!;
        Invoke(simulation, "CompleteTrail", node);
        Assert.AreEqual(1, simulation.ReliquaryWithdrawals);
        Assert.AreEqual(ReliquaryStage.Withdrawn, simulation.ReliquaryStage);
        Assert.IsNull(simulation.ReliquaryDefeat);
        Assert.IsFalse(simulation.CreateSummary().ReliquarySlain);
    }

    [TestMethod]
    public void Rites_LandOnlyWhereTheyWereMarked()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        var sawSeal = false;
        var sawField = false;
        for (var time = 0d; time < 20 && !(sawSeal && sawField); time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
            var snapshot = simulation.CreateSnapshot();
            sawSeal |= snapshot.HostileProjectiles.Any(shot => shot.Style == "seal" && shot.Radius == RunSimulation.ReliquarySealRadius);
            sawField |= snapshot.ReliquaryFields.Count > 0;
            Assert.IsLessThanOrEqualTo(RunSimulation.ReliquaryMaxLiveFields, snapshot.ReliquaryFields.Count);
        }
        Assert.IsTrue(sawSeal);
        Assert.IsTrue(sawField);
        Assert.IsGreaterThan(0, boss.Reliquary!.RitesCompleted);
    }

    private static EnemyState Duel(RunSimulation simulation, PlayerState player, List<EnemyState> enemies)
    {
        var definition = EnemyCatalog.Get(EnemyKind.Reliquary);
        var boss = new EnemyState(800, player.Position + new Vector2D(250, 0), definition.Radius, 400, 30, EnemyKind.Reliquary);
        enemies.Add(boss);
        SetField(simulation, "reliquary", boss);
        typeof(RunSimulation).GetProperty(nameof(RunSimulation.ReliquaryStage))!.SetValue(simulation, ReliquaryStage.Duel);
        return boss;
    }

    private static void ArmReveal(RunSimulation simulation)
    {
        typeof(RunSimulation).GetProperty(nameof(RunSimulation.ReliquaryStage))!.SetValue(simulation, ReliquaryStage.Waiting);
        SetField(simulation, "reliquaryTimer", 0d);
        SetField(simulation, "entryGraceRemaining", 0d);
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter()
    {
        var simulation = Create();
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        SetField(simulation, "entryGraceRemaining", 0d);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static void Kill(RunSimulation simulation, EnemyState enemy) =>
        Invoke(simulation, "DamageTarget", enemy, enemy.Health * 10 + 1, null, null);

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static T Property<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);

    private static bool InvokeBool(RunSimulation simulation, string name, params object?[] arguments) =>
        (bool)typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments)!;
}
