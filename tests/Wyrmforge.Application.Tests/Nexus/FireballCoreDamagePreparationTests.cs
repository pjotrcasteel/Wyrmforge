using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireballCoreDamagePreparationTests
{
    [TestMethod]
    public void FireballCoreLevel_IncreasesBaseDamageWithoutGrantingMutations()
    {
        var factory = new RunSimulationFactory(new FirstRandomSource());
        var novice = factory.Create(new HashSet<string>(), seed: 12001, fireballLevel: 1);
        var veteran = factory.Create(new HashSet<string>(), seed: 12001, fireballLevel: 5);

        Assert.AreEqual(1, novice.PreparedFireballDamageMultiplier, 0.00001);
        Assert.AreEqual(1.32, veteran.PreparedFireballDamageMultiplier, 0.00001);
        Assert.AreEqual(0, veteran.PreparedFireballMutations.Count);
        Assert.IsTrue(veteran.ChoosePrimary(SpellId.FireBolt));
        Assert.AreEqual(5, veteran.PreparedFireballLevel);
        Assert.AreEqual(0, veteran.PreparedFireballMutations.Count);
    }

    [TestMethod]
    public void FireballCoreLevel_AfterHuntBegins_CannotBeChanged()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(
            new HashSet<string>(), seed: 12002, fireballLevel: 3);

        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.PrepareFireballCoreLevel(5);
        Assert.AreEqual(3, simulation.PreparedFireballLevel);
        Assert.AreEqual(FireballCoreCatalog.DamageMultiplier(3), simulation.PreparedFireballDamageMultiplier, 0.00001);
    }

    [TestMethod]
    public void FireballCoreLevel_FireballProjectileDamage_ActuallyIncreasesInCombat()
    {
        var novice = CastProjectile(SpellId.FireBolt, 1);
        var veteran = CastProjectile(SpellId.FireBolt, 5);

        Assert.AreEqual(novice.Damage * 1.32, veteran.Damage, .000001,
            "Permanent core levels must increase actual Fireball damage, not just display a number.");
    }

    [TestMethod]
    public void FireballCoreLevel_AnotherSchoolProjectileDamage_IsUnchanged()
    {
        var novice = CastProjectile(SpellId.FrostShard, 1);
        var veteran = CastProjectile(SpellId.FrostShard, 5);

        Assert.AreEqual(novice.Damage, veteran.Damage, .000001,
            "A Fireball core upgrade must not leak into other spells.");
    }

    private static ProjectileState CastProjectile(SpellId primary, int fireballLevel)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var flags = BindingFlags.Instance | BindingFlags.NonPublic;
        var enemies = (List<EnemyState>)typeof(RunSimulation).GetField("enemies", flags)!.GetValue(simulation)!;
        enemies.Add(new EnemyState(1, new Vector2D(80, 80), 10, 1000, 0));
        typeof(RunSimulation).GetMethod("RebuildCombatSpatialIndex", flags)!.Invoke(simulation, null);

        simulation.PrepareFireballCoreLevel(fireballLevel);
        Assert.IsTrue(simulation.ChoosePrimary(primary));
        typeof(RunSimulation).GetMethod("UpdateSpellcasting", flags)!.Invoke(simulation, [0d, false]);
        var projectiles = (List<ProjectileState>)typeof(RunSimulation).GetField("projectiles", flags)!.GetValue(simulation)!;

        Assert.AreEqual(1, projectiles.Count);
        return projectiles[0];
    }

    [TestMethod]
    public void FireballCoreLevel_RejectsInvalidExternalSaveLevels()
    {
        Assert.AreEqual(1, FireballCoreCatalog.DamageMultiplier(-99), 0.00001);
        Assert.AreEqual(1.32, FireballCoreCatalog.DamageMultiplier(99), 0.00001);
    }
}
