using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class HabitatSpawnTests
{
    [TestMethod]
    [DataRow(3)]
    [DataRow(17)]
    [DataRow(9001)]
    public void MapEncounters_AcrossTheRoute_SpawnHabitatResidentsAwayFromTheHunter(int seed)
    {
        var random = new SeededRandomSource(seed);
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        var enemies = Field<List<EnemyState>>(simulation, "enemies");
        var habitats = new List<WyrmrealmHabitat>();
        for (var trail = 0; trail < WyrmrealmMapState.CombatStages && simulation.AvailableMapNodes.Any(node => node.Type == WyrmrealmNodeType.Combat); trail++)
        {
            var node = simulation.AvailableMapNodes.Where(node => node.Type == WyrmrealmNodeType.Combat).OrderBy(node => node.Id).First();
            Assert.IsTrue(simulation.ChooseMapNode(node.Id));
            habitats.Add(node.Habitat);
            simulation.Tick(0, default, 1100, 2100);
            var hunter = simulation.CreateSnapshot().Player;
            var seen = new HashSet<int>();
            for (var frame = 0; frame < 400; frame++)
            {
                Invoke(simulation, "UpdateSpawn", 0.05d, 1100d, 2100d);
                foreach (var enemy in enemies.Where(enemy => seen.Add(enemy.Id)))
                {
                    Assert.IsGreaterThanOrEqualTo(ArenaEnvironmentState.MinimumSpawnDistance,
                        Vector2D.Distance(enemy.Position, new Vector2D(hunter.X, hunter.Y)), $"{node.Habitat} spawned beside the hunter");
                    // Roster step 7: the pre-lair road is the Bell Warden's set piece, not a habitat horde.
                    if (node.PreLair) Assert.AreEqual(EnemyKind.BellWarden, enemy.Kind, "Only the Warden walks onto the pre-lair road.");
                    else Assert.IsTrue(EnemyHabitatProfile.Allows(node.Habitat, enemy.Kind), $"{enemy.Kind} does not live in {node.Habitat}");
                }
            }
            Assert.IsNotEmpty(seen, $"{node.Habitat} produced no enemies");
            for (var kill = map.CurrentNodeKills; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill();
            enemies.Clear();
        }
        Assert.AreEqual(WyrmrealmHabitat.Outskirts, habitats[0]);
        Assert.AreEqual(WyrmrealmHabitat.WetForest, habitats[1]);
        Assert.IsGreaterThanOrEqualTo(4, habitats.Distinct().Count(), "A hunt should cross several habitats.");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
