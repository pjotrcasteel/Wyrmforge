using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class EnemyCollisionSolverTests
{
    [TestMethod]
    public void Resolve_SamePosition_SeparatesEnemiesWithoutRandomness()
    {
        var left = new EnemyState(1, new Vector2D(200, 200), 11, 100, 10);
        var right = new EnemyState(2, new Vector2D(200, 200), 13, 100, 10);
        var enemies = new[] { left, right };

        new EnemyCollisionSolver().Resolve(enemies, null, 800, 600);

        Assert.IsGreaterThanOrEqualTo(left.Radius + right.Radius - 0.0001, Vector2D.Distance(left.Position, right.Position));
        var repeated = new[]
        {
            new EnemyState(1, new Vector2D(200, 200), 11, 100, 10),
            new EnemyState(2, new Vector2D(200, 200), 13, 100, 10),
        };
        new EnemyCollisionSolver().Resolve(repeated, null, 800, 600);
        CollectionAssert.AreEqual(enemies.Select(enemy => enemy.Position).ToArray(), repeated.Select(enemy => enemy.Position).ToArray());
    }

    [TestMethod]
    public void Resolve_AnchoredWard_DoesNotMoveWardButPushesApproachingEnemy()
    {
        var ward = new EnemyState(1, new Vector2D(220, 220), 14, 100, 0, EnemyKind.CrystalWard);
        var hunter = new EnemyState(2, new Vector2D(225, 220), 11, 100, 40, EnemyKind.Hollow);

        new EnemyCollisionSolver().Resolve([ward, hunter], null, 800, 600);

        Assert.AreEqual(new Vector2D(220, 220), ward.Position);
        Assert.IsGreaterThanOrEqualTo(ward.Radius + hunter.Radius - 0.0001, Vector2D.Distance(ward.Position, hunter.Position));
    }

    [TestMethod]
    public void Resolve_InArena_SeparatesBodiesWithoutEnteringSolidGeometry()
    {
        const double width = 1100;
        const double height = 2100;
        var map = new WyrmrealmMapState(seed: 71);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var firstSpot = terrain.AdjustSpawnPosition(new Vector2D(590, 1000), new Vector2D(350, 1000), width, height, 13);
        Assert.IsNotNull(firstSpot);
        var enemies = new[]
        {
            new EnemyState(3, firstSpot.Value, 13, 100, 40),
            new EnemyState(4, firstSpot.Value, 13, 100, 40),
        };

        new EnemyCollisionSolver().Resolve(enemies, terrain, width, height);

        Assert.IsGreaterThanOrEqualTo(25.9999, Vector2D.Distance(enemies[0].Position, enemies[1].Position));
        foreach (var enemy in enemies)
            Assert.IsFalse(terrain.IsBlocked(enemy.Position, width, height, enemy.Radius));
    }

    [TestMethod]
    public void Resolve_DistantEnemies_DoesNotChangePositions()
    {
        var first = new EnemyState(1, new Vector2D(100, 100), 12, 100, 20);
        var second = new EnemyState(2, new Vector2D(750, 550), 12, 100, 20);

        new EnemyCollisionSolver().Resolve([first, second], null, 800, 600);

        Assert.AreEqual(new Vector2D(100, 100), first.Position);
        Assert.AreEqual(new Vector2D(750, 550), second.Position);
    }

    [TestMethod]
    public void Tick_OverlappingEnemyBodies_UsesResolvedPositionsInRealRenderSnapshot()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        simulation.Tick(0, default, 800, 600);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var enemies = (List<EnemyState>)typeof(RunSimulation)
            .GetField("enemies", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
        enemies.Clear();
        enemies.Add(new EnemyState(8001, new Vector2D(530, 300), 12, 10000, 35));
        enemies.Add(new EnemyState(8002, new Vector2D(530, 300), 12, 10000, 35));

        var snapshot = simulation.Tick(0, default, 800, 600);
        var left = snapshot.Enemies.Single(enemy => enemy.EntityId == 8001);
        var right = snapshot.Enemies.Single(enemy => enemy.EntityId == 8002);
        var distance = Math.Sqrt(Math.Pow(left.X - right.X, 2) + Math.Pow(left.Y - right.Y, 2));

        Assert.IsGreaterThanOrEqualTo(left.Radius + right.Radius - 0.0001, distance);
    }
}
