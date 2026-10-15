using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class FocusedMagicTests
{
    [TestMethod]
    public void UpdateSpellcasting_MultipleLearnedSpells_OnlyFocusedSpellCasts()
    {
        var simulation = Create();
        var build = Build(simulation);
        foreach (var spell in SpellCatalog.All) build.Spells.LearnOrUpgrade(spell.Id);
        Assert.IsTrue(build.Spells.TryFocus(SpellId.FireBolt));

        Invoke(simulation, "UpdateSpellcasting", 0d, false);

        Assert.AreEqual(1, Projectiles(simulation).Count);
        Assert.AreEqual(SpellId.FireBolt, Projectiles(simulation)[0].Spell);
        Assert.AreEqual(0, simulation.CreateSnapshot().Lightning.Count);
    }

    [TestMethod]
    public void ResolveProjectileHits_LearnedFrostWithoutCombination_DoesNotFreezeFireTarget()
    {
        var simulation = Create();
        PrepareFireAndFrost(simulation);
        var enemy = Enemy(simulation);
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Projectiles(simulation)[0].Position = enemy.Position;

        Invoke(simulation, "ResolveProjectileHits");

        Assert.IsFalse(enemy.Statuses.Has(CombatStatusId.Frozen));
        Assert.IsFalse(enemy.Statuses.Has(CombatStatusId.Burning));
    }

    [TestMethod]
    [DataRow(SpellId.FireBolt)]
    [DataRow(SpellId.FrostShard)]
    public void ResolveProjectileHits_SelectedFrostfire_FreezesAndBurnsWithOneProjectile(SpellId focus)
    {
        var simulation = Create();
        var build = PrepareFireAndFrost(simulation);
        build.Spells.TryFocus(focus);
        Assert.IsTrue(build.Synergies.Select(SynergyId.Frostfire, build.Spells));
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.AreEqual(1, Projectiles(simulation).Count);
        Assert.AreEqual(SynergyId.Frostfire, simulation.CreateSnapshot().Projectiles.Single().Combination);
        Projectiles(simulation)[0].Position = Enemy(simulation).Position;

        Invoke(simulation, "ResolveProjectileHits");

        Assert.IsTrue(Enemy(simulation).Statuses.Has(CombatStatusId.Frozen));
        Assert.IsTrue(Enemy(simulation).Statuses.Has(CombatStatusId.Burning));
        var health = Enemy(simulation).Health;
        Invoke(simulation, "ApplyStatusDamage", Enemy(simulation), .1d);
        Assert.IsLessThan(health, Enemy(simulation).Health);
    }

    [TestMethod]
    public void ResolveProjectileHits_FocusChangedAfterLaunch_PreservesCombinedPayload()
    {
        var simulation = Create();
        var build = PrepareFireAndFrost(simulation);
        build.Synergies.Select(SynergyId.Frostfire, build.Spells);
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        var projectile = Projectiles(simulation).Single();
        Assert.IsTrue(build.Spells.TryFocus(SpellId.ArcaneOrb));
        projectile.Position = Enemy(simulation).Position;

        Invoke(simulation, "ResolveProjectileHits");

        Assert.IsTrue(Enemy(simulation).Statuses.Has(CombatStatusId.Frozen));
        Assert.IsTrue(Enemy(simulation).Statuses.Has(CombatStatusId.Burning));
    }

    [TestMethod]
    public void UpdateSpellcasting_SwitchAwayAndBack_DoesNotResetPreviousCastCooldown()
    {
        var simulation = Create();
        var build = PrepareFireAndFrost(simulation);
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        build.Spells.TryFocus(SpellId.FrostShard);
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        build.Spells.TryFocus(SpellId.FireBolt);

        Invoke(simulation, "UpdateSpellcasting", 0d, false);

        Assert.AreEqual(2, Projectiles(simulation).Count);
    }

    private static RunSimulation Create()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Field<List<EnemyState>>(simulation, "enemies").Add(new EnemyState(1, new Vector2D(80, 80), 10, 1000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        return simulation;
    }

    private static RunBuildState PrepareFireAndFrost(RunSimulation simulation)
    {
        var build = Build(simulation);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FrostShard);
        build.Spells.TryFocus(SpellId.FireBolt);
        return build;
    }

    private static RunBuildState Build(RunSimulation simulation) => Field<RunBuildState>(simulation, "build");
    private static EnemyState Enemy(RunSimulation simulation) => Field<List<EnemyState>>(simulation, "enemies")[0];
    private static List<ProjectileState> Projectiles(RunSimulation simulation) => Field<List<ProjectileState>>(simulation, "projectiles");
    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
    private static object? Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
