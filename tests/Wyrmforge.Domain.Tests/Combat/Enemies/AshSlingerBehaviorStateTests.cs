using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class AshSlingerBehaviorStateTests
{
    private static readonly Vector2D Hunter = new(250, 0);

    [TestMethod]
    public void Tick_LocksTheLandingSpotAtWindupAndReleasesAfterTheTelegraph()
    {
        var state = new AshSlingerBehaviorState();
        Assert.AreEqual(AshSlingerEvent.WindupStarted, state.Tick(AshSlingerBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Hunter, 40, 40));
        Assert.IsTrue(state.IsCommitted);
        Assert.AreEqual(AshSlingerEvent.None, state.Tick(0.6, Vector2D.Zero, new Vector2D(0, 250), 40, 40));
        Assert.AreEqual(AshSlingerEvent.Released, state.Tick(0.06, Vector2D.Zero, new Vector2D(0, 250), 40, 40));
        Assert.AreEqual(Hunter, state.Target, "The ember lands where it was marked, not where the hunter went.");
        Assert.AreEqual(AshSlingerPhase.Recover, state.Phase);
    }

    [TestMethod]
    public void Tick_DeniedOrOutOfRange_DoesNotSwing()
    {
        var state = new AshSlingerBehaviorState();
        Assert.AreEqual(AshSlingerEvent.None, state.Tick(5, Vector2D.Zero, Hunter, 40, 40, mayCommit: false));
        Assert.AreEqual(AshSlingerEvent.None, state.Tick(0.1, Vector2D.Zero, new Vector2D(AshSlingerBehaviorState.ThrowRange + 1, 0), 40, 40));
        Assert.AreEqual(AshSlingerEvent.WindupStarted, state.Tick(0.1, Vector2D.Zero, Hunter, 40, 40));
    }

    [TestMethod]
    public void Tick_BurstDamageDuringTheSwing_InterruptsIt()
    {
        var state = new AshSlingerBehaviorState();
        state.Tick(AshSlingerBehaviorState.InitialCooldownSeconds, Vector2D.Zero, Hunter, 40, 40);
        Assert.AreEqual(AshSlingerEvent.None, state.Tick(0.1, Vector2D.Zero, Hunter, 35, 40), "Chip damage does not interrupt.");
        Assert.AreEqual(AshSlingerEvent.Interrupted, state.Tick(0.1, Vector2D.Zero, Hunter, 27, 40));
        Assert.AreEqual(AshSlingerPhase.Recover, state.Phase);
        Assert.IsFalse(state.IsCommitted);
    }

    [TestMethod]
    public void Movement_KeepsTheBackLine()
    {
        var state = new AshSlingerBehaviorState(1);
        var (away, _) = state.Movement(new Vector2D(100, 0), Vector2D.Zero);
        Assert.IsGreaterThan(0d, away.X, "Too close: back-pedal.");
        var (closer, _) = state.Movement(new Vector2D(AshSlingerBehaviorState.MaximumRange + 50, 0), Vector2D.Zero);
        Assert.IsLessThan(0d, closer.X, "Too far: close in.");
        var (strafe, multiplier) = state.Movement(new Vector2D(250, 0), Vector2D.Zero);
        Assert.AreEqual(0, strafe.X, 0.001, "In range: strafe sideways, never advance.");
        Assert.IsLessThan(1d, multiplier);
    }
}
