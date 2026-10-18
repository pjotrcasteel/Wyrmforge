using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Telemetry;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Telemetry;

[TestClass]
public sealed class FrostTelemetryTests
{
    [TestMethod]
    public void DraftLedger_CountsEveryOfferedCardAndTheRound()
    {
        var simulation = AtFirstDraft(seed: 1204);
        var draft = simulation.DraftTelemetry;

        Assert.AreEqual(1, draft.Rounds);
        Assert.AreEqual(0, draft.Rerolls);
        var expected = simulation.PendingChoices.Sum(choice => Math.Max(1, ChoiceSchools.Of(choice).Count));
        Assert.AreEqual(expected, draft.Schools.Sum(tally => tally.Offered));
        Assert.AreEqual(0, draft.Schools.Sum(tally => tally.Selected));
    }

    [TestMethod]
    public void DraftLedger_RerollCountsAwayAndInAndTheReplacementAsOffered()
    {
        var simulation = AtFirstDraft(seed: 1204);
        var offeredBefore = simulation.DraftTelemetry.Schools.Sum(tally => tally.Offered);
        var replaced = simulation.PendingChoices[1];

        Assert.IsTrue(simulation.RerollChoice(1));

        var draft = simulation.DraftTelemetry;
        var replacement = simulation.PendingChoices[1];
        Assert.AreEqual(1, draft.Rerolls);
        Assert.AreEqual(Math.Max(1, ChoiceSchools.Of(replaced).Count), draft.Schools.Sum(tally => tally.RerolledAway));
        Assert.AreEqual(Math.Max(1, ChoiceSchools.Of(replacement).Count), draft.Schools.Sum(tally => tally.RerolledIn));
        Assert.AreEqual(offeredBefore + Math.Max(1, ChoiceSchools.Of(replacement).Count), draft.Schools.Sum(tally => tally.Offered));
    }

    [TestMethod]
    public void DraftLedger_SelectionIsCountedAndReachesTheSummary()
    {
        var simulation = AtFirstDraft(seed: 1204);
        var picked = simulation.PendingChoices[0];

        Assert.IsTrue(simulation.ApplyChoice(picked.Id));

        var summary = simulation.CreateEvaluationSummary();
        Assert.AreEqual(Math.Max(1, ChoiceSchools.Of(picked).Count), summary.Draft.Schools.Sum(tally => tally.Selected));
        Assert.IsTrue(summary.Draft.Rounds >= 2, "35 experience opens a second round straight after the pick.");
    }

    [TestMethod]
    public void ChoiceSchools_AttributesSpellsRunesAndRefinements()
    {
        Assert.AreEqual(SpellSchool.Frost, ChoiceSchools.Of(Choice("spell:FrostShard", LevelChoiceKind.NewSpell)).Single());
        Assert.AreEqual(SpellSchool.Frost, ChoiceSchools.Of(Choice("rune:FrostTouch", LevelChoiceKind.Rune)).Single());
        Assert.AreEqual(SpellSchool.Storm, ChoiceSchools.Of(Choice("rune:ChainSpark", LevelChoiceKind.Rune)).Single());
        Assert.AreEqual(0, ChoiceSchools.Of(Choice("refine:Anything", LevelChoiceKind.Refinement)).Count);
    }

    [TestMethod]
    public void ControlLedger_FrozenCountsFully_ChillByItsSlow_ThreatsSplitByDistance()
    {
        var ledger = new ControlLedger();
        ledger.ObserveEnemy(1, timeScale: 0, distanceToHunter: 50, eliteOrUnique: true);
        ledger.ObserveEnemy(1, timeScale: 0.75, distanceToHunter: 400, eliteOrUnique: false);
        ledger.ObserveEnemy(1, timeScale: 1, distanceToHunter: 100, eliteOrUnique: false);
        ledger.ObserveWyrm(2, timeScale: 0.45);
        ledger.Kill(controlled: true);
        ledger.Kill(controlled: false);

        var control = ledger.Snapshot();
        Assert.AreEqual(3, control.EnemySecondsPresent, 1e-9);
        Assert.AreEqual(1.25, control.EnemySecondsDenied, 1e-9);
        Assert.AreEqual(2, control.ThreatSecondsPresent, 1e-9);
        Assert.AreEqual(0.5, control.ThreatShare, 1e-9);
        Assert.AreEqual(1, control.EliteShare, 1e-9);
        Assert.AreEqual(0.55, control.WyrmShare, 1e-9);
        Assert.AreEqual(0.5, control.ControlledKillShare, 1e-9);
    }

    [TestMethod]
    public void ControlLedger_AFrozenThreatIsDeniedInsideTheSimulation()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        var player = Field<PlayerState>(simulation, "player");
        var enemies = Field<List<EnemyState>>(simulation, "enemies");
        enemies.Clear();
        var frozen = new EnemyState(600, player.Position + new Vector2D(80, 0), 12, 40, 70, EnemyKind.Ashling);
        frozen.Statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 5);
        enemies.Add(frozen);
        enemies.Add(new EnemyState(600, player.Position + new Vector2D(0, 300), 12, 40, 70, EnemyKind.Ashling));
        var before = simulation.ControlTelemetry;

        for (var frame = 0; frame < 10; frame++)
            typeof(RunSimulation).GetMethod("UpdateEnemies", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, [0.1]);

        var control = simulation.ControlTelemetry;
        Assert.AreEqual(2, control.EnemySecondsPresent - before.EnemySecondsPresent, 1e-6);
        Assert.AreEqual(1, control.EnemySecondsDenied - before.EnemySecondsDenied, 1e-6, "Only the frozen Ashling was denied.");
        Assert.AreEqual(1, control.ThreatSecondsDenied - before.ThreatSecondsDenied, 1e-6, "It stood inside the threat radius.");
    }

    [TestMethod]
    public void ControlLedger_TheLevelUpPulseIsNeverCreditedToTheBuild()
    {
        var ledger = new ControlLedger();
        ledger.BeginPulse(0.85);
        ledger.Advance(0.5);
        ledger.ObserveEnemy(0.5, timeScale: 0, distanceToHunter: 50, eliteOrUnique: false);
        ledger.ObserveWyrm(0.5, timeScale: 0.45);
        ledger.Kill(controlled: true);
        ledger.Advance(0.5);
        ledger.ObserveEnemy(0.5, timeScale: 0, distanceToHunter: 50, eliteOrUnique: false);

        var control = ledger.Snapshot();
        Assert.AreEqual(0.5 + 0.275, control.PulseSecondsDenied, 1e-9);
        Assert.AreEqual(0.5, control.EnemySecondsDenied, 1e-9, "Only the freeze after the pulse window counts.");
        Assert.AreEqual(0, control.WyrmSecondsDenied, 1e-9);
        Assert.AreEqual(0, control.KillsWhileControlled);
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static LevelChoice Choice(string id, LevelChoiceKind kind) => new(id, kind, id, string.Empty, string.Empty, 0, 1);

    private static RunSimulation AtFirstDraft(int seed)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: seed);
        typeof(RunSimulation).GetMethod("GainExperience", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.Invoke(simulation, [35]);
        Assert.AreEqual(3, simulation.PendingChoices.Count);
        return simulation;
    }
}