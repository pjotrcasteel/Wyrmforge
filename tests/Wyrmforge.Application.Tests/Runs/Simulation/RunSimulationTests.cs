using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RunSimulationTests
{
    [TestMethod]
    public void Tick_OnFirstFrame_CentersPlayerInArena()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);

        var snapshot = simulation.Tick(0, default, 800, 600);

        Assert.AreEqual(400, snapshot.Player.X);
        Assert.AreEqual(300, snapshot.Player.Y);
    }

    [TestMethod]
    public void Tick_WhenEnemyTakesDamage_ExposesCombatFeedback()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
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
        Assert.AreEqual("ArcaneOrb", impact.Kind);
        Assert.IsTrue(impact.Progress >= 0 && impact.Progress <= 1);
    }

    [TestMethod]
    public void Tick_WhenEnemyDies_ExposesDeathBurst()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        DeathBurstRenderSnapshot? deathBurst = null;

        for (var tick = 0; tick < 80 && deathBurst is null; tick++)
        {
            var snapshot = simulation.Tick(0.05, default, 200, 200);
            deathBurst = snapshot.DeathBursts.FirstOrDefault();
        }

        Assert.IsNotNull(deathBurst);
        Assert.IsGreaterThan(0, deathBurst.Radius);
        Assert.IsTrue(deathBurst.Progress >= 0 && deathBurst.Progress <= 1);
    }

    [TestMethod]
    public void Tick_WithWildfireHit_ExposesSplashPulse()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string> { "wildfire" }, new LevelChoiceService(random), random);
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
    public void Tick_AfterThirtySeconds_StartsAshfangEncounter()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        RunRenderSnapshot snapshot = simulation.CreateSnapshot();

        for (var tick = 0; tick < 610; tick++)
        {
            snapshot = simulation.Tick(0.05, default, 6000, 6000);
            while (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        }

        Assert.IsFalse(snapshot.Ended);
        Assert.IsNotNull(snapshot.Dragon);
        Assert.AreEqual("Ashfang", snapshot.Dragon.Name);
        Assert.AreEqual("Cinder Wyrm", snapshot.Dragon.Title);
        Assert.AreEqual(1100d, snapshot.Dragon.MaxHealth);
        Assert.AreEqual(0, snapshot.Enemies.Count);
    }
}
