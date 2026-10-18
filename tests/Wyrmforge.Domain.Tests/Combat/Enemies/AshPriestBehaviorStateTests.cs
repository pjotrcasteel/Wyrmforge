using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class AshPriestBehaviorStateTests
{
    private static readonly (int, Vector2D) Wounded = (7, new Vector2D(80, 0));

    [TestMethod]
    public void Tick_HealsTheAllyLockedAtCastStartAfterTheVisibleCast()
    {
        var priest = new AshPriestBehaviorState();
        Assert.AreEqual(AshPriestEvent.HealStarted, priest.Tick(AshPriestBehaviorState.InitialCooldownSeconds, 40, 40, Wounded, null));
        Assert.AreEqual(7, priest.HealTargetId);
        Assert.IsTrue(priest.IsCasting);
        Assert.AreEqual(AshPriestEvent.None, priest.Tick(0.5, 40, 40, (9, Vector2D.Zero), null), "The lock survives a new wounded candidate.");
        Assert.AreEqual(7, priest.HealTargetId);
        Assert.AreEqual(AshPriestEvent.HealCompleted, priest.Tick(0.45, 40, 40, null, null));
        Assert.AreEqual(AshPriestPhase.Recover, priest.Phase);
    }

    [TestMethod]
    [DataRow(0)]
    [DataRow(1)]
    [DataRow(2)]
    [DataRow(3)]
    [DataRow(4)]
    public void NextHealCooldown_StaysWithinTheBriefWindow(int seed)
    {
        var priest = new AshPriestBehaviorState(seed);
        for (var cast = 0; cast < 6; cast++)
        {
            Assert.IsGreaterThanOrEqualTo(9d, priest.NextHealCooldown);
            Assert.IsLessThanOrEqualTo(13d, priest.NextHealCooldown);
            priest.Tick(20, 40, 40, Wounded, null);
            priest.Tick(1, 40, 40, null, null);
            priest.Tick(1, 40, 40, null, null);
        }
        Assert.AreEqual(6, priest.CastsCompleted);
    }

    [TestMethod]
    public void Tick_BurstDamageDuringTheCastInterruptsIt()
    {
        var priest = new AshPriestBehaviorState();
        priest.Tick(AshPriestBehaviorState.InitialCooldownSeconds, 40, 40, Wounded, null);
        Assert.AreEqual(AshPriestEvent.None, priest.Tick(0.1, 35, 40, null, null), "Chip damage does not break the cast.");
        Assert.AreEqual(AshPriestEvent.Interrupted, priest.Tick(0.1, 32, 40, null, null));
        Assert.AreEqual(AshPriestPhase.Recover, priest.Phase);
        Assert.AreEqual(0, priest.CastsCompleted);
        Assert.IsLessThanOrEqualTo(6.5, priest.HealCooldownRemaining, "An interrupted heal returns on a shortened cooldown.");
    }

    [TestMethod]
    public void Tick_PrefersRaisingTheFallenOverHealing()
    {
        var priest = new AshPriestBehaviorState();
        var remains = new Vector2D(60, 30);
        Assert.AreEqual(AshPriestEvent.ReviveStarted, priest.Tick(AshPriestBehaviorState.InitialCooldownSeconds, 40, 40, Wounded, remains));
        Assert.AreEqual(remains, priest.CastPoint);
        Assert.AreEqual(AshPriestEvent.None, priest.Tick(1.4, 40, 40, null, null));
        Assert.AreEqual(AshPriestEvent.ReviveCompleted, priest.Tick(0.11, 40, 40, null, null));
    }

    [TestMethod]
    public void Movement_KeepsTheBackLine()
    {
        var priest = new AshPriestBehaviorState();
        var (away, _) = priest.Movement(Vector2D.Zero, new Vector2D(100, 0), null);
        Assert.IsLessThan(0d, away.X, "Too close: retreat from the hunter.");
        var (toward, _) = priest.Movement(Vector2D.Zero, new Vector2D(500, 0), null);
        Assert.IsGreaterThan(0d, toward.X, "Too far: close in to stay relevant.");
        priest.Tick(AshPriestBehaviorState.InitialCooldownSeconds, 40, 40, Wounded, null);
        Assert.AreEqual(0d, priest.Movement(Vector2D.Zero, new Vector2D(100, 0), null).SpeedMultiplier, "Casting roots the priest.");
    }
}
