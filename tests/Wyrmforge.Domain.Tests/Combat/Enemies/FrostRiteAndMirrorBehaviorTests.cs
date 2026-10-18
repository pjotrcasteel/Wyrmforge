using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class FrostRiteAndMirrorBehaviorTests
{
    private static readonly Vector2D Far = new(300, 0);

    [TestMethod]
    public void Cantor_ChoosesVerseWhenCrowdedThenReknitThenHymn()
    {
        Assert.AreEqual(CantorVerse.StillnessVerse, FirstVerse(new Vector2D(100, 0), 3, new Vector2D(0, 50)));
        Assert.AreEqual(CantorVerse.Reknit, FirstVerse(Far, 3, new Vector2D(0, 50)));
        Assert.AreEqual(CantorVerse.RimeHymn, FirstVerse(Far, HoarfrostCantorBehaviorState.HymnMinimumAllies, null));
        Assert.IsNull(FirstVerse(Far, HoarfrostCantorBehaviorState.HymnMinimumAllies - 1, null), "A lone ally is not worth a hymn.");
        Assert.IsNull(FirstVerse(new Vector2D(100, 0), 0, null, mayCommit: false), "The verse is an attack and waits for the pressure budget.");

        static CantorVerse? FirstVerse(Vector2D hunter, int unarmored, Vector2D? husk, bool mayCommit = true)
        {
            var cantor = new HoarfrostCantorBehaviorState();
            for (var time = 0d; time < 4; time += 0.1)
                if (cantor.Tick(0.1, Vector2D.Zero, hunter, 100, 100, unarmored, husk, mayCommit) == CantorEvent.ChantStarted) return cantor.Verse;
            return null;
        }
    }

    [TestMethod]
    public void Cantor_ABurstOrAShoveSilencesTheChant()
    {
        var cantor = Chanting();
        Assert.AreEqual(CantorEvent.Interrupted, cantor.Tick(0.05, Vector2D.Zero, Far, 100 - 100 * HoarfrostCantorBehaviorState.InterruptHealthFraction,
            100, 2, null));
        Assert.AreEqual(CantorPhase.Silenced, cantor.Phase);

        var shoved = Chanting();
        Assert.IsTrue(shoved.Interrupt());
        Assert.AreEqual(CantorPhase.Silenced, shoved.Phase);
        Assert.IsFalse(shoved.Interrupt(), "Only a chant can be broken.");

        var finished = Chanting();
        var outcome = CantorEvent.None;
        for (var time = 0d; time < HoarfrostCantorBehaviorState.HymnSeconds + 0.1 && outcome == CantorEvent.None; time += 0.05)
            outcome = finished.Tick(0.05, Vector2D.Zero, Far, 100 - 5, 100, 2, null);
        Assert.AreEqual(CantorEvent.HymnCompleted, outcome, "Chip damage does not break the chant.");

        static HoarfrostCantorBehaviorState Chanting()
        {
            var cantor = new HoarfrostCantorBehaviorState();
            while (cantor.Tick(0.1, Vector2D.Zero, Far, 100, 100, 2, null) != CantorEvent.ChantStarted) { }
            return cantor;
        }
    }

    [TestMethod]
    public void Cantor_ReknitsAreBounded()
    {
        var cantor = new HoarfrostCantorBehaviorState();
        var reknits = 0;
        for (var time = 0d; time < 30; time += 0.1)
            if (cantor.Tick(0.1, Vector2D.Zero, Far, 100, 100, 0, new Vector2D(0, 40)) == CantorEvent.ReknitCompleted) reknits++;
        Assert.AreEqual(HoarfrostCantorBehaviorState.ReknitsPerCantor, reknits);
    }

    [TestMethod]
    public void Wisp_IsVeiledUntilItCommitsThenExposed()
    {
        var wisp = new MirrorWispBehaviorState();
        var hunter = new Vector2D(200, 0);
        Assert.AreEqual(MirrorWispBehaviorState.VeiledMultiplier, wisp.DamageMultiplier);
        while (wisp.Tick(0.05, Vector2D.Zero, hunter, null) != WispEvent.ShimmerStarted) { }
        Assert.AreEqual(MirrorWispBehaviorState.StepDistance, Vector2D.Distance(wisp.Destination, hunter), 0.001, "It steps out beside the hunter.");
        Assert.AreEqual(MirrorWispBehaviorState.VeiledMultiplier, wisp.DamageMultiplier);
        while (wisp.Tick(0.05, Vector2D.Zero, hunter, null) != WispEvent.Stepped) { }
        Assert.AreEqual(1, wisp.DamageMultiplier, "Drawing back for the cut, it is solid.");
        while (wisp.Tick(0.05, wisp.Destination, hunter, null) != WispEvent.CutReleased) { }
        Assert.AreEqual(MirrorWispBehaviorState.ExposedMultiplier, wisp.DamageMultiplier);
        for (var time = 0d; time < MirrorWispBehaviorState.CutSeconds + MirrorWispBehaviorState.ExposedSeconds + 0.1; time += 0.05)
            wisp.Tick(0.05, wisp.Destination, hunter, null);
        Assert.AreEqual(WispPhase.Drift, wisp.Phase);
    }

    [TestMethod]
    public void Wisp_StepsOntoAMirrorAndCutsOnlyItsArc()
    {
        var wisp = new MirrorWispBehaviorState();
        var hunter = new Vector2D(200, 0);
        var mirror = new Vector2D(200, 120);
        while (wisp.Tick(0.05, Vector2D.Zero, hunter, mirror) != WispEvent.ShimmerStarted) { }
        Assert.AreEqual(mirror, wisp.Destination, "Black ice is a mirror it steps through.");
        while (wisp.Tick(0.05, Vector2D.Zero, hunter, mirror) != WispEvent.Stepped) { }
        Assert.AreEqual(new Vector2D(0, -1), wisp.CutDirection);
        var at = wisp.Destination;
        Assert.IsTrue(wisp.CutHits(at, at + new Vector2D(0, -60), 10));
        Assert.IsFalse(wisp.CutHits(at, at + new Vector2D(0, 60), 10), "Behind the cut is safe.");
        Assert.IsFalse(wisp.CutHits(at, at + new Vector2D(0, -MirrorWispBehaviorState.CutRange - 20), 10), "Beyond its reach is safe.");
    }
}
