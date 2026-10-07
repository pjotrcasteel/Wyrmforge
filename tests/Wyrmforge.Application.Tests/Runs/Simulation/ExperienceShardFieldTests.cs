using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ExperienceShardFieldTests
{
    [TestMethod]
    public void Drop_WhenFieldReachesCap_CompactsWithoutLosingExperience()
    {
        var field = new ExperienceShardField();

        for (var index = 0; index < ExperienceShardField.MaxLooseShards + 40; index++) field.Drop(new Vector2D(index, index % 13), 1);

        Assert.AreEqual(ExperienceShardField.MaxLooseShards, field.Shards.Count);
        Assert.AreEqual(ExperienceShardField.MaxLooseShards + 40, field.TotalValue);
        Assert.IsTrue(field.Shards.Any(shard => shard.Value > 1));
    }

    [TestMethod]
    public void Update_WhenShardIsInsideAttractionRadius_MovesItTowardPlayer()
    {
        var field = new ExperienceShardField();
        field.Drop(new Vector2D(100, 0), 1);

        field.Update(0.1, Vector2D.Zero);

        Assert.IsLessThan(100, field.Shards.Single().Position.X);
        Assert.AreEqual(1, field.TotalValue);
    }

    [TestMethod]
    public void Update_WhenShardTouchesPlayer_CollectsExactValue()
    {
        var field = new ExperienceShardField();
        field.Drop(new Vector2D(5, 0), 3);

        var collected = field.Update(0.05, Vector2D.Zero);

        Assert.AreEqual(3, collected);
        Assert.AreEqual(0, field.Shards.Count);
    }

    [TestMethod]
    public void Update_StationaryPlayerWhenAttractedShardReachesPickupBoundary_CollectsShard()
    {
        var field = new ExperienceShardField();
        field.Drop(new Vector2D(100, 37), 3);

        var collected = 0;
        for (var tick = 0; tick < 30 && collected == 0; tick++) collected += field.Update(0.05, Vector2D.Zero);

        Assert.AreEqual(3, collected);
        Assert.AreEqual(0, field.Shards.Count);
    }

    [TestMethod]
    public void Update_WhenShardIsOutsideAttractionRadius_LeavesItInPlace()
    {
        var field = new ExperienceShardField();
        field.Drop(new Vector2D(ExperienceShardField.AttractionRadius + 20, 0), 1);

        field.Update(0.1, Vector2D.Zero);

        Assert.AreEqual(ExperienceShardField.AttractionRadius + 20, field.Shards.Single().Position.X);
    }

    [TestMethod]
    public void CollectAll_WithCompactedShards_ReturnsEntireStoredValue()
    {
        var field = new ExperienceShardField();
        for (var index = 0; index < 220; index++) field.Drop(new Vector2D(index % 20, index % 11), index % 3 + 1);
        var expected = field.TotalValue;

        var collected = field.CollectAll();

        Assert.AreEqual(expected, collected);
        Assert.AreEqual(0, field.Shards.Count);
    }
}
