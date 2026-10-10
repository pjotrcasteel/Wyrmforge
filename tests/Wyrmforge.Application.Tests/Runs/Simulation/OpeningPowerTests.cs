using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class OpeningPowerTests
{
    [TestMethod]
    public void EnteringTrail_LeavesTwoSecondsToMoveBeforeSpawnsOrPhaseClock()
    {
        var simulation = Create();
        simulation.ChooseMapNode(simulation.AvailableMapNodes.OrderBy(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First().Id);
        for (var frame = 0; frame < 39; frame++) simulation.Tick(0.05, default, 390, 700);
        Assert.AreEqual(0, simulation.CreateSnapshot().Enemies.Count);
        Assert.AreEqual(0d, Field<EncounterDirector>(simulation, "encounterDirector").PhaseElapsed);
        for (var frame = 0; frame < 6; frame++) simulation.Tick(0.05, default, 390, 700);
        Assert.IsTrue(simulation.CreateSnapshot().Enemies.Count > 0);
    }

    [TestMethod]
    public void UpgradeChoice_FreezesAllEnemiesAndPushesCloseEnemiesFurtherWithoutHurtingThem()
    {
        var simulation = Create();
        simulation.ChooseMapNode(simulation.AvailableMapNodes.OrderBy(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First().Id);
        simulation.Tick(0, default, 390, 700);
        var center = simulation.CreateSnapshot().Player;
        var targets = new[] { 20d, 100d, 220d }.Select((distance, index) =>
            new EnemyState(index + 1, new Vector2D(center.X + distance, center.Y), 10, 100, 0)).ToArray();
        Field<List<EnemyState>>(simulation, "enemies").AddRange(targets);
        Invoke(simulation, "GainExperience", 100);
        Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        var pushes = targets.Select((enemy, index) => enemy.Position.X - center.X - new[] { 20d, 100d, 220d }[index]).ToArray();
        Assert.IsTrue(pushes[0] > pushes[1] && pushes[1] > 0);
        Assert.AreEqual(0d, pushes[2]);
        Assert.IsNotNull(simulation.CreateSnapshot().PowerBurst);
        foreach (var enemy in targets)
        {
            Assert.AreEqual(100d, enemy.Health);
            Assert.IsTrue(enemy.Statuses.Has(CombatStatusId.Frozen));
            enemy.Statuses.Tick(0.86);
            Assert.IsFalse(enemy.Statuses.Has(CombatStatusId.Frozen));
        }
        Assert.IsFalse(simulation.ApplyChoice("invalid"));
    }

    [TestMethod]
    public void OpeningTrails_SpawnCapsGrowGraduallyAndReachNormalPressureAtStageEight()
    {
        var simulation = Create();
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.OrderBy(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First().Id));
        for (var frame = 0; frame < 500; frame++) Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(8, Field<List<EnemyState>>(simulation, "enemies").Count);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        foreach (var expectedCap in new[] { 8, 10, 10, 14, 14, 14, 22 })
        {
            var quota = map.CurrentNodeKillsRequired;
            for (var kill = 0; kill < quota; kill++) map.RegisterKill();
            Field<List<EnemyState>>(simulation, "enemies").Clear();
            Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.OrderBy(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First().Id));
            for (var frame = 0; frame < 600; frame++) Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
            Assert.AreEqual(expectedCap, Field<List<EnemyState>>(simulation, "enemies").Count);
        }
    }

    [TestMethod]
    public void ArcaneOrb_RankTwoHitsTwoTargetsButCannotHitAThird()
    {
        var simulation = Create();
        var targets = AddTargets(simulation);
        var projectile = Cast(simulation, SpellId.ArcaneOrb, 2);
        foreach (var target in targets)
        {
            projectile.Position = target.Position;
            Invoke(simulation, "ResolveProjectileHits");
        }
        Assert.IsTrue(targets[0].Health < 100);
        Assert.IsTrue(targets[1].Health < 100);
        Assert.AreEqual(100d, targets[2].Health);
        Assert.AreEqual(0, Field<List<ProjectileState>>(simulation, "projectiles").Count);
    }

    [TestMethod]
    public void ArcaneOrb_RankOneStillStopsAtFirstTarget()
    {
        var simulation = Create();
        var targets = AddTargets(simulation);
        var projectile = Cast(simulation, SpellId.ArcaneOrb, 1);
        projectile.Position = targets[0].Position;
        Invoke(simulation, "ResolveProjectileHits");
        projectile.Position = targets[1].Position;
        Invoke(simulation, "ResolveProjectileHits");
        Assert.IsTrue(targets[0].Health < 100);
        Assert.AreEqual(100d, targets[1].Health);
    }

    [TestMethod]
    public void FrostShard_BaseHitProvidesBreathingRoomWithoutFreezingNeighbours()
    {
        var simulation = Create();
        var targets = AddTargets(simulation);
        var projectile = Cast(simulation, SpellId.FrostShard, 1);
        projectile.Position = targets[0].Position;
        Invoke(simulation, "ResolveProjectileHits");
        Assert.AreEqual(84d, targets[0].Health);
        Assert.IsTrue(targets[0].Statuses.Has(CombatStatusId.Frozen));
        Assert.IsFalse(targets[1].Statuses.Has(CombatStatusId.Frozen));
        targets[0].Statuses.Tick(0.6);
        Assert.AreEqual(0d, targets[0].Statuses.TimeScale(false));
        targets[0].Statuses.Tick(0.11);
        Assert.IsGreaterThan(0d, targets[0].Statuses.TimeScale(false));
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        return new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
    }

    private static EnemyState[] AddTargets(RunSimulation simulation)
    {
        var targets = Enumerable.Range(1, 3).Select(id => new EnemyState(id, new Vector2D(80 + id * 40, 80), 10, 100, 0)).ToArray();
        Field<List<EnemyState>>(simulation, "enemies").AddRange(targets);
        Invoke(simulation, "RebuildCombatSpatialIndex");
        return targets;
    }

    private static ProjectileState Cast(RunSimulation simulation, SpellId id, int rank)
    {
        var spell = SpellCatalog.Get(id);
        Invoke(simulation, "CastProjectileSpell", spell, (ProjectileAbilityProfile)spell.Ability.Delivery, rank, 1d);
        return Field<List<ProjectileState>>(simulation, "projectiles").Single();
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
