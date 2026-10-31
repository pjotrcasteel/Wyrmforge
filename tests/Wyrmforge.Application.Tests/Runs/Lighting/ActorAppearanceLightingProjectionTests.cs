using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation.Lighting;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Lighting;

[TestClass]
public sealed class ActorAppearanceLightingProjectionTests
{
    [TestMethod]
    public void Capture_OnlyLivingAshlings_UsesStableIdentityAndHeadPosition()
    {
        var ashling = new EnemyState(42, new Vector2D(50, 80), 11, 10, 1, EnemyKind.Ashling);
        var dead = new EnemyState(43, new Vector2D(51, 80), 11, 10, 1, EnemyKind.Ashling) { Health = 0 };
        var hollow = new EnemyState(44, new Vector2D(49, 80), 11, 10, 1, EnemyKind.Hollow);

        var source = ActorAppearanceLightingProjection.Capture([dead, hollow, ashling], 50, 80).Single();

        Assert.AreEqual("actor-eye:42", source.Id);
        Assert.AreEqual("actor:42", source.OwnerId);
        Assert.AreEqual("point", source.Type);
        Assert.IsFalse(source.CastsShadows);
        Assert.AreEqual(50, source.X);
        Assert.AreEqual(80, source.Y);
        Assert.AreEqual(11 * 3.1, source.Z, 0.001);
    }

    [TestMethod]
    public void Capture_BoundsMobileLightCostAndRemovesDespawnedSources()
    {
        var actors = Enumerable.Range(1, 12)
            .Select(id => new EnemyState(id, new Vector2D(id * 10, 20), 11, 10, 1, EnemyKind.Ashling))
            .ToArray();

        var first = ActorAppearanceLightingProjection.Capture(actors, 0, 20);
        var afterDespawn = ActorAppearanceLightingProjection.Capture(actors.Skip(1), 0, 20);

        CollectionAssert.AreEqual(new[] { "actor-eye:1", "actor-eye:2" }, first.Select(s => s.Id).ToArray());
        CollectionAssert.AreEqual(new[] { "actor-eye:2", "actor-eye:3" }, afterDespawn.Select(s => s.Id).ToArray());
        Assert.IsTrue(first.All(source => !source.CastsShadows));
    }
}
