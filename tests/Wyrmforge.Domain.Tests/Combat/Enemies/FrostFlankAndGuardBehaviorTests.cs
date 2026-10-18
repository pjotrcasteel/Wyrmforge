using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class FrostFlankAndGuardBehaviorTests
{
    [TestMethod]
    public void Whitefang_FeintsBehindAMovingHunterThenLocksItsPounceLane()
    {
        var stalker = new WhitefangStalkerBehaviorState(1);
        var hunter = new Vector2D(0, 0);
        var heading = new Vector2D(1, 0);
        var position = new Vector2D(0, -200);
        var events = new List<WhitefangEvent>();
        for (var time = 0d; time < 3 && stalker.Phase == WhitefangPhase.Prowl; time += 0.05)
            events.Add(stalker.Tick(0.05, position, hunter, heading));
        CollectionAssert.Contains(events, WhitefangEvent.FeintStarted);
        Assert.AreEqual(WhitefangPhase.Feint, stalker.Phase);
        Assert.IsLessThan(0d, stalker.FeintTarget.X, "The feint lands behind the hunter's heading.");
        Assert.AreEqual(WhitefangStalkerBehaviorState.FlankDistance, Vector2D.Distance(hunter, stalker.FeintTarget), 1e-6);

        Assert.AreEqual(WhitefangEvent.WindupStarted, stalker.Tick(WhitefangStalkerBehaviorState.FeintSeconds, stalker.FeintTarget, hunter, heading));
        Assert.AreEqual(WhitefangPhase.Windup, stalker.Phase);
        var lane = stalker.PounceDirection;
        stalker.Tick(0.2, stalker.FeintTarget, new Vector2D(40, 40), heading);
        Assert.AreEqual(lane, stalker.PounceDirection, "The lane is locked: stepping off it during the crouch dodges the leap.");
        Assert.IsTrue(stalker.IsCommitted);
    }

    [TestMethod]
    public void Whitefang_StandingHunterIsCircledAQuarterTurnAndPouncesRecoverLong()
    {
        var stalker = new WhitefangStalkerBehaviorState(-1);
        var flank = stalker.FlankPoint(new Vector2D(100, 0), Vector2D.Zero, Vector2D.Zero);
        Assert.AreEqual(0, flank.X, 1e-6);
        Assert.AreEqual(WhitefangStalkerBehaviorState.FlankDistance, Math.Abs(flank.Y), 1e-6);

        while (stalker.Phase != WhitefangPhase.Pounce) stalker.Tick(0.05, new Vector2D(100, 0), Vector2D.Zero, Vector2D.Zero);
        stalker.Land();
        Assert.IsTrue(stalker.PounceLanded);
        Assert.AreEqual(WhitefangPhase.Recover, stalker.Phase);
        Assert.IsGreaterThan(WhitefangStalkerBehaviorState.WindupSeconds, WhitefangStalkerBehaviorState.RecoverSeconds, "The punish window outlasts the tell.");
        Assert.AreEqual(2, WhitefangStalkerBehaviorState.TendonChill, "Tendon Chill bites deeper than a Packling.");
    }

    [TestMethod]
    public void CairnSentinel_BraceSoaksOnlyFrontalHitsThenStampsAndIsExposed()
    {
        var sentinel = new CairnSentinelBehaviorState();
        var position = Vector2D.Zero;
        var hunter = new Vector2D(120, 0);
        Assert.AreEqual(1, sentinel.DamageMultiplier(position, hunter), "Marching, it takes hits normally.");
        var started = false;
        for (var time = 0d; time < 3 && !started; time += 0.05) started = sentinel.Tick(0.05, position, hunter) == CairnEvent.BraceStarted;
        Assert.IsTrue(started);
        Assert.IsTrue(sentinel.IsBraced);
        Assert.AreEqual(CairnSentinelBehaviorState.BracedFrontMultiplier, sentinel.DamageMultiplier(position, hunter));
        Assert.AreEqual(1, sentinel.DamageMultiplier(position, new Vector2D(0, 120)), "Flank hits land in full.");
        Assert.AreEqual(1, sentinel.DamageMultiplier(position, new Vector2D(-120, 0)), "Rear hits land in full.");

        sentinel.Tick(CairnSentinelBehaviorState.BraceSeconds * 0.5, position, new Vector2D(0, 120));
        Assert.AreEqual(CairnSentinelBehaviorState.BracedFrontMultiplier, sentinel.DamageMultiplier(position, hunter), "The shield's facing is locked when it plants.");

        Assert.AreEqual(CairnEvent.Stamped, sentinel.Tick(CairnSentinelBehaviorState.BraceSeconds, position, hunter));
        Assert.IsFalse(sentinel.IsBraced);
        Assert.AreEqual(CairnSentinelBehaviorState.ExposedMultiplier, sentinel.DamageMultiplier(position, hunter));
        sentinel.Tick(CairnSentinelBehaviorState.RecoverSeconds, position, hunter);
        Assert.AreEqual(CairnPhase.March, sentinel.Phase);
    }

    [TestMethod]
    public void CairnSentinel_HoldsAShortDistanceInsteadOfGrinding()
    {
        var sentinel = new CairnSentinelBehaviorState();
        Assert.AreEqual(1, sentinel.MarchMultiplier(Vector2D.Zero, new Vector2D(300, 0)));
        Assert.AreEqual(0, sentinel.MarchMultiplier(Vector2D.Zero, new Vector2D(CairnSentinelBehaviorState.HoldDistance - 1, 0)));
    }

    [TestMethod]
    public void FlankAndGuardKinds_AreFrostHabitatOnlyAndInTheBestiary()
    {
        foreach (var kind in new[] { EnemyKind.WhitefangStalker, EnemyKind.CairnSentinel })
        {
            var definition = EnemyCatalog.Get(kind);
            Assert.AreEqual(EnemyRealm.Frost, definition.Realm);
            Assert.IsTrue(definition.HabitatOnly);
            Assert.IsTrue(BestiaryCatalog.HasEntry(kind));
        }
        Assert.IsNotNull(new EnemyState(1, Vector2D.Zero, 13, 10, 1, EnemyKind.WhitefangStalker).Whitefang);
        Assert.IsNotNull(new EnemyState(2, Vector2D.Zero, 20, 10, 1, EnemyKind.CairnSentinel).Sentinel);
    }
}
