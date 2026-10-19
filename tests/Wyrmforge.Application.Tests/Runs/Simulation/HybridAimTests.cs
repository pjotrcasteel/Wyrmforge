using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class HybridAimTests
{
    [TestMethod]
    public void OldInputJsonAndDefaultAimRemainAutomatic()
    {
        var input = JsonSerializer.Deserialize<MovementInput>("{\"X\":0,\"Y\":-1}");
        Assert.IsFalse(input.HasManualAim);
        Assert.AreEqual(new Vector2D(0, -1), input.Direction);
        Assert.AreEqual(2, MovementInput.CurrentVersion);
    }

    [TestMethod]
    [DataRow(double.NaN, 1d)]
    [DataRow(1d, double.PositiveInfinity)]
    [DataRow(0d, 0d)]
    public void InvalidAndDeadzoneAimCannotLatchManual(double x, double y) =>
        Assert.IsFalse(new MovementInput(0, 0, x, y).HasManualAim);

    [TestMethod]
    [DataRow(0d, 0d)]
    [DataRow(0d, -1d)]
    [DataRow(1d, 0d)]
    public void DefaultAutoAimTargetsWestIndependentlyOfMovement(double x, double y)
    {
        var simulation = Scene();
        AddEnemy(simulation, 1, 300, 300);
        Invoke(simulation, "UpdatePlayer", 0d, new MovementInput(x, y), 800d, 600d);
        Invoke(simulation, "UpdateAim", new MovementInput(x, y));
        Cast(simulation, SpellId.FireBolt);
        var shot = Field<List<ProjectileState>>(simulation, "projectiles").Single();
        Assert.IsLessThan(0d, shot.Velocity.X);
        Assert.AreEqual(0d, shot.Velocity.Y, 1e-9);
        Assert.IsFalse(simulation.CreateSnapshot().Player.ManualAim);
        Assert.AreEqual(1, simulation.CreateSnapshot().Player.AimTargetId);
    }

    [TestMethod]
    public void ManualEastWinsOverNearerWestAndReleaseRestoresAutoWithoutExtraCast()
    {
        var simulation = Scene();
        var west = AddEnemy(simulation, 1, 350, 300);
        Invoke(simulation, "UpdateAim", new MovementInput(0, -1, 1, 0));
        Cast(simulation, SpellId.FireBolt);
        Assert.IsGreaterThan(0d, Field<List<ProjectileState>>(simulation, "projectiles").Single().Velocity.X);
        Assert.IsTrue(simulation.CreateSnapshot().Player.ManualAim);
        Assert.AreEqual(0d, simulation.CreateSnapshot().Player.AimAngle, 1e-9);
        Assert.AreEqual(west.MaxHealth, west.Health, "A deliberately missed shot cannot damage a rear target.");
        Invoke(simulation, "UpdateAim", new MovementInput(0, -1));
        Assert.AreEqual(1, Field<List<ProjectileState>>(simulation, "projectiles").Count, "Releasing aim does not cast.");
        Cast(simulation, SpellId.FireBolt);
        Assert.IsLessThan(0d, Field<List<ProjectileState>>(simulation, "projectiles")[1].Velocity.X);
        Assert.IsFalse(simulation.CreateSnapshot().Player.ManualAim);
    }

    [TestMethod]
    public void ManualProjectileCanCastIntoEmptySpaceButAutomaticModeWaitsForTarget()
    {
        var simulation = Scene();
        Invoke(simulation, "UpdateAim", new MovementInput(0, 0, 0, -1));
        Cast(simulation, SpellId.FrostShard);
        Assert.IsLessThan(0d, Field<List<ProjectileState>>(simulation, "projectiles").Single().Velocity.Y);
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Cast(simulation, SpellId.FrostShard);
        Assert.AreEqual(1, Field<List<ProjectileState>>(simulation, "projectiles").Count);
    }

    [TestMethod]
    public void AutoAcquisitionIsStableButDropsDeadAndOutOfRangeTargets()
    {
        var simulation = Scene();
        var first = AddEnemy(simulation, 1, 500, 300);
        var second = AddEnemy(simulation, 2, 510, 300);
        Invoke(simulation, "UpdateAim", default(MovementInput));
        second.Position = new Vector2D(495, 300);
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Assert.AreEqual(1, simulation.CreateSnapshot().Player.AimTargetId);
        first.Health = 0;
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Assert.AreEqual(2, simulation.CreateSnapshot().Player.AimTargetId);
        second.Position = new Vector2D(1400, 300);
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Assert.IsNull(simulation.CreateSnapshot().Player.AimTargetId);
    }

    [TestMethod]
    public void ManualLightningSelectsForwardFirstLinkThenKeepsOrdinaryChaining()
    {
        var simulation = Scene();
        var rear = AddEnemy(simulation, 1, 370, 300);
        var forward = AddEnemy(simulation, 2, 520, 300);
        Invoke(simulation, "UpdateAim", new MovementInput(0, 0, 1, 0));
        Cast(simulation, SpellId.ChainLightning);
        var snapshot = simulation.CreateSnapshot();
        Assert.IsTrue(snapshot.Lightning.Count > 0);
        Assert.AreEqual(forward.Position.X, snapshot.Lightning[0].ToX);
        Assert.AreEqual(forward.Position.Y, snapshot.Lightning[0].ToY);
        Assert.IsLessThan(forward.MaxHealth, forward.Health);
        // Rank-one's real chain budget determines whether a subsequent rear link exists.
        if (snapshot.Lightning.Count > 1) Assert.IsLessThan(rear.MaxHealth, rear.Health);
    }

    [TestMethod]
    public void ManualLightningDoesNotAcquireRearEnemyWhenForwardConeIsEmpty()
    {
        var simulation = Scene();
        var rear = AddEnemy(simulation, 1, 370, 300);
        Invoke(simulation, "UpdateAim", new MovementInput(0, 0, 1, 0));
        Cast(simulation, SpellId.ChainLightning);
        Assert.AreEqual(0, simulation.CreateSnapshot().Lightning.Count);
        Assert.AreEqual(rear.MaxHealth, rear.Health);
    }

    [TestMethod]
    public void AcquisitionLineOfSightRespectsClosedGateAndItsActualOpening()
    {
        const double width = 800, height = 1200;
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        var gate = terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").OrderBy(barrier => barrier.Y).First();
        var x = (gate.X + gate.Width / 2) * width;
        var above = new Vector2D(x, gate.Y * height - 30);
        var below = new Vector2D(x, (gate.Y + gate.Height) * height + 30);
        Assert.IsFalse(terrain.HasLineOfSight(above, below, width, height));
        Assert.IsFalse(terrain.HasLineOfSight(below, above, width, height));
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.IsTrue(terrain.HasLineOfSight(above, below, width, height));
        var wallAbove = new Vector2D(width * .1, above.Y);
        var wallBelow = new Vector2D(width * .1, below.Y);
        Assert.IsFalse(terrain.HasLineOfSight(wallAbove, wallBelow, width, height));
    }

    private static RunSimulation Scene()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42);
        simulation.Tick(0, default, 800, 600);
        return simulation;
    }
    private static EnemyState AddEnemy(RunSimulation simulation, int id, double x, double y)
    {
        var enemy = new EnemyState(id, new Vector2D(x, y), 12, 1000, 0);
        Field<List<EnemyState>>(simulation, "enemies").Add(enemy);
        return enemy;
    }
    private static void Cast(RunSimulation simulation, SpellId spell) => Invoke(simulation, "CastSpell", SpellCatalog.Get(spell), 1, 1d, false);
    private static T Field<T>(RunSimulation simulation, string field) => (T)typeof(RunSimulation).GetField(field, BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(simulation)!;
    private static void Invoke(RunSimulation simulation, string name, params object?[] args) => typeof(RunSimulation).GetMethod(name, BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(simulation, args);
}
