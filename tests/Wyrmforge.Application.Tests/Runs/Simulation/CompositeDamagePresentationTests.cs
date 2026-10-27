using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Damage;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class CompositeDamagePresentationTests
{
    [TestMethod]
    public void Fireball_LivingHollow_PublishesBloodWoundButNotDeathBurst()
    {
        var simulation = Scene();
        var hollow = AddEnemy(simulation, 41, 120);
        var killed = Hit(simulation, hollow, 22);
        var snapshot = simulation.CreateSnapshot();

        Assert.IsFalse(killed);
        Assert.IsGreaterThan(0, hollow.Health);
        Assert.AreEqual(1, snapshot.CombatWounds.Count);
        Assert.IsFalse(snapshot.CombatWounds[0].Killed);
        Assert.IsTrue((snapshot.CombatWounds[0].Traits & CombatDamageTraits.Fire) != 0);
        Assert.IsTrue((snapshot.CombatWounds[0].Traits & CombatDamageTraits.Explosive) != 0);
        Assert.AreEqual(0, snapshot.DeathBursts.Count);
        Assert.IsGreaterThan(0, snapshot.CombatWounds[0].Id);
    }

    [TestMethod]
    public void Fireball_LethalHollow_PublishesFieryExplosionFinisherWithoutInventingDamage()
    {
        var simulation = Scene();
        var hollow = AddEnemy(simulation, 52, 15);
        var killed = Hit(simulation, hollow, 20);
        var snapshot = simulation.CreateSnapshot();

        Assert.IsTrue(killed);
        Assert.IsLessThanOrEqualTo(0, hollow.Health);
        Assert.AreEqual(1, snapshot.CombatWounds.Count);
        Assert.IsTrue(snapshot.CombatWounds[0].Killed);
        Assert.AreEqual(1, snapshot.DeathBursts.Count);
        var traits = snapshot.DeathBursts[0].Traits;
        Assert.IsTrue(CombatDamageProfile.IsIncendiaryBlast(traits));
        Assert.AreEqual(EnemyKind.Hollow, snapshot.DeathBursts[0].Kind);
        Assert.AreEqual(52, snapshot.DeathBursts[0].EntityId);
    }

    [TestMethod]
    public void Fireball_DecalEvents_AreStableBetweenSnapshotsAndNeverAwardExtraKills()
    {
        var simulation = Scene();
        var hollow = AddEnemy(simulation, 73, 200);
        Hit(simulation, hollow, 20);
        var first = simulation.CreateSnapshot().CombatWounds;
        var repeated = simulation.CreateSnapshot().CombatWounds;

        Assert.AreEqual(1, first.Count);
        Assert.AreEqual(first[0].Id, repeated[0].Id);
        Assert.AreEqual(200-20, hollow.Health);
        Assert.AreEqual(0, simulation.CreateSnapshot().Hud.Kills);
    }

    private static RunSimulation Scene()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42);
        simulation.Tick(0, default, 800, 600);
        return simulation;
    }

    private static EnemyState AddEnemy(RunSimulation simulation, int id, double health)
    {
        var hollow = new EnemyState(id, new Vector2D(400, 300), 12, health, 0);
        var field = typeof(RunSimulation).GetField("enemies", BindingFlags.Instance | BindingFlags.NonPublic)!;
        ((List<EnemyState>)field.GetValue(simulation)!).Add(hollow);
        return hollow;
    }

    private static bool Hit(RunSimulation simulation, EnemyState enemy, double damage)
    {
        var projectile = new ProjectileState(enemy.Position, new Vector2D(50, 0), 8,
            damage, SpellId.FireBolt, new ProjectileEffects(false, 0, 0, null, 0, 0));
        var hit = typeof(RunSimulation).GetMethod("DamageTarget", BindingFlags.Instance | BindingFlags.NonPublic)!;
        return (bool)hit.Invoke(simulation, [enemy, damage, projectile, null])!;
    }
}
