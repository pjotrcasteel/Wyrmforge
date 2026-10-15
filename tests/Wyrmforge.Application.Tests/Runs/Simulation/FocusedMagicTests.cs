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
        Assert.AreEqual(SynergyId.Frostfire, simulation.CreateSnapshot().ElementalImpacts.Single().Combination);
        Assert.AreEqual(SpellId.FireBolt, simulation.CreateSnapshot().ElementalImpacts.Single().Spell);
    }

    [TestMethod]
    public void UpdateSpellcasting_FrostfireCast_ExposesActualPrimaryAndCombinationForPresentation()
    {
        var simulation = Create();
        var build = PrepareFireAndFrost(simulation);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        Assert.IsTrue(build.Synergies.Select(SynergyId.Frostfire, build.Spells));

        Invoke(simulation, "UpdateSpellcasting", 0d, false);

        var cast = simulation.CreateSnapshot().CastMotion;
        Assert.IsNotNull(cast);
        Assert.AreEqual(SpellId.FireBolt, cast.Spell);
        Assert.AreEqual(2, cast.Rank);
        Assert.AreEqual(SynergyId.Frostfire, cast.Combination);
        Assert.AreEqual(0d, cast.Progress);
        Assert.AreEqual(1, Projectiles(simulation).Count);
        Assert.AreEqual(SynergyId.Frostfire, simulation.CreateSnapshot().Projectiles.Single().Combination);
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


    [TestMethod]
    public void UpdateSpellcasting_RankTwoFire_OneShotDamagesTargetAndNearbyEnemy()
    {
        var simulation = Create();
        var build = Build(simulation);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.TryFocus(SpellId.FireBolt);
        var neighbour = new EnemyState(2, new Vector2D(105, 80), 10, 1000, 0);
        Field<List<EnemyState>>(simulation, "enemies").Add(neighbour);
        Invoke(simulation, "RebuildCombatSpatialIndex");

        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        var projectile = Projectiles(simulation).Single();
        Assert.AreEqual(52.65, projectile.Damage, .001);
        projectile.Position = Enemy(simulation).Position;
        Invoke(simulation, "ResolveProjectileHits");

        Assert.IsTrue(Enemy(simulation).Health < 1000);
        Assert.IsTrue(neighbour.Health < 1000);
        Assert.AreEqual(2, simulation.CreateSnapshot().ElementalImpacts.Single().Rank);
        Assert.AreEqual(0, Projectiles(simulation).Count);
    }

    [TestMethod]
    public void UpdateSpellcasting_MasteredFrost_PiercesThreeTargetsWithOneShard()
    {
        var simulation = Create();
        var build = Build(simulation);
        while (build.Spells.LearnOrUpgrade(SpellId.FrostShard)) { }
        build.Spells.TryFocus(SpellId.FrostShard);
        var targets = Field<List<EnemyState>>(simulation, "enemies");
        targets.Add(new EnemyState(2, new Vector2D(180, 80), 10, 1000, 0));
        targets.Add(new EnemyState(3, new Vector2D(280, 80), 10, 1000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        var projectile = Projectiles(simulation).Single();

        foreach (var target in targets)
        {
            projectile.Position = target.Position;
            Invoke(simulation, "ResolveProjectileHits");
        }

        Assert.IsTrue(targets.All(target => target.Health < 1000));
        Assert.AreEqual(0, Projectiles(simulation).Count);
    }

    [TestMethod]
    public void UpdateSpellcasting_FourthFocusedCast_SurgesOneProjectileAndPreservesTheImpact()
    {
        var simulation = Create();
        var build = Build(simulation);
        build.Spells.LearnOrUpgrade(SpellId.FireBolt);
        build.Spells.TryFocus(SpellId.FireBolt);
        var cooldowns = Field<Dictionary<SpellId, double>>(simulation, "spellCooldowns");

        for (var index = 0; index < 4; index++)
        {
            cooldowns[SpellId.FireBolt] = 0;
            Invoke(simulation, "UpdateSpellcasting", 0d, false);
        }

        var shots = Projectiles(simulation);
        Assert.AreEqual(4, shots.Count, "Focus Surge must not add a second scheduled projectile.");
        Assert.IsTrue(shots.Take(3).All(projectile => !projectile.Surge));
        var surge = shots[^1];
        Assert.IsTrue(surge.Surge);
        Assert.IsGreaterThan(shots[0].Damage, surge.Damage);
        Assert.IsGreaterThan(shots[0].Radius, surge.Radius);
        Assert.IsGreaterThan(shots[0].SplashRadius, surge.SplashRadius);
        Assert.IsTrue(simulation.CreateSnapshot().CastMotion?.Surge == true);
        Assert.IsTrue(simulation.CreateSnapshot().Projectiles.Last().Surge);

        surge.Position = Enemy(simulation).Position;
        Invoke(simulation, "ResolveProjectileHits");

        var impact = simulation.CreateSnapshot().ElementalImpacts.Single();
        Assert.IsTrue(impact.Surge);
        Assert.AreEqual(SpellId.FireBolt, impact.Spell);
    }

    [TestMethod]
    public void UpdateSpellcasting_SwitchingOrEchoes_DoesNotStealTheEarnedFourthCast()
    {
        var simulation = Create();
        var build = PrepareFireAndFrost(simulation);
        var cooldowns = Field<Dictionary<SpellId, double>>(simulation, "spellCooldowns");
        var fire = SpellCatalog.Get(SpellId.FireBolt);
        for (var index = 0; index < 3; index++)
        {
            cooldowns[SpellId.FireBolt] = 0;
            Invoke(simulation, "UpdateSpellcasting", 0d, false);
        }
        Invoke(simulation, "CastSpell", fire, 1, 1d, true);
        Assert.IsFalse(Projectiles(simulation)[^1].Surge);

        build.Spells.TryFocus(SpellId.FrostShard);
        cooldowns[SpellId.FrostShard] = 0;
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.IsFalse(Projectiles(simulation)[^1].Surge);

        build.Spells.TryFocus(SpellId.FireBolt);
        cooldowns[SpellId.FireBolt] = 0;
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.IsTrue(Projectiles(simulation)[^1].Surge);
    }

    [TestMethod]
    public void UpdateSpellcasting_FourthChainCast_SurgesButSupportProcDoesNot()
    {
        var simulation = Create();
        var build = Build(simulation);
        build.Spells.LearnOrUpgrade(SpellId.ChainLightning);
        build.Spells.TryFocus(SpellId.ChainLightning);
        var targets = Field<List<EnemyState>>(simulation, "enemies");
        for (var id = 2; id <= 12; id++) targets.Add(new EnemyState(id, new Vector2D(80 + id * 30, 80), 10, 1000, 0));
        var cooldowns = Field<Dictionary<SpellId, double>>(simulation, "spellCooldowns");

        for (var index = 0; index < 3; index++)
        {
            cooldowns[SpellId.ChainLightning] = 0;
            Invoke(simulation, "UpdateSpellcasting", 0d, false);
        }
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.All(impact => !impact.Surge));
        cooldowns[SpellId.ChainLightning] = 0;
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.Any(impact => impact.Surge));
        Assert.IsTrue(simulation.CreateSnapshot().CastMotion?.Surge == true);

        // Arcane Conduit's helper is a separate proc and never charges or consumes a focus surge.
        Invoke(simulation, "CastChainLightning", 1, new Vector2D(80, 80), 1d, 0);
        Assert.IsFalse(simulation.CreateSnapshot().ElementalImpacts.Last().Surge);
    }

    [TestMethod]
    public void CastChainLightning_SupportProc_DoesNotInheritPrimaryCoverageOrDamage()
    {
        var simulation = Create();
        var build = Build(simulation);
        while (build.Spells.LearnOrUpgrade(SpellId.ChainLightning)) { }
        build.Spells.TryFocus(SpellId.ChainLightning);
        var targets = Field<List<EnemyState>>(simulation, "enemies");
        for (var id = 2; id <= 10; id++) targets.Add(new EnemyState(id, new Vector2D(80 + id * 30, 80), 10, 1000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");

        Invoke(simulation, "CastChainLightning", 3, new Vector2D(80, 80), 1d, 0);
        var supportHits = targets.Count(target => target.Health < 1000);
        // NearestTarget excludes the exact origin: the first unfaded hit reaches id 2.
        // Chain Lightning mastery forks before the next regular jump reaches the origin at native falloff.
        Assert.AreEqual(25, 1000 - targets[1].Health, .001);
        Assert.AreEqual(21, 1000 - Enemy(simulation).Health, .001);
        var before = targets.Select(target => target.Health).ToArray();
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        var primaryHits = targets.Where((target, index) => target.Health < before[index]).Count();

        Assert.IsTrue(primaryHits > supportHits);
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.All(impact => impact.Combination is null));
        Assert.AreEqual(0, Projectiles(simulation).Count);
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
