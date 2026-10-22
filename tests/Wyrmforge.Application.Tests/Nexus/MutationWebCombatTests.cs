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
public sealed class MutationWebCombatTests
{
    [TestMethod]
    [DataRow(FireballMutationId.CinderNeedle, "fire-needle-practice", "speed", 1.10)]
    [DataRow(FireballMutationId.MeteorHeart, "fire-molten-density", "damage", 1.08)]
    [DataRow(FireballMutationId.Detonation, "fire-blast-shaping", "radius", 1.10)]
    public void LearnedEnhancement_ChangesActualMatchingProjectileOnly(FireballMutationId mutation, string node, string stat, double multiplier)
    {
        var baseline = Cast([], [mutation]);
        var enhanced = Cast([node], [mutation]);
        var unmutated = Cast([], []);
        var dormant = Cast([node], []);
        double Value(ProjectileState projectile) => stat switch
        {
            "speed" => Math.Sqrt(projectile.Velocity.X * projectile.Velocity.X + projectile.Velocity.Y * projectile.Velocity.Y),
            "damage" => projectile.Damage,
            _ => projectile.SplashRadius,
        };
        Assert.AreEqual(Value(baseline) * multiplier, Value(enhanced), .000001);
        Assert.AreEqual(Value(unmutated), Value(dormant), .000001);
    }

    [TestMethod]
    public void BlastShaping_EnhancesTheFinalExplosionAtHigherFireballRanks()
    {
        ProjectileState RankedCast(string[] nodes)
        {
            var simulation = Create(nodes, [FireballMutationId.Detonation]);
            var build = Field<RunBuildState>(simulation, "build");
            build.Spells.LearnOrUpgrade(SpellId.FireBolt);
            build.Spells.LearnOrUpgrade(SpellId.FireBolt);
            return Fire(simulation);
        }
        var baseline = RankedCast([]);
        var enhanced = RankedCast(["fire-blast-shaping"]);
        Assert.AreEqual(baseline.SplashRadius * 1.10, enhanced.SplashRadius, .000001);
    }

    [TestMethod]
    public void BankedEmbers_ExtendsActualScorchedEarthGroundOnly()
    {
        var normal = GroundDuration([], [FireballMutationId.ScorchedEarth]);
        var enhanced = GroundDuration(["fire-banked-embers"], [FireballMutationId.ScorchedEarth]);
        Assert.AreEqual(normal * 1.15, enhanced, .000001);
    }

    private static double GroundDuration(string[] nodes, FireballMutationId[] mutations)
    {
        var simulation = Create(nodes, mutations);
        var projectile = Fire(simulation);
        Invoke(simulation, "RegisterBurningGround", projectile, new Vector2D(80, 80));
        return Field<List<BurningGroundState>>(simulation, "burningGrounds").Single().RemainingSeconds;
    }

    private static ProjectileState Cast(string[] nodes, FireballMutationId[] mutations) => Fire(Create(nodes, mutations));

    private static RunSimulation Create(string[] nodes, FireballMutationId[] mutations)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(nodes.ToHashSet(), new LevelChoiceService(random), random);
        Field<List<EnemyState>>(simulation, "enemies").Add(new EnemyState(1, new Vector2D(80, 80), 10, 1000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        simulation.PrepareFireballMutations(mutations);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        return simulation;
    }

    private static ProjectileState Fire(RunSimulation simulation)
    {
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        return Field<List<ProjectileState>>(simulation, "projectiles").Single();
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
    private static object? Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
