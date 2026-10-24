using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireballMutatorCompositionTests
{
    [TestMethod]
    public void Cast_AllSixteenPlayableCombinations_PreserveOneFireballAndOwnEachPhase()
    {
        var baseline = Cast([]);
        var choices = new[]
        {
            FireballMutationId.MeteorHeart, FireballMutationId.Detonation,
            FireballMutationId.ScorchedEarth, FireballMutationId.CinderNeedle,
        };

        for (var mask = 0; mask < 16; mask++)
        {
            var equipped = choices.Where((_, index) => (mask & (1 << index)) != 0).ToArray();
            var (simulation, projectile, target) = Cast(equipped);

            Assert.AreEqual(mask, projectile.FireballMutationMask, $"Cast mask {mask}.");
            Assert.AreEqual(1, Projectiles(simulation).Count,
                $"Equipping {mask} must transform the one signature, not add free casts.");
            Assert.AreEqual(mask, simulation.CreateSnapshot().Projectiles.Single().FireballMutationMask);

            var meteor = (mask & 1) != 0;
            var detonation = (mask & 2) != 0;
            var scorched = (mask & 4) != 0;
            var needle = (mask & 8) != 0;
            Assert.AreEqual(baseline.Projectile.Damage * (meteor ? 1.15 : 1) * (needle ? .70 : 1),
                projectile.Damage, .000001, $"Damage tradeoffs for {mask}.");
            Assert.AreEqual(baseline.Projectile.Radius * (meteor ? 1.45 : 1) * (needle ? .72 : 1),
                projectile.Radius, .000001, $"Physical silhouette/collision radius for {mask}.");
            Assert.AreEqual(baseline.Projectile.Velocity.Length * (meteor ? .75 : 1) * (needle ? 1.4 : 1),
                projectile.Velocity.Length, .000001, $"Travel speed for {mask}.");
            if (detonation) Assert.IsGreaterThan(0d, projectile.SplashRadius, $"Detonation {mask} must explode.");
            else Assert.AreEqual(0d, projectile.SplashRadius, .000001,
                $"Scorched Earth is persistence, not an invisible explosion ({mask}).");

            projectile.Position = target.Position;
            Invoke(simulation, "ResolveProjectileHits");
            var snapshot = simulation.CreateSnapshot();
            Assert.AreEqual(0, snapshot.Projectiles.Count, "One spent Fireball does not make a second shot.");
            var impact = snapshot.ElementalImpacts.Single();
            Assert.AreEqual(mask, impact.FireballMutationMask);
            Assert.AreEqual(projectile.SplashRadius, impact.SplashRadius, .000001);
            Assert.AreEqual(scorched ? 1 : 0, snapshot.BurningGrounds.Count,
                $"Rank-I Scorched Earth persistence for {mask}.");
            if (scorched)
            {
                var ground = snapshot.BurningGrounds.Single();
                Assert.AreEqual(mask, ground.FireballMutationMask);
                Assert.IsGreaterThan(0d, ground.RemainingSeconds);
            }
            Assert.AreEqual(mask, snapshot.FireballVisual!.MutationMask);
        }
    }

    [TestMethod]
    public void Hit_StandaloneCinderNeedleSpell_DoesNotBorrowFireballMutators()
    {
        var (simulation, _, _) = Cast([FireballMutationId.MeteorHeart, FireballMutationId.Detonation,
            FireballMutationId.ScorchedEarth]);
        Projectiles(simulation).Clear();

        Invoke(simulation, "CastSpell", SpellCatalog.Get(SpellId.CinderNeedle), 1, 1d, false);

        var projectile = Projectiles(simulation).Single();
        Assert.AreEqual(SpellId.CinderNeedle, projectile.Spell);
        Assert.AreEqual(0, projectile.FireballMutationMask);
        Assert.AreEqual(0, simulation.CreateSnapshot().Projectiles.Single().FireballMutationMask);
    }

    private static (RunSimulation Simulation, ProjectileState Projectile, EnemyState Target) Cast(
        FireballMutationId[] equipped)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var target = new EnemyState(1, new Vector2D(80, 80), 10, 100000, 0);
        Field<List<EnemyState>>(simulation, "enemies").Add(target);
        simulation.PrepareFireballCoreLevel(4);
        simulation.PrepareFireballMutations(equipped);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        return (simulation, Projectiles(simulation).Single(), target);
    }

    private static List<ProjectileState> Projectiles(RunSimulation simulation) =>
        Field<List<ProjectileState>>(simulation, "projectiles");

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static object? Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
