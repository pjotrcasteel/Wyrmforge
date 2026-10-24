using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Persistence;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.World;

[TestClass]
public sealed class RegionCatalogTests
{
    private static readonly RegionAccessContext Newcomer = new(false, 1, new HashSet<DragonId>());

    [TestMethod]
    public void CatalogInvariantsHold()
    {
        Assert.AreEqual(RegionCatalog.All.Count, RegionCatalog.All.Select(region => region.Id).Distinct().Count());
        foreach (var school in Enum.GetValues<SpellSchool>())
            Assert.AreEqual(1, RegionCatalog.All.Count(region => region.DominantSchool == school), school.ToString());
        foreach (var wyrm in Enum.GetValues<DragonId>())
            Assert.AreEqual(1, RegionCatalog.All.Count(region => region.HomeLineage == wyrm), wyrm.ToString());
        foreach (var region in RegionCatalog.All)
        {
            Assert.AreEqual(WyrmLineageCatalog.Get(region.HomeLineage).School, region.DominantSchool, region.Id.Value);
            Assert.IsTrue(region.ConceptRoster.Count > 0, region.Id.Value);
            Assert.IsTrue(region.Resources.Count > 0, region.Id.Value);
            if (region.Status == RegionStatus.Playable)
            {
                Assert.IsTrue(region.Habitats.Count > 0 && region.Roster.Count > 0, region.Id.Value);
            }
        }
    }

    [TestMethod]
    public void FireAndFrostAreOpenToANewcomer()
    {
        Assert.IsTrue(RegionCatalog.Starting.IsOpen(Newcomer));
        Assert.AreEqual(2, RegionCatalog.All.Count(region => region.IsOpen(Newcomer)));
        var veteran = new RegionAccessContext(true, 99, Enum.GetValues<DragonId>().ToHashSet());
        Assert.AreEqual(2, RegionCatalog.All.Count(region => region.IsOpen(veteran)), "Planned regions stay closed until authored.");
    }

    [TestMethod]
    public void FrostCanBeChosenBeforeDefeatingAshfang()
    {
        var frost = RegionCatalog.Get(RegionCatalog.FrostRegionId);
        Assert.AreEqual(RegionStatus.Playable, frost.Status);
        Assert.IsTrue(frost.IsOpen(Newcomer));
        Assert.IsTrue(frost.IsOpen(Newcomer with { WyrmsSlain = new HashSet<DragonId> { DragonId.Ashfang } }));
        Assert.AreEqual(DragonId.Rimeclaw, frost.HomeLineage);
        CollectionAssert.Contains(frost.AbsentLineages.ToList(), DragonId.Ashfang);
    }

    [TestMethod]
    public void AccessRulesUseOnlyAccountFacts()
    {
        Assert.IsFalse(new RegionAccessRule(RegionAccessKind.FirstHuntComplete).IsMet(Newcomer));
        Assert.IsTrue(new RegionAccessRule(RegionAccessKind.HunterLevel, HunterLevel: 3).IsMet(Newcomer with { HunterLevel = 3 }));
        Assert.IsFalse(new RegionAccessRule(RegionAccessKind.HunterLevel, HunterLevel: 3).IsMet(Newcomer with { HunterLevel = 2 }));
        var slain = new RegionAccessRule(RegionAccessKind.WyrmSlain, Wyrm: DragonId.Rimeclaw);
        Assert.IsFalse(slain.IsMet(Newcomer));
        Assert.IsTrue(slain.IsMet(Newcomer with { WyrmsSlain = new HashSet<DragonId> { DragonId.Rimeclaw } }));
        Assert.IsFalse(RegionAccessRule.NotYetAuthored.IsMet(Newcomer));
    }

    [TestMethod]
    public void StartingRegionKeepsEveryLineageAndResource()
    {
        Assert.AreEqual(0, RegionCatalog.Starting.AbsentLineages.Count);
        Assert.AreEqual(DragonId.Ashfang, RegionCatalog.Starting.HomeLineage);
    }

    [TestMethod]
    public void SimulationDefaultsToTheStartingRegionAndRefusesPlannedOnes()
    {
        var factory = new RunSimulationFactory(new FirstRandomSource());
        Assert.AreSame(RegionCatalog.Starting, factory.Create(new HashSet<string>(), seed: 5).Region);
        Assert.ThrowsExactly<InvalidOperationException>(() => factory.Create(new HashSet<string>(), seed: 5, region: RegionCatalog.StormRegionId));
    }

    [TestMethod]
    public void FirstHuntCulminatesInTheRegionsHomeLineage()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 9, firstHunt: true);
        Assert.AreEqual(DragonId.Ashfang, Attract(simulation));
    }

    [TestMethod]
    public void FrostFirstHuntCulminatesInRimeclaw()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 9, firstHunt: true, region: RegionCatalog.FrostRegionId);
        Assert.AreEqual(DragonId.Rimeclaw, Attract(simulation));
    }

    [TestMethod]
    public void FrostOpeningHuntMeetsRimeclawEvenWhenAResearchLeadPointsElsewhere()
    {
        for (var seed = 1; seed <= 12; seed++)
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed,
                researchLead: DragonId.Stormcoil, region: RegionCatalog.FrostRegionId, regionOpening: true);
            Assert.AreEqual(DragonId.Rimeclaw, Attract(simulation), $"seed {seed}");
        }
    }

    [TestMethod]
    public void FrostHuntsNeverAttractAshfang()
    {
        for (var seed = 1; seed <= 40; seed++)
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, region: RegionCatalog.FrostRegionId);
            Assert.AreNotEqual(DragonId.Ashfang, Attract(simulation), $"seed {seed}");
        }
    }

    [TestMethod]
    public void FrostHuntKeepsTheSeedsLayoutButRedrawsItsLand()
    {
        var factory = new RunSimulationFactory(new FirstRandomSource());
        var fire = factory.Create(new HashSet<string>(), seed: 31);
        var frost = factory.Create(new HashSet<string>(), seed: 31, region: RegionCatalog.FrostRegionId);
        CollectionAssert.AreEqual(fire.MapNodes.Select(node => node.Id).ToArray(), frost.MapNodes.Select(node => node.Id).ToArray());
        Assert.IsTrue(fire.MapNodes.All(node => WyrmrealmHabitatCatalog.Fire.Contains(node.Habitat)));
        Assert.IsTrue(frost.MapNodes.All(node => WyrmrealmHabitatCatalog.Frost.Contains(node.Habitat)));
        Assert.IsTrue(frost.MapNodes.Where(node => node.Stage == 1).All(node => node.Habitat == WyrmrealmHabitat.FrozenRoad));
        Assert.IsFalse(frost.MapNodes.Any(node => node.EncounterName == "Bell Warden"));
        Assert.IsTrue(fire.MapNodes.Any(node => node.EncounterName == "Bell Warden"));
    }

    [TestMethod]
    public void StartingRegionAttractionMatchesTheRegionlessRoll()
    {
        for (var seed = 1; seed <= 40; seed++)
        {
            var factory = new RunSimulationFactory(new SeededRandomSource(seed));
            var implicitRegion = Attract(factory.Create(new HashSet<string>(), seed: seed));
            var explicitRegion = Attract(factory.Create(new HashSet<string>(), seed: seed, region: RegionCatalog.CinderFrontierId));
            Assert.AreEqual(implicitRegion, explicitRegion, $"seed {seed}");
        }
    }

    [TestMethod]
    public void EverySavedWebKeyIsClassified()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !File.Exists(Path.Combine(root.FullName, "Wyrmforge.slnx"))) root = root.Parent;
        Assert.IsNotNull(root, "Repository root not found.");
        var web = Path.Combine(root.FullName, "src", "Wyrmforge.Presentation.Web");
        var pattern = new System.Text.RegularExpressions.Regex("[\"'`](wyrmforge[._][A-Za-z0-9._-]*[A-Za-z0-9])[\"'`]");
        var found = Directory.EnumerateFiles(web, "*.*", SearchOption.AllDirectories)
            .Where(path => path.EndsWith(".cs") || path.EndsWith(".razor") || path.EndsWith(".js"))
            .Where(path => !path.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}") && !path.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}"))
            .SelectMany(path => pattern.Matches(File.ReadAllText(path)).Select(match => match.Groups[1].Value))
            .Distinct()
            .ToArray();
        Assert.IsTrue(found.Length >= 20, "Key scan found too few keys.");
        var unclassified = found.Where(key => SaveLayout.DomainOf(key) is null).ToArray();
        Assert.AreEqual(0, unclassified.Length, "Unclassified keys: " + string.Join(", ", unclassified));
    }

    private static DragonId? Attract(RunSimulation simulation)
    {
        typeof(RunSimulation).GetMethod("ResolveDragonAttraction", BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, null);
        return (DragonId?)typeof(RunSimulation).GetField("attractedDragon", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation);
    }
}
