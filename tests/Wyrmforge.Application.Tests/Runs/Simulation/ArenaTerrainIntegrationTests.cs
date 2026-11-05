using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaTerrainIntegrationTests
{
    private const double Width = ArenaMetricEnvelope.CombatWidth;
    private const double Height = ArenaMetricEnvelope.CombatHeight;

    private static ArenaEnvironmentState Arena(int seed, bool terrain, int nodeIndex = 1)
    {
        var node = WyrmrealmMapGenerator.GenerateFireTierOne(seed).Where(n => n.Type == WyrmrealmNodeType.Combat).ElementAt(nodeIndex);
        return ArenaEnvironmentState.Create(seed, node, greybox: true, terrain: terrain);
    }

    [TestMethod]
    public void Terrain_IsOptInAndPublishedAsIdentityOnly()
    {
        Assert.IsNull(Arena(1204, terrain: false).Snapshot().Terrain);
        var terrain = Arena(1204, terrain: true).Snapshot().Terrain;
        Assert.IsNotNull(terrain);
        Assert.AreEqual(32, terrain.Columns);
        Assert.AreEqual(60, terrain.Rows);
    }

    [TestMethod]
    public void WithoutTerrain_MovementIsUnchanged()
    {
        var arena = Arena(1204, terrain: false);
        var proposed = new Vector2D(300, 900);
        Assert.AreEqual(proposed, arena.RestrictMovement(new Vector2D(512, 960), proposed, Width, Height, 12));
    }

    [TestMethod]
    public void Walking_NeverEntersAnUnstandableFootprintAndShotsStillResolveThroughTheEnvironment()
    {
        for (var seed = 0; seed < 25; seed++)
        {
            var arena = Arena(seed, terrain: true, nodeIndex: 1 + seed % 2);
            var grid = arena.Terrain!;
            var position = ArenaTerrainGrid.CenterOf(16, 52);
            var rng = new Random(seed);
            for (var step = 0; step < 800; step++)
            {
                var angle = rng.NextDouble() * Math.PI * 2;
                position = arena.RestrictMovement(position, position + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * 20, Width, Height, 12);
                Assert.IsTrue(grid.IsStandable(position, 12), $"seed {seed} step {step}");
            }
            Assert.IsFalse(arena.BlocksSegment(position, position, Width, Height), "a zero-length shot is never blocked");
        }
    }

    [TestMethod]
    public void Spawns_AreAlwaysOnGroundTheHunterCanWalkTo()
    {
        for (var seed = 0; seed < 25; seed++)
        {
            var arena = Arena(seed, terrain: true, nodeIndex: 2);
            var grid = arena.Terrain!;
            var hunter = ArenaTerrainGrid.CenterOf(16, 52);
            var reachable = grid.ReachableFrom(ArenaTerrainGrid.ColumnOf(hunter), 12);
            var rng = new Random(seed);
            for (var attempt = 0; attempt < 60; attempt++)
            {
                var requested = new Vector2D(rng.NextDouble() * Width, rng.NextDouble() * Height);
                if (arena.AdjustSpawnPosition(requested, hunter, Width, Height, 12) is not { } spot) continue;
                var (column, row) = ArenaTerrainGrid.ColumnOf(spot);
                Assert.IsTrue(reachable[row * grid.Columns + column], $"seed {seed}: spawn {spot} must be reachable");
                Assert.IsTrue(grid.IsStandable(spot, 12));
            }
        }
    }

    [TestMethod]
    public void SalvageProps_StandOnFlatWalkableGround()
    {
        for (var seed = 0; seed < 25; seed++)
        {
            var arena = Arena(seed, terrain: true);
            foreach (var prop in arena.Snapshot().Props)
            {
                var ground = new Vector2D(prop.X * Width, prop.Y * Height);
                Assert.AreEqual(0d, arena.Terrain!.SurfaceMetersAt(ground), $"seed {seed} prop {prop.Id}");
            }
        }
    }

    [TestMethod]
    [DataRow(42)]
    [DataRow(77)]
    [DataRow(1204)]
    [DataRow(5)]
    [DataRow(9)]
    public void FightRoute_WithTerrain_IsClearedByAStationaryHunterAndLeftThroughTheExit(int seed)
    {
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed))
            .Create(new HashSet<string>(), seed: seed, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain();
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var player = (Wyrmforge.Domain.Combat.Player.PlayerState)typeof(RunSimulation)
            .GetField("player", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;

        // Combat skill is not under test: enemies must path to a standing hunter, die to auto-aim and open the exit.
        Wyrmforge.Application.Runs.Simulation.Snapshots.RunRenderSnapshot snapshot = simulation.CreateSnapshot();
        for (var tick = 0; tick < 20 * 600 && snapshot.Exit is null; tick++)
        {
            player.Health = simulation.MaxHealth;
            snapshot = simulation.Tick(.05, default, 390, 700);
            while (simulation.PendingChoices.Count > 0) Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        }
        Assert.IsNotNull(snapshot.Exit, $"seed {seed}: the encounter must clear and open the exit");

        // The exit is reachable on foot: walk it with the environment's own navigation (terrain plus prop detours).
        var environment = (ArenaEnvironmentState)typeof(RunSimulation).GetField("arenaEnvironment",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
        var exit = new Vector2D(snapshot.Exit!.X, snapshot.Exit.Y);
        for (var tick = 0; tick < 20 * 90 && simulation.TrailExitPending; tick++)
        {
            var here = new Vector2D(snapshot.Player!.X, snapshot.Player.Y);
            // Steer to the centre of the exit's cell, not the cell border the gate marker sits on: a walker hugging a block's edge cannot slide past it.
            var waypoint = environment.EnemyNavigationTarget(here, new Vector2D(exit.X + ArenaTerrainGrid.CellUnits / 2, exit.Y), Width, Height, 12);
            var heading = (waypoint - here).Normalized();
            snapshot = simulation.Tick(.05, new MovementInput(heading.X, heading.Y), 390, 700);
        }
        var dump = "";
        if (simulation.TrailExitPending)
        {
            var grid = (ArenaTerrainGrid)typeof(ArenaEnvironmentState).GetField("terrain", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(environment)!;
            var (pc, pr) = ArenaTerrainGrid.ColumnOf(new Vector2D(snapshot.Player!.X, snapshot.Player.Y));
            for (var r = Math.Max(0, pr - 6); r <= Math.Min(grid.Rows - 1, pr + 4); r++)
            {
                dump += "\n" + r.ToString("00") + " ";
                for (var c = 4; c < 28; c++)
                    dump += (c == pc && r == pr ? "@" : grid.Material(c, r) switch { ArenaTerrainMaterial.Wood => 'T', ArenaTerrainMaterial.Boulder => 'B', ArenaTerrainMaterial.Stone => 'S', ArenaTerrainMaterial.Lava => 'L', _ => grid.Surface(c, r) == 0 ? '.' : grid.Surface(c, r) > 0 ? '^' : 'v' });
            }
        }
        Assert.IsFalse(simulation.TrailExitPending, $"seed {seed}: the exit gate must be walkable (hunter at {snapshot.Player!.X:0},{snapshot.Player.Y:0}, exit at {exit.X:0},{exit.Y:0}){dump}");
    }

    [TestMethod]
    public void Snapshots_PublishGroundHeightInWorldUnitsAndZeroWithoutTerrain()
    {
        foreach (var terrain in new[] { false, true })
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(42))
                .Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
            if (terrain) simulation.EnableHunt1Terrain();
            Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
            simulation.Tick(0, default, 390, 700);
            Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
            var environment = (ArenaEnvironmentState)typeof(RunSimulation).GetField("arenaEnvironment",
                System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation)!;
            var sawRaisedGround = false;
            for (var tick = 0; tick < 20 * 40; tick++)
            {
                var snapshot = simulation.Tick(.05, default, 390, 700);
                Assert.AreEqual(0d, snapshot.Player.Z % ArenaTerrainGrid.MicrocellUnits, "heights are whole four-unit microcells");
                foreach (var enemy in snapshot.Enemies)
                {
                    Assert.AreEqual(0d, enemy.Z % ArenaTerrainGrid.MicrocellUnits);
                    var expected = environment.GroundMetersAt(new Vector2D(enemy.X, enemy.Y), Width, Height) * 32 ?? 0;
                    Assert.AreEqual(expected, enemy.Z, 1e-9);
                    sawRaisedGround |= enemy.Z != 0;
                    if (!terrain) Assert.AreEqual(0d, enemy.Z, "without terrain every actor stands at ground level");
                }
            }
            Assert.IsFalse(!terrain && sawRaisedGround);
        }
    }

    [TestMethod]
    public void Simulation_OptsIntoTerrainAndStillCompletesAFightRoute()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource())
            .Create(new HashSet<string>(), seed: 1204, hunt: HuntSelection.FireTierOne);
        simulation.EnableHunt1Terrain();
        Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        var snapshot = simulation.Tick(.05, default, 390, 700);
        Assert.IsNotNull(snapshot.Environment?.Terrain);
        Assert.AreEqual(ArenaMetricEnvelope.CombatWidth, snapshot.World!.Width);
        Assert.AreEqual(528, snapshot.Player.X, 1, "the hunter enters at the south end of the road, on the protected clearing");
        Assert.IsGreaterThan(snapshot.World!.Height * .85, snapshot.Player.Y, "the hunter enters at the south (bottom) end");
    }
}
