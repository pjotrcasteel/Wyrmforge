using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.RunUpgrades;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Nexus;

[TestClass]
public sealed class FireSynergyCombatTests
{
    private const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;

    [TestMethod]
    public void BurningKill_ActuallyDamagesNearbyTarget_Deterministically()
    {
        var first = Resolve(false, FireballMutationId.Detonation, false);
        var repeat = Resolve(false, FireballMutationId.Detonation, false);
        Assert.AreEqual(first.Health, repeat.Health);
        Assert.IsTrue(first.Health < 1000);
        Assert.IsTrue(first.Effects > 0);
        Assert.AreEqual(0, first.Fields);
    }

    [TestMethod]
    public void SharedEvolution_PreservesMutatorIdentityAndWebDuration()
    {
        var detonation = Resolve(true, FireballMutationId.Detonation, false);
        var needle = Resolve(true, FireballMutationId.CinderNeedle, false);
        var web = Resolve(true, FireballMutationId.ScorchedEarth, true);
        Assert.AreEqual(1, detonation.Fields);
        Assert.AreEqual(1, needle.Fields);
        Assert.IsTrue(detonation.Radius > needle.Radius);
        Assert.IsTrue(web.Duration > detonation.Duration);
        Assert.AreEqual(1, web.Rank);
    }

    private static (double Health, int Effects, int Fields, double Radius, double Duration, int Rank) Resolve(
        bool evolve, FireballMutationId mutation, bool web)
    {
        var nodes = web ? new HashSet<string> { "fire-start", "fire-1", "fire-2", "fire-cinder-thread", "fire-ember-memory",
            "fire-crucible", "fire-ember-covenant", "fire-long-pyre" } : new HashSet<string>();
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(nodes, seed: 5001,
            fireballLevel: 2, fireballMutations: [mutation]);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        var build = Get<RunBuildState>(simulation, "build");
        build.RunUpgrades.Apply(RunUpgradeId.CinderCascade);
        if (evolve) build.RunUpgrades.Apply(RunUpgradeId.SolarWake);
        Call(simulation, "RefreshBuildModifiers", false);
        var victim = new EnemyState(1, new(100, 100), 8, 1, 0);
        victim.Statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Burning), 4);
        var neighbor = new EnemyState(2, new(110, 100), 8, 1000, 0);
        Get<List<EnemyState>>(simulation, "enemies").AddRange([victim, neighbor]);
        Call(simulation, "RebuildCombatSpatialIndex");
        var projectile = new ProjectileState(new(100, 100), new(1, 0), 4, 100, SpellId.FireBolt, new(false, 0, 0, null, 0, 0));
        Call(simulation, "DamageTarget", victim, 100d, projectile, null);
        Call(simulation, "ResolvePendingSynergies");
        var fields = (System.Collections.IList)typeof(RunSimulation).GetField("burningGrounds", Private)!.GetValue(simulation)!;
        var field = fields.Count > 0 ? fields[0] : null;
        var radius = field is null ? 0 : (double)field.GetType().GetProperty("EffectiveRadius")!.GetValue(field)!;
        var duration = field is null ? 0 : (double)field.GetType().GetProperty("RemainingSeconds")!.GetValue(field)!;
        Assert.AreEqual(2, simulation.PreparedFireballLevel);
        CollectionAssert.AreEqual(new[] { mutation }, simulation.PreparedFireballMutations.ToArray());
        return (neighbor.Health, simulation.SynergyEffectsResolved, fields.Count, radius, duration, build.Spells[SpellId.FireBolt]);
    }

    private static T Get<T>(RunSimulation simulation, string name) => (T)typeof(RunSimulation).GetField(name, Private)!.GetValue(simulation)!;
    private static void Call(RunSimulation simulation, string name, params object?[] args) => typeof(RunSimulation).GetMethod(name, Private)!.Invoke(simulation, args);
}
