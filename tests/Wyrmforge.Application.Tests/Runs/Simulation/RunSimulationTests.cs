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
    public void Construction_WithWinterShell_StartsWithWardReady()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string> { "winter-shell" }, new LevelChoiceService(random), random);

        var snapshot = simulation.CreateSnapshot();

        Assert.IsTrue(snapshot.Player.Barrier);
    }

    [TestMethod]
    public void Tick_WithDetonationFourthHit_ExposesExplosionPulse()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string> { "detonation" }, new LevelChoiceService(random), random);
        StartFirstMapEncounter(simulation);
        SplashPulseRenderSnapshot? detonation = null;

        for (var tick = 0; tick < 120 && detonation is null; tick++)
        {
            var snapshot = simulation.Tick(0.05, default, 200, 200);
            detonation = snapshot.SplashPulses.FirstOrDefault(pulse => Math.Abs(pulse.Radius - 58) < 0.01);
        }

        Assert.IsNotNull(detonation);
        Assert.AreEqual(58d, detonation.Radius);
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

    [TestMethod]
    public void ApplyChoice_TrailReward_UpgradesWithoutSpendingXpOrInventingRunLevel()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        var applyReward = typeof(RunSimulation).GetMethod("ApplyRouteReward", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
        applyReward.Invoke(simulation, [new Wyrmforge.Application.Runs.Navigation.WyrmrealmRewardProfile(SpellSchool.Fire, 0)]);
        typeof(RunSimulation).GetMethod("TryLevelUp", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(simulation, null);
        Assert.AreEqual(SpellSchool.Fire, simulation.PendingRewardSchool);
        var choice = simulation.PendingChoices.Single(choice => choice.Role == LevelChoiceDraftRole.Converge);
        Assert.IsTrue(simulation.ApplyChoice(choice.Id));
        Assert.AreEqual(1, simulation.Level);
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().ExperienceEarned);
        Assert.AreEqual(0, simulation.CreateSnapshot().Hud.Experience);
        Assert.IsNull(simulation.PendingRewardSchool);
        Assert.IsFalse(simulation.ApplyChoice(choice.Id));
    }

    [TestMethod]
    public void ApplyRelicChoice_FullInventory_RequiresValidReplacementBeforeChangingAnything()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        simulation.OpenRewardCache();
        Assert.IsTrue(simulation.ApplyRelicChoice(simulation.PendingRelicChoices[0].Id));
        simulation.OpenRewardCache();
        Assert.IsTrue(simulation.ApplyRelicChoice(simulation.PendingRelicChoices[0].Id));
        simulation.OpenRewardCache();
        var next = simulation.PendingRelicChoices[0].Id;
        var previous = simulation.EquippedRelics[0].Id;
        Assert.IsFalse(simulation.ApplyRelicChoice(next));
        Assert.AreEqual(2, simulation.OwnedRelics.Count);
        Assert.IsTrue(simulation.PendingRelicChoices.Count > 0);
        Assert.IsTrue(simulation.ApplyRelicChoice(next, previous));
        Assert.IsTrue(simulation.EquippedRelics.Any(relic => relic.Id == next));
        Assert.IsFalse(simulation.EquippedRelics.Any(relic => relic.Id == previous));
        Assert.AreEqual(3, simulation.OwnedRelics.Count);
    }

    [TestMethod]
    public void CreateSummary_SpendingRunXp_StillReportsAllCollectedXpForHunterProgress()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 1204);
        typeof(RunSimulation).GetMethod("GainExperience", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(simulation, [35]);
        for (var count = 0; count < 10 && simulation.PendingChoices.Count > 0; count++)
        {
            var choice = simulation.PendingChoices.FirstOrDefault(choice => choice.Kind == LevelChoiceKind.Rune) ?? simulation.PendingChoices[0];
            Assert.IsTrue(simulation.ApplyChoice(choice.Id));
        }
        Assert.AreEqual(3, simulation.Level);
        Assert.AreEqual(10, simulation.CreateSnapshot().Hud.Experience);
        Assert.AreEqual(35, simulation.CreateEvaluationSummary().ExperienceEarned);
    }

    private static void StartFirstMapEncounter(RunSimulation simulation) => Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
}
