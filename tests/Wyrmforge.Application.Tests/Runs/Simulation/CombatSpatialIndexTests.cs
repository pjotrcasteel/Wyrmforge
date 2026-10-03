using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class CombatSpatialIndexTests
{
    [TestMethod]
    public void FirstCollidingTarget_AcrossCellBoundary_FindsNearbyEnemyWithoutScanningWorld()
    {
        var index = new CombatSpatialIndex();
        var nearby = new EnemyState(1, new Vector2D(97, 96), 11, 100, 0);
        var distant = new EnemyState(2, new Vector2D(600, 600), 11, 100, 0);
        index.Rebuild([nearby, distant], null);

        var target = index.FirstCollidingTarget(new Vector2D(92, 96), 5);

        Assert.AreSame(nearby, target);
    }

    [TestMethod]
    public void CollectWithinRadius_ExcludesIgnoredAndDeadTargets()
    {
        var index = new CombatSpatialIndex();
        var ignored = new EnemyState(1, new Vector2D(100, 100), 11, 100, 0);
        var included = new EnemyState(2, new Vector2D(120, 100), 11, 100, 0);
        var dead = new EnemyState(3, new Vector2D(115, 100), 11, 100, 0) { Health = 0 };
        var buffer = new List<ICombatTarget>();
        index.Rebuild([ignored, included, dead], null);

        index.CollectWithinRadius(new Vector2D(100, 100), 40, ignored.Id, buffer);

        Assert.AreEqual(1, buffer.Count);
        Assert.AreSame(included, buffer[0]);
    }
}
