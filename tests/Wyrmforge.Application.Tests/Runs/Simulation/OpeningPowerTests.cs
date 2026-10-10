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
    public void OpeningTrails_SpawnCapsGrowGraduallyAndReachNormalPressureAtStageSix()
    {
        var simulation = Create();
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        for (var frame = 0; frame < 500; frame++) Invoke(simulation, "UpdateSpawn", 0.05d, 390d, 700d);
        Assert.AreEqual(8, Field<List<EnemyState>>(simulation, "enemies").Count);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        foreach (var expectedCap in new[] { 10, 10, 14, 14, 22 })
        {
            var quota = map.CurrentNodeKillsRequired;
            for (var kill = 0; kill < quota; kill++) map.RegisterKill();
            Field<List<EnemyState>>(simulation, "enemies").Clear();
            Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
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
