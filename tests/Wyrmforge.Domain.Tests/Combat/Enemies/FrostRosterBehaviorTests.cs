using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Progression.Bestiary;

namespace Wyrmforge.Domain.Tests.Combat.Enemies;

[TestClass]
public sealed class FrostRosterBehaviorTests
{
    [TestMethod]
    public void Chill_StacksToACapHoldsThenThawsOneStackAtATime()
    {
        var chill = new HunterChillState();
        for (var index = 0; index < 8; index++)
        {
            chill.Apply();
            chill.Tick(HunterChillState.ApplyGateSeconds);
        }
        Assert.AreEqual(HunterChillState.MaxStacks, chill.Stacks);
        Assert.AreEqual(1 - HunterChillState.MaxStacks * HunterChillState.SlowPerStack, chill.SpeedMultiplier, 1e-9);
        Assert.IsGreaterThan(0d, chill.SpeedMultiplier, "Chill never becomes a full freeze.");

        chill.Tick(HunterChillState.HoldSeconds - 0.01);
        Assert.AreEqual(HunterChillState.MaxStacks, chill.Stacks, "Held while the cold is fresh.");
        chill.Tick(0.01 + HunterChillState.ThawSecondsPerStack);
        Assert.AreEqual(HunterChillState.MaxStacks - 1, chill.Stacks);
        chill.Tick(HunterChillState.ThawSecondsPerStack * HunterChillState.MaxStacks);
        Assert.AreEqual(0, chill.Stacks);
        Assert.AreEqual(1d, chill.SpeedMultiplier);
    }

    [TestMethod]
    public void Chill_GateStopsACrowdStackingItInOneFrame()
    {
        var chill = new HunterChillState();
        Assert.IsTrue(chill.Apply());
        Assert.IsFalse(chill.Apply());
        Assert.IsFalse(chill.Apply());
        Assert.AreEqual(1, chill.Stacks);
    }

    [TestMethod]
    public void Packlings_HoldDistinctSlotsAroundTheHunter()
    {
        var hunter = new Vector2D(400, 400);
        var slots = Enumerable.Range(1, 5).Select(id => new FrostlingPacklingBehaviorState(id).CirclePoint(hunter, 0)).ToArray();
        foreach (var slot in slots) Assert.AreEqual(FrostlingPacklingBehaviorState.CircleRadius, Vector2D.Distance(slot, hunter), 1e-6);
        for (var a = 0; a < slots.Length; a++)
            for (var b = a + 1; b < slots.Length; b++)
                Assert.IsGreaterThan(30d, Vector2D.Distance(slots[a], slots[b]), "Neighbours never share a slot.");
    }

    [TestMethod]
    public void Packling_LungesTwiceAsOftenAtChilledPrey()
    {
        static double FirstLunge(bool chilled)
        {
            var packling = new FrostlingPacklingBehaviorState(3);
            for (var time = 0d; time < 10; time += 0.05)
                if (packling.Tick(0.05, new Vector2D(0, 0), new Vector2D(90, 0), chilled)) return time;
            return double.MaxValue;
        }

        var warm = FirstLunge(false);
        var cold = FirstLunge(true);
        Assert.IsLessThan(warm * 0.6, cold);
        Assert.AreEqual(FrostlingPacklingBehaviorState.BiteDamage * FrostlingPacklingBehaviorState.ChilledBiteMultiplier,
            FrostlingPacklingBehaviorState.BiteDamageAgainst(true), 1e-9);
    }

    [TestMethod]
    public void Packling_LocksItsLaneAtTheCrouchAndRecoversAfterTheBite()
    {
        var packling = new FrostlingPacklingBehaviorState(1);
        var hunter = new Vector2D(100, 0);
        while (!packling.Tick(0.05, Vector2D.Zero, hunter, false)) { }
        Assert.AreEqual(FrostlingPhase.Windup, packling.Phase);
        Assert.AreEqual(FrostlingPacklingBehaviorState.SkitterDistance, packling.LungeEnd.X, 1e-6);
        packling.Tick(0.05, Vector2D.Zero, new Vector2D(0, 300), false);
        Assert.AreEqual(1d, packling.LungeDirection.X, 1e-9, "The lane never re-aims.");
        while (packling.Phase == FrostlingPhase.Windup) packling.Tick(0.05, Vector2D.Zero, hunter, false);
        Assert.AreEqual(FrostlingPhase.Skitter, packling.Phase);
        packling.Land();
        Assert.IsTrue(packling.BiteLanded);
        Assert.AreEqual(FrostlingPhase.Recover, packling.Phase);
    }

    [TestMethod]
    public void Shardcaster_PlantsInItsBandAndSkatesOnlyAfterCasting()
    {
        var caster = new ShardcasterBehaviorState();
        var origin = Vector2D.Zero;
        var hunter = new Vector2D(260, 0);
        Assert.AreEqual(0d, caster.Movement(origin, hunter).SpeedMultiplier, "Planted while the hunter is in its band.");
        Assert.IsLessThan(0d, caster.Movement(origin, new Vector2D(100, 0)).Direction.X, "Backs away when crowded.");

        var events = new List<ShardcasterEvent>();
        var sawGlide = false;
        for (var time = 0d; time < 4; time += 0.05)
        {
            var result = caster.Tick(0.05, origin, hunter, 100, 100);
            if (result != ShardcasterEvent.None) events.Add(result);
            if (caster.Phase == ShardcasterPhase.Glide)
            {
                sawGlide = true;
                var (direction, multiplier) = caster.Movement(origin, hunter);
                Assert.AreEqual(0d, direction.X, 1e-9, "The skate runs sideways, never into the hunter.");
                Assert.AreEqual(ShardcasterBehaviorState.GlideSpeedMultiplier, multiplier);
            }
        }
        CollectionAssert.AreEqual(new[] { ShardcasterEvent.AimStarted, ShardcasterEvent.LanceReleased }, events.Take(2).ToArray());
        Assert.IsTrue(sawGlide);
    }

    [TestMethod]
    public void Shardcaster_GlazesBlackIceEveryThirdCast()
    {
        var caster = new ShardcasterBehaviorState();
        var releases = new List<ShardcasterEvent>();
        for (var time = 0d; time < 40 && releases.Count < 6; time += 0.05)
        {
            var release = caster.Tick(0.05, Vector2D.Zero, new Vector2D(260, 0), 100, 100);
            if (release is ShardcasterEvent.LanceReleased or ShardcasterEvent.PatchReleased) releases.Add(release);
        }
        CollectionAssert.AreEqual(new[]
        {
            ShardcasterEvent.LanceReleased, ShardcasterEvent.PatchReleased, ShardcasterEvent.LanceReleased,
            ShardcasterEvent.LanceReleased, ShardcasterEvent.PatchReleased, ShardcasterEvent.LanceReleased,
        }, releases);
    }

    [TestMethod]
    public void Shardcaster_BurstDuringTheAimShattersTheCast()
    {
        var caster = new ShardcasterBehaviorState();
        while (caster.Tick(0.05, Vector2D.Zero, new Vector2D(260, 0), 100, 100) != ShardcasterEvent.AimStarted) { }
        Assert.AreEqual(ShardcasterEvent.Interrupted, caster.Tick(0.05, Vector2D.Zero, new Vector2D(260, 0), 60, 100));
        Assert.AreEqual(ShardcasterPhase.Recover, caster.Phase);
    }

    [TestMethod]
    public void FrostRoster_IsItsOwnRealmAndHasBestiaryPages()
    {
        foreach (var kind in new[] { EnemyKind.FrostlingPackling, EnemyKind.Shardcaster })
        {
            var definition = EnemyCatalog.Get(kind);
            Assert.AreEqual(EnemyRealm.Frost, definition.Realm);
            Assert.IsTrue(definition.HabitatOnly, "Fire runs never draw the Frost roster.");
            Assert.IsTrue(BestiaryCatalog.HasEntry(kind));
        }
        Assert.IsNotNull(new EnemyState(1, Vector2D.Zero, 9, 10, 10, EnemyKind.FrostlingPackling).Packling);
        Assert.IsNotNull(new EnemyState(2, Vector2D.Zero, 11, 10, 10, EnemyKind.Shardcaster).Shardcaster);
    }
}
