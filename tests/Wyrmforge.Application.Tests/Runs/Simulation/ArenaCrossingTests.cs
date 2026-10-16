using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaCrossingTests
{
    private const double Width = 1100;
    private const double Height = 2100;

    [TestMethod]
    public void Create_SameRouteAndSeed_ProducesStableRuinedCrossings()
    {
        var map = new WyrmrealmMapState(seed: 1204);
        var node = map.AvailableNodes[0];
        var first = ArenaEnvironmentState.Create(map.Seed, node).Snapshot();
        var next = ArenaEnvironmentState.Create(map.Seed, node).Snapshot();
        CollectionAssert.AreEqual(first.Barriers.ToArray(), next.Barriers.ToArray());
        Assert.AreEqual(6, first.Barriers.Count);
        Assert.AreEqual(2, first.Barriers.Count(barrier => barrier.Kind == "gate"));
        Assert.IsTrue(first.Barriers.All(barrier => !barrier.Open));
        Assert.IsTrue(first.Barriers.Where(barrier => barrier.Kind == "gate").All(barrier => barrier.Width >= .18));
    }

    [TestMethod]
    public void SetPhase_OpensNorthernCrossingThenSouthernCrossingWithoutRelocking()
    {
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gates = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").OrderBy(barrier => barrier.Y).ToArray();
        Assert.AreEqual(2, gates.Length);

        var north = new Vector2D((gates[0].X + gates[0].Width * .5) * Width, (gates[0].Y + gates[0].Height * .5) * Height);
        var south = new Vector2D((gates[1].X + gates[1].Width * .5) * Width, (gates[1].Y + gates[1].Height * .5) * Height);
        var wing = new Vector2D(.2 * Width, north.Y);
        Assert.IsTrue(terrain.IsBlocked(north, Width, Height, 12));
        Assert.IsTrue(terrain.IsBlocked(south, Width, Height, 12));

        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.IsFalse(terrain.IsBlocked(north, Width, Height, 12));
        Assert.IsTrue(terrain.IsBlocked(south, Width, Height, 12));
        Assert.IsTrue(terrain.IsBlocked(wing, Width, Height, 12), "Permanent masonry must force the hunter through a chokepoint.");

        terrain.SetPhase(EncounterPhase.Surge);
        Assert.IsFalse(terrain.IsBlocked(south, Width, Height, 12));
        terrain.SetPhase(EncounterPhase.Pressure);
        Assert.IsFalse(terrain.IsBlocked(north, Width, Height, 12));
        Assert.IsFalse(terrain.IsBlocked(south, Width, Height, 12));
    }

    [TestMethod]
    public void RestrictMovement_CollisionSlidesAlongMasonryAndDoesNotTrapHunter()
    {
        var map = new WyrmrealmMapState(seed: 18);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gate = terrain.Snapshot().Barriers.First(barrier => barrier.Kind == "gate");
        var y = (gate.Y + gate.Height) * Height;
        var previous = new Vector2D(Width * .3, y + 21);
        var proposed = new Vector2D(previous.X + 14, y + 3);
        var result = terrain.RestrictMovement(previous, proposed, Width, Height, 12);
        Assert.AreEqual(proposed.X, result.X, "Movement along the ruined wall should remain possible.");
        Assert.AreEqual(previous.Y, result.Y, "Movement into the ruined wall must be blocked.");
        terrain.SetPhase(EncounterPhase.Surge);
        Assert.IsTrue(terrain.IsBlocked(new Vector2D(Width * .3, y), Width, Height, 12));
    }

    [TestMethod]
    public void AdjustSpawnPosition_BeforeGateOpens_KeepsEnemiesInHuntersReachableRegion()
    {
        var map = new WyrmrealmMapState(seed: 71);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var hunter = new Vector2D(Width * .5, Height * .5);
        var northGate = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").Min(barrier => barrier.Y);
        var southGate = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").Max(barrier => barrier.Y);
        var northSpawn = terrain.AdjustSpawnPosition(new Vector2D(Width * .5, Height * .1), hunter, Width, Height, 15)!.Value;
        var southSpawn = terrain.AdjustSpawnPosition(new Vector2D(Width * .5, Height * .9), hunter, Width, Height, 15)!.Value;
        Assert.IsGreaterThan(northGate * Height, northSpawn.Y);
        Assert.IsLessThan(southGate * Height, southSpawn.Y);
        Assert.IsFalse(terrain.IsBlocked(northSpawn, Width, Height, 15));
        Assert.IsFalse(terrain.IsBlocked(southSpawn, Width, Height, 15));
    }

    [TestMethod]
    public void AdjustSpawnPosition_RequestOnHunter_NeverSpawnsBesideHunter()
    {
        var map = new WyrmrealmMapState(seed: 71);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gates = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").ToArray();
        var hunter = new Vector2D(Width * .5, Height * .5);
        foreach (var requested in new[] { hunter, new Vector2D(hunter.X + 20, hunter.Y), new Vector2D(Width * .5, gates.Min(gate => gate.Y) * Height) })
        {
            var spawn = terrain.AdjustSpawnPosition(requested, hunter, Width, Height, 15);
            Assert.IsNotNull(spawn);
            Assert.IsGreaterThanOrEqualTo(ArenaEnvironmentState.MinimumSpawnDistance, Vector2D.Distance(spawn.Value, hunter));
            Assert.IsFalse(terrain.IsBlocked(spawn.Value, Width, Height, 15));
            Assert.IsGreaterThan(gates.Min(gate => gate.Y + gate.Height) * Height, spawn.Value.Y, "No spawn behind the sealed north gate.");
            Assert.IsLessThan(gates.Max(gate => gate.Y) * Height, spawn.Value.Y, "No spawn behind the sealed south gate.");
        }
    }

    [TestMethod]
    public void AdjustSpawnPosition_NoSafeGround_SkipsInsteadOfFallingBackToHunter()
    {
        var map = new WyrmrealmMapState(seed: 71);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        // A tiny arena where every reachable point lies inside the hunter's safety ring.
        var spawn = terrain.AdjustSpawnPosition(new Vector2D(40, 40), new Vector2D(60, 60), 120, 120, 10);
        Assert.IsNull(spawn);
    }

    [TestMethod]
    public void AdjustSpawnPosition_SameInputs_IsDeterministic()
    {
        var map = new WyrmrealmMapState(seed: 33);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var hunter = new Vector2D(Width * .3, Height * .5);
        var first = terrain.AdjustSpawnPosition(hunter, hunter, Width, Height, 14);
        var second = terrain.AdjustSpawnPosition(hunter, hunter, Width, Height, 14);
        Assert.AreEqual(first, second);
    }

    [TestMethod]
    public void EnemyNavigationTarget_OpenedPassage_LeadsPursuerThroughThroat()
    {
        var map = new WyrmrealmMapState(seed: 97);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        var gate = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").OrderBy(barrier => barrier.Y).First();
        var hunter = new Vector2D(Width * .25, Height * .2);
        var enemy = new Vector2D(Width * .88, Height * .5);
        var target = terrain.EnemyNavigationTarget(enemy, hunter, Width, Height, 14);
        Assert.AreEqual(Width * .5, target.X);
        Assert.IsLessThan(gate.Y * Height, target.Y);
    }
}
