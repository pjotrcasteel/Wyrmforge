using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmHabitatTests
{
    [TestMethod]
    public void Generate_FixedBeats_FollowTheHuntsGeography()
    {
        for (var seed = 1; seed <= 60; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(1, seed).ToDictionary(node => node.Id[(node.Id.IndexOf('-', 6) + 1)..]);
            Assert.AreEqual(WyrmrealmHabitat.Outskirts, nodes["opening-1"].Habitat);
            Assert.AreEqual(WyrmrealmHabitat.WetForest, nodes["opening-2"].Habitat);
            Assert.AreEqual(WyrmrealmHabitat.DesertedVillage, nodes["clearing"].Habitat);
            Assert.AreEqual(WyrmrealmHabitat.ScorchedApproach, nodes["approach"].Habitat);
            Assert.AreEqual(WyrmrealmHabitat.Lair, nodes["wyrm"].Habitat);
        }
    }

    [TestMethod]
    public void Generate_FirstFork_OffersForestTrailOrOpenField_SecondForkOffersMonasteryOrFlood()
    {
        for (var seed = 1; seed <= 60; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(1, seed);
            var first = nodes.Where(node => node.Site!.RoadId?.StartsWith("road-0-") == true).Select(node => node.Habitat).ToHashSet();
            var second = nodes.Where(node => node.Site!.RoadId?.StartsWith("road-1-") == true && node.Site.RoadIndex == 0)
                .Select(node => node.Habitat).ToHashSet();
            Assert.IsTrue(first.Contains(WyrmrealmHabitat.WetForest) && first.Contains(WyrmrealmHabitat.OpenField), $"seed {seed}");
            Assert.IsTrue(second.Contains(WyrmrealmHabitat.MonasteryGrounds) && second.Contains(WyrmrealmHabitat.FloodedCloister), $"seed {seed}");
            var roads = nodes[0].Territory!.Roads;
            Assert.IsTrue(roads.Any(road => road.Name == "Forest trail") && roads.Any(road => road.Name == "Open field"), $"seed {seed}");
        }
    }

    [TestMethod]
    public void Generate_SameSeed_ProducesSameHabitats_DifferentSeedsVaryForkSides()
    {
        var first = WyrmrealmMapGenerator.Generate(1, 404).Select(node => (node.Id, node.Habitat)).ToArray();
        var second = WyrmrealmMapGenerator.Generate(1, 404).Select(node => (node.Id, node.Habitat)).ToArray();
        CollectionAssert.AreEqual(first, second);

        var forestLaneZero = Enumerable.Range(1, 40)
            .Select(seed => WyrmrealmMapGenerator.Generate(1, seed).First(node => node.Site!.RoadId == "road-0-0").Habitat == WyrmrealmHabitat.WetForest)
            .ToHashSet();
        Assert.HasCount(2, forestLaneZero, "Which side of the fork is forest must vary between hunts.");
    }

    [TestMethod]
    public void CreatePlan_Outskirts_OnlyHollows()
    {
        for (var seed = 0; seed < 20; seed++)
        {
            var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.StalkerPressure, 3, new SeededRandomSource(seed),
                habitat: WyrmrealmHabitat.Outskirts);
            Assert.IsNotEmpty(plan.Enemies);
            Assert.IsTrue(plan.Enemies.All(kind => kind == EnemyKind.Hollow));
        }
    }

    [TestMethod]
    public void CreatePlan_Habitats_ShapeTheRoster()
    {
        var forest = Share(WyrmrealmHabitat.WetForest);
        var field = Share(WyrmrealmHabitat.OpenField);
        var village = Share(WyrmrealmHabitat.DesertedVillage);
        var monastery = Share(WyrmrealmHabitat.MonasteryGrounds);

        Assert.IsGreaterThan(field[EnemyKind.MireHound], forest[EnemyKind.MireHound], "Forest hosts more Hounds than the field.");
        Assert.IsGreaterThan(forest[EnemyKind.Ashling], field[EnemyKind.Ashling], "The field hosts more Ashlings than the forest.");
        Assert.AreEqual(EnemyKind.Hollow, village.MaxBy(pair => pair.Value).Key, "Hollows dominate the village.");
        Assert.IsGreaterThan(village[EnemyKind.Penitent], monastery[EnemyKind.Penitent], "The monastery is where Penitents live.");
        Assert.AreEqual(0, forest[EnemyKind.Penitent], "No Penitent before its introduction.");
    }

    [TestMethod]
    public void Director_HabitatWithoutHounds_SubstitutesItsSignatureInsert()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.StalkerPressure, 1, 1, WyrmrealmHabitat.Outskirts);
        director.RegisterProgress(1, 1);
        for (var tick = 0; tick < 8; tick++) director.Tick(60);
        var inserts = new List<EnemyKind>();
        while (director.TryTakeInsert(out var kind)) inserts.Add(kind);
        Assert.IsNotEmpty(inserts);
        Assert.IsTrue(inserts.All(kind => kind == EnemyKind.Hollow));
    }

    private static Dictionary<EnemyKind, double> Share(WyrmrealmHabitat habitat)
    {
        var counts = Enum.GetValues<EnemyKind>().ToDictionary(kind => kind, _ => 0d);
        for (var seed = 0; seed < 300; seed++)
            foreach (var kind in EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Mixed, 1, new SeededRandomSource(seed), habitat: habitat).Enemies)
                counts[kind]++;
        var total = counts.Values.Sum();
        return counts.ToDictionary(pair => pair.Key, pair => pair.Value / total);
    }
}
