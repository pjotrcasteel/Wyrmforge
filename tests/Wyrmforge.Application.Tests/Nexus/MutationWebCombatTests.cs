using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class MutationWebCombatTests
{
    [TestMethod]
    [DataRow("fire-needle-practice", 1.03)]
    [DataRow("fire-blast-shaping", 1.04)]
    public void FireMinorAreaNode_LearnedWithDetonation_IncreasesExplosionRadiusOnly(string node, double multiplier)
    {
        var baseline = Cast([], [FireballMutationId.Detonation]);
        var enhanced = Cast([node], [FireballMutationId.Detonation]);
        var unrelated = Cast([node], [FireballMutationId.MeteorHeart]);

        Assert.AreEqual(baseline.SplashRadius * multiplier, enhanced.SplashRadius, .000001);
        Assert.AreEqual(baseline.Damage, enhanced.Damage, .000001);
        Assert.AreEqual(0d, unrelated.SplashRadius, .000001, "Area bonuses cannot grant Detonation to another mutation.");
    }

    [TestMethod]
    public void HotCoals_BoostsOnlyBurningGroundDamage_NotProjectileDamage()
    {
        var baselineProjectile = Cast([], [FireballMutationId.ScorchedEarth]);
        var enhancedProjectile = Cast(["fire-molten-density"], [FireballMutationId.ScorchedEarth]);
        var baselineGround = Ground([], [FireballMutationId.ScorchedEarth]);
        var enhancedGround = Ground(["fire-molten-density"], [FireballMutationId.ScorchedEarth]);

        Assert.AreEqual(baselineProjectile.Damage, enhancedProjectile.Damage, .000001);
        Assert.AreEqual(baselineGround.DamagePerTick * 1.03, enhancedGround.DamagePerTick, .000001);
    }

    [TestMethod]
    public void BlastShaping_IncreasesFinalExplosionAtHigherFireballRanks()
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
        Assert.AreEqual(baseline.SplashRadius * 1.04, enhanced.SplashRadius, .000001);
    }

    [TestMethod]
    public void BankedEmbers_ExtendsScorchedEarthWithoutRequiringExtraResearch()
    {
        var normal = GroundDuration([], [FireballMutationId.ScorchedEarth]);
        var enhanced = GroundDuration(["fire-banked-embers"], [FireballMutationId.ScorchedEarth]);

        Assert.AreEqual(normal * 1.04, enhanced, .000001);
    }

    [TestMethod]
    public void ConflagrationAreaAndDuration_ModifyActualBurningGroundNotProjectileDamage()
    {
        var baseline = Ground([], [FireballMutationId.ScorchedEarth]);
        var enhanced = Ground(["fire-ember-drift", "fire-ashfront"], [FireballMutationId.ScorchedEarth]);

        Assert.AreEqual(baseline.EffectiveRadius * 1.03, enhanced.EffectiveRadius, .000001);
        Assert.AreEqual(baseline.RemainingSeconds * 1.04, enhanced.RemainingSeconds, .000001);
        Assert.AreEqual(baseline.DamagePerTick, enhanced.DamagePerTick, .000001);
    }

    [TestMethod]
    public void LegacyNodeIds_StillGrantMinorBonusesWithoutEquippedMutations()
    {
        var plain = Cast([], []);
        var learned = Cast(["fire-molten-density", "fire-banked-embers", "fire-blast-shaping"], []);

        Assert.AreEqual(plain.Damage, learned.Damage, .000001);
        Assert.AreEqual(plain.SplashRadius, learned.SplashRadius, .000001);
    }

    [TestMethod]
    public void CrownOfAsh_SocketedDetonation_EnlargesRealExplosionButNotBaseFireballDamage()
    {
        var nodes = new[] { "fire-spread-crown" };
        var baseline = Fire(Create(nodes, [FireballMutationId.Detonation]));
        var empowered = Fire(Create(nodes, [FireballMutationId.Detonation],
            [new("fire-spread-crown", "FireBolt", "Detonation")]));

        Assert.AreEqual(baseline.SplashRadius * 1.20, empowered.SplashRadius, .000001);
        Assert.AreEqual(baseline.Damage, empowered.Damage, .000001);
    }

    [TestMethod]
    public void FurnaceAltar_SocketedScorchedEarth_ExtendsActualBurningGround()
    {
        var nodes = new[] { "fire-ember-altar" };
        var baseline = Ground(nodes, [FireballMutationId.ScorchedEarth]);
        var empowered = Ground(nodes, [FireballMutationId.ScorchedEarth],
            [new("fire-ember-altar", "FireBolt", "ScorchedEarth")]);

        Assert.AreEqual(baseline.RemainingSeconds * 1.25, empowered.RemainingSeconds, .000001);
        Assert.AreEqual(baseline.DamagePerTick, empowered.DamagePerTick, .000001);
        Assert.AreEqual(baseline.EffectiveRadius, empowered.EffectiveRadius, .000001);
    }

    [TestMethod]
    public void DetonationSocket_FireballAtMaximumRank_DoesNotAmplifyIndependentMasteryRadius()
    {
        ProjectileState AtMaximumRank(bool socketed)
        {
            var simulation = Create(["fire-spread-crown"], [FireballMutationId.Detonation],
                socketed ? [new MutationAmplifierAssignment("fire-spread-crown", "FireBolt", "Detonation")] : []);
            var build = Field<RunBuildState>(simulation, "build");
            var max = SpellCatalog.Get(SpellId.FireBolt).MaxRank;
            while (build.Spells[SpellId.FireBolt] < max)
                build.Spells.LearnOrUpgrade(SpellId.FireBolt);
            return Fire(simulation);
        }

        var baseline = AtMaximumRank(false);
        var empowered = AtMaximumRank(true);
        Assert.AreEqual(56d, baseline.SplashRadius, .000001);
        Assert.AreEqual(56d, empowered.SplashRadius, .000001,
            "A Detonation socket may not multiply Fireball mastery splash when mastery is larger.");
    }

    private static BurningGroundState Ground(string[] nodes, FireballMutationId[] mutations, MutationAmplifierAssignment[]? assignments = null)
    {
        var simulation = Create(nodes, mutations, assignments);
        var projectile = Fire(simulation);
        Invoke(simulation, "RegisterBurningGround", projectile, new Vector2D(80, 80));
        return Field<List<BurningGroundState>>(simulation, "burningGrounds").Single();
    }

    private static double GroundDuration(string[] nodes, FireballMutationId[] mutations) =>
        Ground(nodes, mutations).RemainingSeconds;

    private static ProjectileState Cast(string[] nodes, FireballMutationId[] mutations) => Fire(Create(nodes, mutations));

    private static RunSimulation Create(string[] nodes, FireballMutationId[] mutations, MutationAmplifierAssignment[]? assignments = null)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(nodes.ToHashSet(), new LevelChoiceService(random), random);
        Field<List<EnemyState>>(simulation, "enemies").Add(new EnemyState(1, new Vector2D(80, 80), 10, 1000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        simulation.PrepareFireballMutations(mutations);
        simulation.PrepareMutationAmplifiers(assignments ?? []);
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
