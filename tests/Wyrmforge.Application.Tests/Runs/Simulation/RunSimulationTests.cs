using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RunSimulationTests
{
    [TestMethod]
    public void Construction_StartsWithMapDecisionPending()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);

        Assert.IsTrue(simulation.PendingMapChoice);
        Assert.AreEqual(3, simulation.AvailableMapNodes.Count);
        Assert.AreEqual(0, simulation.CompletedMapNodes.Count);
    }

    [TestMethod]
    public void Tick_OnFirstFrame_CentersPlayerInArenaWhileMapIsOpen()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);

        var snapshot = simulation.Tick(0, default, 800, 600);

        Assert.AreEqual(400, snapshot.Player.X);
        Assert.AreEqual(300, snapshot.Player.Y);
        Assert.IsTrue(simulation.PendingMapChoice);
    }

    [TestMethod]
    public void Tick_WhenEnemyTakesDamage_ExposesCombatFeedback()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        StartFirstMapEncounter(simulation);
        EnemyRenderSnapshot? damagedEnemy = null;
        ElementalImpactRenderSnapshot? impact = null;

        for (var tick = 0; tick < 20 && damagedEnemy is null; tick++)
        {
            var snapshot = simulation.Tick(0.05, default, 200, 200);
            damagedEnemy = snapshot.Enemies.FirstOrDefault(enemy => enemy.HealthRatio < 1);
            if (damagedEnemy is not null) impact = snapshot.ElementalImpacts.FirstOrDefault();
        }

        Assert.IsNotNull(damagedEnemy);
        Assert.IsTrue(damagedEnemy.HitFlash);
        Assert.IsLessThan(1, damagedEnemy.HealthRatio);
        Assert.IsGreaterThan(0, damagedEnemy.HealthRatio);
        Assert.IsNotNull(impact);
        Assert.AreEqual(SpellId.ArcaneOrb, impact.Spell);
        Assert.IsTrue(impact.Progress >= 0 && impact.Progress <= 1);
    }

    [TestMethod]
    public void Tick_WhenEnemyDies_ExposesDeathBurst()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        StartFirstMapEncounter(simulation);
        DeathBurstRenderSnapshot? deathBurst = null;

        for (var tick = 0; tick < 400 && deathBurst is null; tick++)
        {
            var snapshot = simulation.Tick(0.05, default, 800, 600);
            deathBurst = snapshot.DeathBursts.FirstOrDefault();
        }

        Assert.IsNotNull(deathBurst);
        Assert.IsGreaterThan(0, deathBurst.Radius);
        Assert.IsGreaterThanOrEqualTo(1, deathBurst.Intensity);
        Assert.IsTrue(deathBurst.Progress >= 0 && deathBurst.Progress <= 1);
    }

    [TestMethod]
    public void Tick_WithWildfireHit_ExposesSplashPulse()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string> { "wildfire" }, new LevelChoiceService(random), random);
        StartFirstMapEncounter(simulation);
        SplashPulseRenderSnapshot? splashPulse = null;

        for (var tick = 0; tick < 20 && splashPulse is null; tick++)
        {
            var snapshot = simulation.Tick(0.05, default, 200, 200);
            splashPulse = snapshot.SplashPulses.FirstOrDefault();
        }

        Assert.IsNotNull(splashPulse);
        Assert.AreEqual(64d, splashPulse.Radius);
        Assert.IsTrue(splashPulse.Progress >= 0 && splashPulse.Progress <= 1);
    }

    [TestMethod]
    public void Tick_WithoutMapSelection_DoesNotStartHiddenTimedDragonEncounter()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        RunRenderSnapshot snapshot = simulation.CreateSnapshot();

        for (var tick = 0; tick < 610; tick++) snapshot = simulation.Tick(0.05, default, 6000, 6000);

        Assert.IsTrue(simulation.PendingMapChoice);
        Assert.IsNull(snapshot.Dragon);
        Assert.AreEqual(0, snapshot.Enemies.Count);
    }

    [TestMethod]
    public void ChooseMapNode_CombatNode_StartsEncounterInsteadOfDragon()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        StartFirstMapEncounter(simulation);
        RunRenderSnapshot snapshot = simulation.CreateSnapshot();

        for (var tick = 0; tick < 4; tick++) snapshot = simulation.Tick(0.05, default, 800, 600);

        Assert.IsFalse(simulation.PendingMapChoice);
        Assert.IsNull(snapshot.Dragon);
        Assert.IsGreaterThan(0, snapshot.Enemies.Count);
    }

    private static void StartFirstMapEncounter(RunSimulation simulation) => Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
}
