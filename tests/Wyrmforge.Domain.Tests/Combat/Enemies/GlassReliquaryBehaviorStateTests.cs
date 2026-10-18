using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class GlassReliquaryBehaviorStateTests
{
    [TestMethod]
    public void FirstRitual_RaisesAWard_ThenAPrison_ThenTheVeil()
    {
        var state = new GlassReliquaryBehaviorState();
        var events = Run(state, 30, canRaiseWard: true).Where(item => item is not (GlassReliquaryEvent.None or GlassReliquaryEvent.CastStarted)).Take(3)
            .ToArray();
        CollectionAssert.AreEqual(new[] { GlassReliquaryEvent.WardRaised, GlassReliquaryEvent.PrisonCast, GlassReliquaryEvent.VeilCast }, events);
        Assert.IsTrue(state.IsVeiled);
    }

    [TestMethod]
    public void WardRite_IsSkipped_AtTheCap_NeverWasted()
    {
        var state = new GlassReliquaryBehaviorState();
        var first = Run(state, 10, canRaiseWard: false).First(item => item is not (GlassReliquaryEvent.None or GlassReliquaryEvent.CastStarted));
        Assert.AreEqual(GlassReliquaryEvent.PrisonCast, first);
    }

    [TestMethod]
    public void Veil_FadesOnItsOwn_OrBreaksOnceIntoAnExposedStagger()
    {
        var faded = new GlassReliquaryBehaviorState();
        Run(faded, 30, true, stopWhen: s => s.IsVeiled);
        var sawFade = Run(faded, GlassReliquaryBehaviorState.VeilSeconds + 0.2, true).Contains(GlassReliquaryEvent.VeilFaded);
        Assert.IsTrue(sawFade);
        Assert.IsFalse(faded.IsVeiled);

        var broken = new GlassReliquaryBehaviorState();
        Run(broken, 30, true, stopWhen: s => s.IsVeiled);
        Assert.IsTrue(broken.BreakVeil());
        Assert.IsFalse(broken.BreakVeil(), "A broken veil cannot break twice.");
        Assert.IsTrue(broken.Exposed);
        Assert.AreEqual(ReliquaryPhase.Recover, broken.Phase);
        Assert.AreEqual(1, broken.VeilsBroken);
        Run(broken, GlassReliquaryBehaviorState.ExposedSeconds + 0.1, true, stopWhen: s => !s.Exposed);
        Assert.IsFalse(broken.Exposed);
    }

    [TestMethod]
    public void HalfHealth_ShattersOnce_DropsTheVeil_AndDeepensTheRitual()
    {
        var state = new GlassReliquaryBehaviorState();
        Run(state, 30, true, stopWhen: s => s.IsVeiled);
        Assert.AreEqual(2, state.FalseForms);
        Assert.AreEqual(GlassReliquaryEvent.ShatterStarted, state.Tick(0.05, 49, 100, true));
        Assert.IsFalse(state.IsVeiled);
        var events = new List<GlassReliquaryEvent>();
        for (var step = 0; step < 60; step++) events.Add(state.Tick(0.05, 49, 100, true));
        Assert.AreEqual(1, events.Count(item => item == GlassReliquaryEvent.ShatterCompleted));
        Assert.IsFalse(events.Contains(GlassReliquaryEvent.ShatterStarted));
        Assert.IsTrue(state.Shifted);
        Assert.AreEqual(3, state.FalseForms);
    }

    [TestMethod]
    public void HoldsALongCastingRange_AndNeverMovesWhileCasting()
    {
        var state = new GlassReliquaryBehaviorState();
        var (away, _) = state.Movement(new Vector2D(100, 0), Vector2D.Zero);
        Assert.IsGreaterThan(0d, away.X);
        var (toward, _) = state.Movement(new Vector2D(500, 0), Vector2D.Zero);
        Assert.IsLessThan(0d, toward.X);
        Run(state, 10, true, stopWhen: s => s.IsCasting);
        Assert.AreEqual(0d, state.Movement(new Vector2D(500, 0), Vector2D.Zero).SpeedMultiplier);
    }

    [TestMethod]
    public void RitualObjects_HaveNoBestiaryPage_TheReliquaryOfGlassDoes()
    {
        Assert.IsFalse(EnemyCatalog.Get(EnemyKind.CrystalWard).IsCreature);
        Assert.IsFalse(EnemyCatalog.Get(EnemyKind.GlassFalseForm).IsCreature);
        Assert.IsTrue(EnemyCatalog.Get(EnemyKind.ReliquaryOfGlass).IsCreature);
        Assert.IsTrue(BestiaryCatalog.HasEntry(EnemyKind.ReliquaryOfGlass));
        Assert.IsFalse(BestiaryCatalog.HasEntry(EnemyKind.CrystalWard));
        Assert.IsNotNull(new EnemyState(1, Vector2D.Zero, 27, 10, 10, EnemyKind.ReliquaryOfGlass).GlassReliquary);
        Assert.IsNotNull(new EnemyState(2, Vector2D.Zero, 27, 10, 10, EnemyKind.GlassFalseForm).FalseForm);
    }

    private static List<GlassReliquaryEvent> Run(GlassReliquaryBehaviorState state, double seconds, bool canRaiseWard,
        Func<GlassReliquaryBehaviorState, bool>? stopWhen = null)
    {
        var events = new List<GlassReliquaryEvent>();
        for (var time = 0d; time < seconds; time += 0.05)
        {
            events.Add(state.Tick(0.05, 100, 100, canRaiseWard));
            if (stopWhen?.Invoke(state) == true) break;
        }
        return events;
    }
}
