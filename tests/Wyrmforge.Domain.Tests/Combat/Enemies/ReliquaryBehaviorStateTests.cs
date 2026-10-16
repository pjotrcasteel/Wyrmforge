using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class ReliquaryBehaviorStateTests
{
    private static readonly Vector2D Hunter = new(100, 0);

    [TestMethod]
    public void FirstRitual_RunsWardCorruptionSealCorruption_WithRecoveryBetween()
    {
        var state = new ReliquaryBehaviorState();
        var rites = Run(state, 4, canPlantWard: true);
        CollectionAssert.AreEqual(new[] { ReliquaryRite.Ward, ReliquaryRite.Corruption, ReliquaryRite.Seal, ReliquaryRite.Corruption }, rites);
    }

    [TestMethod]
    public void WardRite_IsSkipped_WhenNoWardCanBePlanted()
    {
        var state = new ReliquaryBehaviorState();
        var rites = Run(state, 2, canPlantWard: false);
        CollectionAssert.AreEqual(new[] { ReliquaryRite.Corruption, ReliquaryRite.Seal }, rites);
    }

    [TestMethod]
    public void CastPoint_IsLockedWhenTheRiteBegins()
    {
        var state = new ReliquaryBehaviorState();
        Assert.AreEqual(ReliquaryEvent.None, state.Tick(0.1, 100, 100, Hunter, false));
        while (state.Tick(0.05, 100, 100, Hunter, false) != ReliquaryEvent.CastStarted) { }
        state.Tick(0.05, 100, 100, new Vector2D(-400, 300), false);
        Assert.AreEqual(Hunter, state.CastPoint, "Moving after the mark appears always escapes it.");
        Assert.IsTrue(state.IsCasting);
        Assert.IsGreaterThan(0d, state.CastProgress);
    }

    [TestMethod]
    public void HalfHealth_CancelsTheCast_AndShiftsOnce_IntoTheDenserRitual()
    {
        var state = new ReliquaryBehaviorState();
        while (state.Tick(0.05, 100, 100, Hunter, true) != ReliquaryEvent.CastStarted) { }
        Assert.AreEqual(ReliquaryEvent.ShiftStarted, state.Tick(0.05, 50, 100, Hunter, true));
        Assert.AreEqual(ReliquaryPhase.Shift, state.Phase);
        var events = new List<ReliquaryEvent>();
        for (var time = 0d; time < ReliquaryBehaviorState.ShiftSeconds + 0.1; time += 0.05) events.Add(state.Tick(0.05, 50, 100, Hunter, true));
        Assert.DoesNotContain(ReliquaryEvent.WardPlanted, events, "Nothing half-cast lands during the shift.");
        Assert.Contains(ReliquaryEvent.ShiftCompleted, events);
        Assert.IsTrue(state.Shifted);
        Assert.AreEqual(1d, state.ShiftProgress);
        var rites = Run(state, 5, canPlantWard: true, health: 40);
        CollectionAssert.AreEqual(new[] { ReliquaryRite.Ward, ReliquaryRite.Seal, ReliquaryRite.Corruption, ReliquaryRite.Seal, ReliquaryRite.Corruption }, rites);
    }

    [TestMethod]
    public void HoldsCastingDistance_OnlyWhileAdvancing()
    {
        var state = new ReliquaryBehaviorState();
        var (away, _) = state.Movement(new Vector2D(50, 0), Hunter);
        Assert.IsLessThan(0d, away.X, "Too close: it backs off.");
        var (toward, _) = state.Movement(new Vector2D(-400, 0), Hunter);
        Assert.IsGreaterThan(0d, toward.X, "Too far: it closes in.");
        Assert.AreEqual(Vector2D.Zero, state.Movement(new Vector2D(-150, 0), Hunter).Direction);
    }

    [TestMethod]
    public void WardFuse_BurstsExactlyOnce_AfterAVisibleWarning()
    {
        var ward = new ReliquaryWardState();
        Assert.IsFalse(ward.Warning);
        var bursts = 0;
        var warned = false;
        for (var time = 0d; time < ReliquaryWardState.FuseSeconds + 2; time += 0.05)
        {
            warned |= ward.Warning;
            if (ward.Tick(0.05)) bursts++;
        }
        Assert.IsTrue(warned);
        Assert.AreEqual(1, bursts);
    }

    [TestMethod]
    public void Bestiary_RevealsAUniqueOnOneKill_AndNeverRecordsWards()
    {
        var bestiary = new BestiaryState();
        bestiary.Record([(EnemyKind.Reliquary, 1), (EnemyKind.ReliquaryWard, 4)], []);
        Assert.IsTrue(bestiary.HunterNoteRevealed(EnemyKind.Reliquary));
        Assert.IsTrue(bestiary.Studied(EnemyKind.Reliquary));
        Assert.IsFalse(bestiary.Encountered(EnemyKind.ReliquaryWard));
        Assert.AreEqual(1, BestiaryState.HunterNoteKillsFor(EnemyKind.Reliquary));
        Assert.IsNull(EliteAffixCatalog.TryFor(EnemyKind.Reliquary));
    }

    private static List<ReliquaryRite> Run(ReliquaryBehaviorState state, int count, bool canPlantWard, double health = 100)
    {
        var rites = new List<ReliquaryRite>();
        for (var time = 0d; time < 120 && rites.Count < count; time += 0.05)
        {
            if (state.Tick(0.05, health, 100, Hunter, canPlantWard) == ReliquaryEvent.CastStarted) rites.Add(state.Rite);
        }
        return rites;
    }
}
