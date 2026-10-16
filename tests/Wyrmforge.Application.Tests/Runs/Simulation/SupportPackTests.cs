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
public sealed class SupportPackTests
{
    [TestMethod]
    public void AshPriest_HealsOneWoundedAllyWithAVisibleTether()
    {
        var (simulation, player, enemies) = Encounter();
        var priest = new EnemyState(500, player.Position + new Vector2D(280, 0), 12, 50, 0, EnemyKind.AshPriest);
        var wounded = new EnemyState(501, player.Position + new Vector2D(200, 0), 8, 40, 0, EnemyKind.Ashling) { Health = 10 };
        var other = new EnemyState(502, player.Position + new Vector2D(200, 60), 8, 40, 0, EnemyKind.Ashling) { Health = 20 };
        enemies.AddRange([priest, wounded, other]);
        var sawTether = false;
        for (var time = 0d; time < 4 && priest.AshPriest!.CastsCompleted == 0; time += 0.05)
        {
            Step(simulation, 0.05);
            if (simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 500).Telegraph is { Kind: "heal" } tether)
            {
                sawTether = true;
                Assert.AreEqual(wounded.Position.X, tether.TargetX, 0.001, "The most wounded ally is the target.");
            }
        }
        Assert.IsTrue(sawTether);
        Assert.AreEqual(10 + 40 * AshPriestBehaviorState.HealFraction, wounded.Health, 0.001);
        Assert.AreEqual(20d, other.Health, "The heal restores one ally, not the pack.");
    }

    [TestMethod]
    public void AshPriest_RaisesAtMostTwoAshlingsPerEncounter_AndTheyDropNoExperience()
    {
        var (simulation, player, enemies) = Encounter();
        var priest = new EnemyState(500, player.Position + new Vector2D(300, 0), 12, 1000, 0, EnemyKind.AshPriest);
        enemies.Add(priest);
        for (var index = 0; index < 4; index++)
        {
            var ashling = new EnemyState(510 + index, player.Position + new Vector2D(260, -30 + index * 20), 8, 1, 0, EnemyKind.Ashling);
            enemies.Add(ashling);
            Kill(simulation, ashling);
        }
        enemies.RemoveAll(enemy => enemy.Health <= 0);
        Assert.HasCount(4, simulation.CreateSnapshot().AshRemains);
        var sawRitual = false;
        var checkedRise = false;
        for (var time = 0d; time < 30; time += 0.05)
        {
            Step(simulation, 0.05);
            sawRitual |= simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == 500).Telegraph?.Kind == "revive";
            if (checkedRise || !enemies.Any(enemy => enemy.Revived)) continue;
            checkedRise = true;
            Assert.IsTrue(enemies.Where(enemy => enemy.Revived).All(enemy => Math.Abs(enemy.Health - enemy.MaxHealth * AshPriestBehaviorState.RevivedHealthFraction) < 0.001),
                "Raised Ashlings return at half health.");
        }
        Assert.IsTrue(sawRitual, "The resurrection is telegraphed.");
        Assert.IsTrue(checkedRise, "The ritual raised someone.");
        var raised = enemies.Where(enemy => enemy.Revived).ToArray();
        Assert.HasCount(RunSimulation.MaxRevivesPerEncounter, raised);
        Assert.IsEmpty(simulation.CreateSnapshot().AshRemains, "Unraised remains crumble.");

        var shards = Field<ExperienceShardField>(simulation, "experienceShards");
        var before = ShardCount(shards);
        foreach (var ashling in raised) Kill(simulation, ashling);
        Assert.AreEqual(before, ShardCount(shards), "A raised Ashling paid out once already.");
        Assert.IsEmpty(simulation.CreateSnapshot().AshRemains, "A raised Ashling stays down.");
    }

    [TestMethod]
    public void AshPriestDeath_RoutsNearbyAshlingsBriefly_ThenTheyReturn()
    {
        var (simulation, player, enemies) = Encounter();
        var priest = new EnemyState(500, player.Position + new Vector2D(260, 0), 12, 1, 0, EnemyKind.AshPriest);
        var ashling = new EnemyState(501, player.Position + new Vector2D(150, 0), 8, 1000, 80, EnemyKind.Ashling);
        enemies.AddRange([priest, ashling]);
        Kill(simulation, priest);
        enemies.Remove(priest);
        Assert.IsTrue(simulation.CreateSnapshot().Enemies.Single().Routed);
        var start = Vector2D.Distance(ashling.Position, player.Position);
        Step(simulation, 0.5);
        Assert.IsGreaterThan(start, Vector2D.Distance(ashling.Position, player.Position), "Routed Ashlings flee.");
        for (var time = 0d; time < RunSimulation.PriestRoutSeconds; time += 0.1) Step(simulation, 0.1);
        var fled = Vector2D.Distance(ashling.Position, player.Position);
        Step(simulation, 0.5);
        Assert.IsFalse(simulation.CreateSnapshot().Enemies.Single().Routed);
        Assert.IsLessThan(fled, Vector2D.Distance(ashling.Position, player.Position), "The rout ends and the Ashling re-engages.");
    }

    [TestMethod]
    [DataRow(-60d, 0d, PenitentBehaviorState.FrontalDamageMultiplier)]
    [DataRow(60d, 0d, 1d)]
    [DataRow(0d, 60d, 1d)]
    public void PenitentShield_BlocksSplashFromTheFrontOnly(double offsetX, double offsetY, double expectedFraction)
    {
        var (simulation, player, enemies) = Encounter();
        var penitent = new EnemyState(500, player.Position + new Vector2D(200, 0), 19, 1000, 0, EnemyKind.Penitent);
        penitent.Penitent!.Face(new Vector2D(-1, 0));
        enemies.Add(penitent);
        Invoke(simulation, "RebuildCombatSpatialIndex");
        Invoke(simulation, "Splash", penitent.Position + new Vector2D(offsetX, offsetY), 100d, 90d, -1);
        Assert.AreEqual(100 * expectedFraction, 1000 - penitent.Health, 0.001);
        Assert.IsNotNull(simulation.CreateSnapshot().Enemies.Single().ShieldFacing);
    }

    [TestMethod]
    public void PenitentBash_IsTelegraphedAndCountsAgainstTheCommittedCap()
    {
        var (simulation, player, enemies) = Encounter();
        var penitent = new EnemyState(500, player.Position + new Vector2D(50, 0), 19, 1000, 0, EnemyKind.Penitent);
        penitent.Penitent!.Face(new Vector2D(-1, 0));
        enemies.Add(penitent);
        var sawArc = false;
        for (var time = 0d; time < 3 && penitent.Penitent.Phase != PenitentPhase.Recover; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
            if (simulation.CreateSnapshot().Enemies.Single().Telegraph is { Kind: "bash" } arc)
            {
                sawArc = true;
                Assert.AreEqual(PenitentBehaviorState.BashReach, arc.Radius);
                Assert.AreEqual(1, Invoke<int>(simulation, "CommittedThreatCount"));
            }
        }
        Assert.IsTrue(sawArc);
        Assert.IsNull(simulation.CreateSnapshot().Enemies.Single().ShieldFacing, "The recovering Penitent is exposed.");
    }

    [TestMethod]
    [DataRow(3)]
    [DataRow(17)]
    [DataRow(9001)]
    public void HabitatPlans_NeverFieldAPriestWithoutAPackToTend(int seed)
    {
        var random = new SeededRandomSource(seed);
        var priests = 0;
        foreach (var habitat in Enum.GetValues<WyrmrealmHabitat>())
        {
            for (var plan = 0; plan < 60; plan++)
            {
                var kinds = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Mixed, 2, random, 1.6, habitat).Enemies;
                for (var index = 0; index < kinds.Count; index++)
                {
                    if (kinds[index] != EnemyKind.AshPriest) continue;
                    priests++;
                    Assert.IsGreaterThanOrEqualTo(3, kinds.Take(index).Count(kind => kind == EnemyKind.Ashling), $"{habitat}: priest before its pack");
                }
            }
        }
        Assert.IsGreaterThan(0, priests, "Priests do appear where their pack lives.");
    }

    private static int ShardCount(object shards) =>
        ((System.Collections.ICollection)shards.GetType().GetProperty("Shards")!.GetValue(shards)!).Count;

    private static void Kill(RunSimulation simulation, EnemyState enemy) =>
        Invoke(simulation, "DamageTarget", enemy, enemy.Health + 1, null, null);

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
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

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);

    private static T Invoke<T>(RunSimulation simulation, string name, params object?[] arguments) =>
        (T)typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments)!;
}
