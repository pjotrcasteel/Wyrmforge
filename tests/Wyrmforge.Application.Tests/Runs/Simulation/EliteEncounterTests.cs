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
public sealed class EliteEncounterTests
{
    [TestMethod]
    public void EliteRoll_SkipsTheTutorialAndIntroNodes_CapsPerHunt_AndIsNeverGuaranteed()
    {
        const int hunts = 2000;
        var huntsWithElite = 0;
        var totalElites = 0;
        for (var seed = 1; seed <= hunts; seed++)
        {
            var simulation = Create();
            simulation.InitializeRunSeed(seed);
            var elites = 0;
            for (var stage = 1; stage <= WyrmrealmMapState.CombatStages; stage++)
            {
                // One node per stage: the path a single hunt actually walks.
                var node = simulation.MapNodes.FirstOrDefault(candidate => candidate.Stage == stage && candidate.Type == WyrmrealmNodeType.Combat);
                if (node is null) continue;
                Invoke(simulation, "RollNodeElite", node);
                var index = Field<int>(simulation, "eliteSpawnIndex");
                if (index < 0) continue;
                Assert.IsGreaterThanOrEqualTo(RunSimulation.EliteFirstEligibleStage, node.Stage, "Never on the two introductory stages.");
                Assert.AreNotEqual(WyrmrealmHabitat.Outskirts, node.Habitat, "Never on the tutorial road.");
                Assert.IsTrue(index is >= RunSimulation.EliteEarliestSpawn and <= RunSimulation.EliteLatestSpawn);
                elites++;
                SetField(simulation, "elitesThisMap", elites);
            }
            Assert.IsLessThanOrEqualTo(RunSimulation.MaxElitesPerMap, elites);
            totalElites += elites;
            if (elites > 0) huntsWithElite++;
        }
        var share = huntsWithElite / (double)hunts;
        Assert.IsGreaterThan(0.2, share, $"Elites should show up in a fair share of hunts, saw {share:P0}.");
        Assert.IsLessThan(0.7, share, $"Elites must stay a surprise, saw {share:P0}.");
        Assert.IsLessThan(1.0, totalElites / (double)hunts, "Target is 0-2 per hunt, averaging well under one.");
    }

    [TestMethod]
    public void EliteRoll_IsSeededAndDoesNotTouchTheSpawnStream()
    {
        Assert.AreEqual(RunSimulation.EliteRollSeed(42, 1, "stage-3-a"), RunSimulation.EliteRollSeed(42, 1, "stage-3-a"));
        Assert.AreNotEqual(RunSimulation.EliteRollSeed(42, 1, "stage-3-a"), RunSimulation.EliteRollSeed(42, 2, "stage-3-a"));
        Assert.AreNotEqual(RunSimulation.EliteRollSeed(42, 1, "stage-3-a"), RunSimulation.EliteRollSeed(42, 1, "stage-3-b"));
    }

    [TestMethod]
    public void RolledSpawn_IsPromoted_WithMoreHealth_AndIsAnnouncedOnce()
    {
        var (simulation, _, enemies) = Encounter();
        SetField(simulation, "eliteSpawnIndex", 2);
        SetField(simulation, "nodeSpawnCount", 0);
        for (var time = 0d; time < 10 && Field<int>(simulation, "nodeSpawnCount") < 4; time += 0.05) Invoke(simulation, "UpdateSpawn", 0.05, 390d, 700d);
        var all = enemies.Concat(Field<List<EnemyState>>(simulation, "submergedWraiths")).OrderBy(enemy => enemy.Id).ToArray();
        Assert.HasCount(1, all.Where(enemy => enemy.IsElite));
        var elite = all[1];
        Assert.IsTrue(elite.IsElite, "Exactly the rolled k-th spawn is promoted.");
        Assert.AreEqual(EliteAffixCatalog.For(elite.Kind).Affix, elite.Elite);
        var ordinary = all.First(enemy => !enemy.IsElite && enemy.Kind == elite.Kind && enemy.MaxHealth > 0);
        Assert.AreEqual(ordinary.MaxHealth * EliteAffixCatalog.Get(elite.Elite).HealthMultiplier, elite.MaxHealth, 0.001);
        Assert.AreEqual(1, simulation.EliteSightings);
        Assert.AreEqual(elite.Elite, simulation.LastEliteSighted!.Affix);
        if (enemies.Contains(elite)) Assert.AreEqual(elite.Elite.ToString(), simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == elite.Id).Elite);
    }

    [TestMethod]
    public void EliteStats_StayInsideTheBriefBands()
    {
        Assert.HasCount(Enum.GetValues<EnemyKind>().Length, EliteAffixCatalog.All);
        foreach (var definition in EliteAffixCatalog.All)
        {
            Assert.IsTrue(definition.HealthMultiplier is >= 1.35 and <= 1.6, definition.Title);
            Assert.IsTrue(definition.ImpactMultiplier is >= 1.1 and <= 1.25, definition.Title);
        }
    }

    [TestMethod]
    public void EliteDeath_PaysBoostedExperienceExactlyOnce()
    {
        var (simulation, player, enemies) = Encounter();
        var elite = new EnemyState(700, player.Position + new Vector2D(300, 0), 12, 40, 0, EnemyKind.Penitent) { Elite = EliteAffix.Oathshield };
        enemies.Add(elite);
        var shards = Field<ExperienceShardField>(simulation, "experienceShards");
        var before = shards.TotalValue;
        Kill(simulation, elite);
        Kill(simulation, elite);
        Invoke(simulation, "DamageTarget", elite, 50d, null, null);
        var expected = (int)Math.Round(EnemyCatalog.Get(EnemyKind.Penitent).ThreatCost * EliteAffixCatalog.ExperienceMultiplier);
        Assert.AreEqual(before + expected, shards.TotalValue);
        Assert.HasCount(1, simulation.DefeatedElites);
        Assert.AreEqual(new EliteDefeat(EnemyKind.Penitent, EliteAffix.Oathshield, expected), simulation.DefeatedElites[0]);
    }

    [TestMethod]
    public void Gravebound_EruptsAfterADelay_OnlyInsideItsMarkedRing()
    {
        var (simulation, player, enemies) = Encounter();
        var elite = new EnemyState(700, player.Position + new Vector2D(30, 0), 11, 40, 0, EnemyKind.Hollow) { Elite = EliteAffix.Gravebound };
        enemies.Add(elite);
        Kill(simulation, elite);
        enemies.Remove(elite);
        var blast = simulation.CreateSnapshot().HostileProjectiles.Single();
        Assert.AreEqual("grave", blast.Style);
        Assert.AreEqual(RunSimulation.GraveboundRadius, blast.Radius);
        var health = player.Health;
        Step(simulation, RunSimulation.GraveboundDelaySeconds * 0.5);
        Assert.AreEqual(health, player.Health, "Nothing lands before the mark fills.");
        Step(simulation, RunSimulation.GraveboundDelaySeconds);
        Assert.AreEqual(health - RunSimulation.GraveboundDamage * EliteAffixCatalog.Get(EliteAffix.Gravebound).ImpactMultiplier, player.Health, 0.001);

        var (escaped, hunter, pack) = Encounter();
        var second = new EnemyState(701, hunter.Position + new Vector2D(30, 0), 11, 40, 0, EnemyKind.Hollow) { Elite = EliteAffix.Gravebound };
        pack.Add(second);
        Kill(escaped, second);
        hunter.Position += new Vector2D(-100, 0);
        Step(escaped, 1.5);
        Assert.AreEqual(hunter.MaxHealth, hunter.Health, "Stepping out of the ring avoids it completely.");
    }

    [TestMethod]
    public void Packblood_HastesNearbyAshlings_AndShieldsThemFromTheRout()
    {
        var (simulation, player, enemies) = Encounter();
        var leader = new EnemyState(700, player.Position + new Vector2D(300, 0), 8, 1000, 80, EnemyKind.Ashling) { Elite = EliteAffix.Packblood };
        var near = new EnemyState(701, player.Position + new Vector2D(300, 60), 8, 1000, 80, EnemyKind.Ashling);
        var far = new EnemyState(702, player.Position + new Vector2D(-300, 0), 8, 1000, 80, EnemyKind.Ashling);
        var priest = new EnemyState(703, player.Position + new Vector2D(250, 0), 12, 1, 0, EnemyKind.AshPriest);
        enemies.AddRange([leader, near, far, priest]);
        var nearStart = Vector2D.Distance(near.Position, player.Position);
        var farStart = Vector2D.Distance(far.Position, player.Position);
        Step(simulation, 0.25);
        var nearMoved = nearStart - Vector2D.Distance(near.Position, player.Position);
        var farMoved = farStart - Vector2D.Distance(far.Position, player.Position);
        Assert.IsGreaterThan(farMoved * 1.1, nearMoved, "Ashlings in the howl run faster.");

        far.Position = priest.Position + new Vector2D(-100, 200);
        Kill(simulation, priest);
        Assert.AreEqual(0d, near.RoutedRemaining, "The Packblood's pack does not break.");
        Assert.AreEqual(0d, leader.RoutedRemaining);
        Assert.IsGreaterThan(0d, far.RoutedRemaining, "Ashlings outside the howl still rout.");
    }

    [TestMethod]
    public void EliteAshling_LeavesNoRemainsToRaise()
    {
        var (simulation, player, enemies) = Encounter();
        var leader = new EnemyState(700, player.Position + new Vector2D(300, 0), 8, 10, 0, EnemyKind.Ashling) { Elite = EliteAffix.Packblood };
        enemies.Add(leader);
        Kill(simulation, leader);
        Assert.IsEmpty(simulation.CreateSnapshot().AshRemains);
    }

    [TestMethod]
    public void EmberAnointer_HealsFarMore_ThroughTheSameTether()
    {
        var (simulation, player, enemies) = Encounter();
        var priest = new EnemyState(700, player.Position + new Vector2D(280, 0), 12, 50, 0, EnemyKind.AshPriest) { Elite = EliteAffix.EmberAnointer };
        var wounded = new EnemyState(701, player.Position + new Vector2D(200, 0), 8, 40, 0, EnemyKind.Ashling) { Health = 4 };
        enemies.AddRange([priest, wounded]);
        for (var time = 0d; time < 5 && priest.AshPriest!.CastsCompleted == 0; time += 0.05) Step(simulation, 0.05);
        Assert.AreEqual(4 + 40 * RunSimulation.EmberAnointerHealFraction, wounded.Health, 0.001);
    }

    [TestMethod]
    public void CinderMarksman_ThrowsTwoSeparatelyMarkedEmbers()
    {
        var (simulation, player, enemies) = Encounter();
        var slinger = new EnemyState(700, player.Position + new Vector2D(250, 0), 11, 40, 0, EnemyKind.AshSlinger) { Elite = EliteAffix.CinderMarksman };
        enemies.Add(slinger);
        SetField(simulation, "encounterSeconds", 30d);
        var hostiles = Field<System.Collections.IList>(simulation, "hostileProjectiles");
        for (var time = 0d; time < 6 && hostiles.Count == 0; time += 0.05) Step(simulation, 0.05);
        var embers = simulation.CreateSnapshot().HostileProjectiles;
        Assert.HasCount(2, embers);
        Assert.IsTrue(embers.All(ember => ember.Style == "ember"));
        var gap = Math.Sqrt(Math.Pow(embers[0].TargetX - embers[1].TargetX, 2) + Math.Pow(embers[0].TargetY - embers[1].TargetY, 2));
        Assert.AreEqual(RunSimulation.CinderMarksmanSpread, gap, 0.001, "Two distinct landing marks, never stacked.");
        Assert.IsGreaterThan(AshSlingerBehaviorState.ImpactRadius * 1.4, gap, "One step clears both.");
    }

    [TestMethod]
    public void Drowncaller_StrikeLeavesOneDelayedEcho()
    {
        var (simulation, player, enemies) = Encounter();
        var wraith = new EnemyState(700, player.Position + new Vector2D(100, 0), 12, 400, 70, EnemyKind.DrownedWraith) { Elite = EliteAffix.Drowncaller };
        Field<List<EnemyState>>(simulation, "submergedWraiths").Add(wraith);
        for (var time = 0d; time < 8 && wraith.DrownedWraith!.Phase != DrownedWraithPhase.Exposed; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
        }
        var echo = simulation.CreateSnapshot().HostileProjectiles.Single();
        Assert.AreEqual("echo", echo.Style);
        Assert.AreEqual(RunSimulation.DrowncallerEchoRadius, echo.Radius);
        Assert.IsLessThan(DrownedWraithBehaviorState.StrikeReach, Math.Abs(echo.TargetX - wraith.Position.X) + Math.Abs(echo.TargetY - wraith.Position.Y) + 0.001);
    }

    [TestMethod]
    public void Thornrunner_SwitchesFlankOnceBeforeEachPounce()
    {
        var hound = new EnemyState(3, Vector2D.Zero, 13, 40, 80, EnemyKind.MireHound) { Elite = EliteAffix.Thornrunner }.MireHound!;
        var sign = hound.OrbitSign;
        var target = new Vector2D(100, 0);
        var started = false;
        for (var time = 0d; time < 3 && !started; time += 0.05) started = hound.Tick(0.05, Vector2D.Zero, target);
        Assert.IsTrue(started);
        Assert.AreEqual(-sign, hound.OrbitSign, "It darted to the other flank first.");
        Assert.IsFalse(hound.Feinted, "The feint resets for the next lunge.");

        var plain = new EnemyState(3, Vector2D.Zero, 13, 40, 80, EnemyKind.MireHound).MireHound!;
        for (var time = 0d; time < 3 && !plain.Tick(0.05, Vector2D.Zero, target); time += 0.05) { }
        Assert.AreEqual(sign, plain.OrbitSign);
    }

    [TestMethod]
    public void Oathshield_BlocksMore_ButAClearHeavyHitStillBreaksIt()
    {
        var penitent = new EnemyState(1, Vector2D.Zero, 19, 100, 0, EnemyKind.Penitent) { Elite = EliteAffix.Oathshield }.Penitent!;
        penitent.Face(new Vector2D(1, 0));
        Assert.AreEqual(PenitentBehaviorState.OathshieldFrontalDamageMultiplier, penitent.DamageMultiplier(Vector2D.Zero, new Vector2D(50, 0)));
        Assert.AreEqual(1d, penitent.DamageMultiplier(Vector2D.Zero, new Vector2D(-50, 0)), "Flanking still works.");
        Assert.IsTrue(penitent.TryBreakGuard(100 * PenitentBehaviorState.GuardBreakHealthFraction, 100));
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
        Invoke(simulation, "DamageTarget", enemy, enemy.Health + 1, null, null);

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
