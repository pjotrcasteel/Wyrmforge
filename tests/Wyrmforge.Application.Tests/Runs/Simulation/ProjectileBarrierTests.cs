using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ProjectileBarrierTests
{
    private const double Width = 800, Height = 1200;

    [TestMethod]
    public void SweptShotCannotTunnelThroughClosedGateAndReportsFirstContact()
    {
        var (terrain, gate) = Terrain();
        var x = (gate.X + gate.Width / 2) * Width;
        var from = new Vector2D(x, (gate.Y + gate.Height) * Height + 40);
        var to = new Vector2D(x, gate.Y * Height - 40);
        Assert.IsFalse(terrain.IsBlocked(from, Width, Height, 4));
        Assert.IsFalse(terrain.IsBlocked(to, Width, Height, 4));
        Assert.IsTrue(terrain.TryProjectileCollision(from, to, Width, Height, 4, out var contact));
        Assert.AreEqual((gate.Y + gate.Height) * Height + 4, contact.Y, .01);
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Assert.IsFalse(terrain.TryProjectileCollision(from, to, Width, Height, 4, out _));
    }

    [TestMethod]
    public void SweepUsesProjectileRadiusAndRoundedCornersInsteadOfSquareExpansion()
    {
        var (terrain, gate) = Terrain();
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        var wall = terrain.Snapshot().Barriers.First(barrier => barrier.Kind != "gate");
        var maxX = (wall.X + wall.Width) * Width;
        var minY = wall.Y * Height;
        // The outside corner is more than radius away diagonally, despite lying inside an expanded square.
        var clear = new Vector2D(maxX + 3.5, minY - 3.5);
        Assert.IsFalse(terrain.IsBlocked(clear, Width, Height, 4));
        Assert.IsFalse(terrain.BlocksSegment(clear, clear, Width, Height, 4));
        var grazing = new Vector2D(maxX + 2, minY - 2);
        Assert.IsTrue(terrain.IsBlocked(grazing, Width, Height, 4));
        Assert.IsTrue(terrain.BlocksSegment(grazing, grazing, Width, Height, 4));
    }

    [TestMethod]
    public void ManualPrimaryStopsAtWallWithoutDamagingEnemyOrCreatingHitRewards()
    {
        var (simulation, terrain, gate, enemy) = Scene();
        Invoke(simulation, "UpdateAim", new MovementInput(0, 0, 0, -1));
        Invoke(simulation, "CastSpell", SpellCatalog.Get(SpellId.FireBolt), 1, 1d, false);
        Assert.AreEqual(1, Projectiles(simulation).Count);
        var projectileRadius = Projectiles(simulation)[0].Radius;
        Invoke(simulation, "RebuildCombatSpatialIndex");
        for (var tick = 0; tick < 40; tick++)
        {
            Invoke(simulation, "UpdateProjectiles", .05, Width, Height);
            Invoke(simulation, "ResolveProjectileHits");
        }
        Assert.AreEqual(0, Projectiles(simulation).Count);
        Assert.AreEqual(enemy.MaxHealth, enemy.Health);
        var snapshot = simulation.CreateSnapshot();
        Assert.AreEqual(0, snapshot.Hud.Kills);
        Assert.AreEqual(0, snapshot.DeathBursts.Count);
        var contact = snapshot.ElementalImpacts.Single();
        Assert.AreEqual((gate.Y + gate.Height) * Height + projectileRadius, contact.Y, .02);
    }

    [TestMethod]
    public void AutomaticPrimaryRejectsOccludedEnemyThenReacquiresAfterGateOpens()
    {
        var (simulation, terrain, _, enemy) = Scene();
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Assert.IsNull(simulation.CreateSnapshot().Player.AimTargetId);
        Invoke(simulation, "UpdateSpellcasting", .05, false);
        Assert.AreEqual(0, Projectiles(simulation).Count);
        terrain.SetPhase(EncounterPhase.BreathingRoom);
        Invoke(simulation, "UpdateAim", default(MovementInput));
        Assert.AreEqual(enemy.Id, simulation.CreateSnapshot().Player.AimTargetId);
        Invoke(simulation, "CastSpell", SpellCatalog.Get(SpellId.FireBolt), 1, 1d, false);
        Invoke(simulation, "RebuildCombatSpatialIndex");
        for (var tick = 0; tick < 40; tick++)
        {
            Invoke(simulation, "UpdateProjectiles", .05, Width, Height);
            Invoke(simulation, "ResolveProjectileHits");
        }
        Assert.IsLessThan(enemy.MaxHealth, enemy.Health, "Open-gate shots retain ordinary enemy damage.");
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.Count > 0);
    }

    [TestMethod]
    public void ActualFastProjectileIsConsumedBeforeEndpointEnemyCanBeHitThroughMasonry()
    {
        var (simulation, _, _, enemy) = Scene();
        var player = Field<PlayerState>(simulation, "player");
        // Intentionally give this one real Fireball the complete
        // Meteor + Detonation + Scorched loadout. Wall contact is still
        // non-damaging; the impact may present debris but cannot fake AoE
        // or burn a field on the other side of solid masonry.
        Projectiles(simulation).Add(new ProjectileState(player.Position,
            (enemy.Position - player.Position) * 20, 4, 100, SpellId.FireBolt,
            new ProjectileEffects(false, 0, 46, null, 0, 0)
            {
                FireballMutationMask = 7,
                FireballSourceId = 123,
            }));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        Invoke(simulation, "UpdateProjectiles", .05, Width, Height);
        Invoke(simulation, "ResolveProjectileHits");
        Assert.AreEqual(0, Projectiles(simulation).Count);
        Assert.AreEqual(enemy.MaxHealth, enemy.Health);
        var snapshot = simulation.CreateSnapshot();
        var contact = snapshot.ElementalImpacts.Single();
        Assert.AreEqual(SpellId.FireBolt, contact.Spell);
        Assert.AreEqual(7, contact.FireballMutationMask);
        Assert.AreEqual(123, contact.FireballSourceId);
        Assert.AreEqual(0d, contact.SplashRadius, .00001, "A wall is never a damaging Detonation hit.");
        Assert.AreEqual(0, snapshot.BurningGrounds.Count, "Wall contact cannot fabricate burning ground.");
    }

    private static (ArenaEnvironmentState Terrain, ArenaBarrierRenderSnapshot Gate) Terrain()
    {
        var map = new WyrmrealmMapState(seed: 25);
        var terrain = ArenaEnvironmentState.Create(map.Seed, map.AvailableNodes[0]);
        return (terrain, terrain.Snapshot().Barriers.Where(barrier => barrier.Kind == "gate").OrderBy(barrier => barrier.Y).First());
    }
    private static (RunSimulation Simulation, ArenaEnvironmentState Terrain, ArenaBarrierRenderSnapshot Gate, EnemyState Enemy) Scene()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42);
        simulation.Tick(0, default, Width, Height);
        var (terrain, gate) = Terrain();
        typeof(RunSimulation).GetField("arenaEnvironment", BindingFlags.NonPublic | BindingFlags.Instance)!.SetValue(simulation, terrain);
        var x = (gate.X + gate.Width / 2) * Width;
        Field<PlayerState>(simulation, "player").Position = new Vector2D(x, (gate.Y + gate.Height) * Height + 40);
        var enemy = new EnemyState(1, new Vector2D(x, gate.Y * Height - 40), 12, 1000, 0);
        Field<List<EnemyState>>(simulation, "enemies").Add(enemy);
        return (simulation, terrain, gate, enemy);
    }
    private static List<ProjectileState> Projectiles(RunSimulation simulation) => Field<List<ProjectileState>>(simulation, "projectiles");
    private static T Field<T>(RunSimulation simulation, string field) => (T)typeof(RunSimulation).GetField(field, BindingFlags.NonPublic | BindingFlags.Instance)!.GetValue(simulation)!;
    private static void Invoke(RunSimulation simulation, string name, params object?[] args) => typeof(RunSimulation).GetMethod(name, BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(simulation, args);
}
