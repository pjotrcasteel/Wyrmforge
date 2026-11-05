using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Application.Runs.Hunts;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class WyrmInfluencePackTests
{
    private static Dictionary<EnemyPackRecipe, int> Rolls(WyrmrealmHabitat habitat, WyrmInfluenceBand? band, int seed = 5, int count = 600)
    {
        var random = new SeededRandomSource(seed);
        var counts = new Dictionary<EnemyPackRecipe, int>();
        for (var roll = 0; roll < count; roll++)
            if (EnemyPackRecipeCatalog.Choose(habitat, 60, random, band) is { } chosen) counts[chosen.Recipe] = counts.GetValueOrDefault(chosen.Recipe) + 1;
        return counts;
    }

    [TestMethod]
    public void NoBand_LeavesEveryHabitatWeightUntouched()
    {
        foreach (var habitat in Enum.GetValues<WyrmrealmHabitat>())
            foreach (var recipe in Enum.GetValues<EnemyPackRecipe>())
                Assert.AreEqual(EnemyPackRecipeCatalog.Weight(habitat, recipe), EnemyPackRecipeCatalog.Weight(habitat, recipe, null), $"{habitat}/{recipe}");
        Assert.AreEqual(EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.OpenField), EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.OpenField, null));
    }

    [TestMethod]
    public void Bands_ShiftWhichPacksTheOpenFieldFavours()
    {
        var wet = Rolls(WyrmrealmHabitat.OpenField, WyrmInfluenceBand.Natural);
        var scorched = Rolls(WyrmrealmHabitat.OpenField, WyrmInfluenceBand.Tainted);
        var burning = Rolls(WyrmrealmHabitat.OpenField, WyrmInfluenceBand.Ravaged);
        var volcanic = Rolls(WyrmrealmHabitat.OpenField, WyrmInfluenceBand.Domain);
        var priest = (Dictionary<EnemyPackRecipe, int> rolls) => rolls.GetValueOrDefault(EnemyPackRecipe.PriestWarband);
        var ashling = (Dictionary<EnemyPackRecipe, int> rolls) => rolls.GetValueOrDefault(EnemyPackRecipe.AshlingMob);
        Assert.IsGreaterThan(priest(wet), priest(burning), "burning land sends more priest warbands than wet land");
        Assert.IsGreaterThan(priest(burning), priest(volcanic) + 1, "volcanic land is almost only priests");
        Assert.IsGreaterThan(ashling(wet), ashling(scorched), "scorched land rushes with Ashlings");
        Assert.IsGreaterThan(volcanic.GetValueOrDefault(EnemyPackRecipe.HuntingPack) * 5, priest(volcanic), "hounds are rare at the Wyrm's door");
    }

    [TestMethod]
    public void Bands_NeverSummonAPackTheHabitatDoesNotHost()
    {
        foreach (var habitat in Enum.GetValues<WyrmrealmHabitat>())
            foreach (var band in Enum.GetValues<WyrmInfluenceBand>())
                foreach (var recipe in Enum.GetValues<EnemyPackRecipe>())
                    if (EnemyPackRecipeCatalog.Weight(habitat, recipe) == 0)
                        Assert.AreEqual(0, EnemyPackRecipeCatalog.Weight(habitat, recipe, band), $"{habitat}/{recipe}/{band}");
    }

    [TestMethod]
    public void FrostHabitatsIgnoreFireThemes()
    {
        foreach (var recipe in Enum.GetValues<EnemyPackRecipe>())
            Assert.AreEqual(EnemyPackRecipeCatalog.Weight(WyrmrealmHabitat.SnowboundPines, recipe), EnemyPackRecipeCatalog.Weight(WyrmrealmHabitat.SnowboundPines, recipe, WyrmInfluenceBand.Domain));
        Assert.AreEqual(EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.SnowboundPines), EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.SnowboundPines, WyrmInfluenceBand.Domain));
    }

    [TestMethod]
    public void TheSurgeSendsTheBandsPackWhereTheHabitatHostsIt()
    {
        Assert.AreEqual(EnemyPackRecipe.HuntingPack, EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.WetForest, WyrmInfluenceBand.Natural));
        Assert.AreEqual(EnemyPackRecipe.AshlingMob, EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.WetForest, WyrmInfluenceBand.Tainted));
        Assert.AreEqual(EnemyPackRecipe.PriestWarband, EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.OpenField, WyrmInfluenceBand.Ravaged));
        // The flooded cloister hosts Bastion but not priest warbands: its Ravaged surge keeps the habitat's own pack.
        Assert.AreEqual(EnemyPackRecipe.DrownedWatch, EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.FloodedCloister, WyrmInfluenceBand.Tainted));
        Assert.AreEqual(EnemyPackRecipe.Bastion, EnemyPackRecipeCatalog.SurgeEvent(WyrmrealmHabitat.MonasteryGrounds, WyrmInfluenceBand.Domain));
    }

    [TestMethod]
    [DataRow(0.1, WyrmInfluenceBand.Natural)]
    [DataRow(0.4, WyrmInfluenceBand.Tainted)]
    [DataRow(0.7, WyrmInfluenceBand.Ravaged)]
    [DataRow(0.95, WyrmInfluenceBand.Domain)]
    public void AHuntWithTerrainReadsItsBandFromTheWyrmInfluence_AndOneWithoutDoesNot(double influence, WyrmInfluenceBand expected)
    {
        foreach (var terrain in new[] { false, true })
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(42)).Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
            if (terrain) simulation.EnableHunt1Terrain(influence);
            Assert.IsTrue(simulation.ChoosePrimary(Wyrmforge.Domain.Spells.SpellId.FireBolt));
            simulation.Tick(0, default, 390, 700);
            Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
            var band = typeof(RunSimulation).GetField("encounterBand", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!.GetValue(simulation);
            if (terrain) Assert.AreEqual(expected, (WyrmInfluenceBand?)band);
            else Assert.IsNull(band, "without Hunt 1.0 terrain every encounter is exactly as before");
        }
    }

    [TestMethod]
    public void TheDirectorSendsTheBandsSurgePack()
    {
        var director = new EncounterDirector();
        director.Start(EnemyEncounterPattern.Swarm, 1, 2, WyrmrealmHabitat.WetForest, WyrmInfluenceBand.Tainted);
        director.RegisterProgress(5, 10);
        for (var step = 0; step < 4000 && director.Phase != EncounterPhase.Surge; step++)
        {
            director.Tick(0.1);
            director.RegisterProgress(Math.Min(10, 5 + step / 200), 10);
        }
        Assert.AreEqual(EncounterPhase.Surge, director.Phase);
        Assert.IsTrue(director.TryTakeRecipe(out var recipe));
        Assert.AreEqual(EnemyPackRecipe.AshlingMob, recipe);
    }

    [TestMethod]
    public void BudgetGrowsWithTheWyrmsGrip()
    {
        var budgets = Enum.GetValues<WyrmInfluenceBand>().Select(WyrmInfluencePacks.BudgetMultiplier).ToArray();
        CollectionAssert.AreEqual(budgets.OrderBy(value => value).ToArray(), budgets);
        Assert.AreEqual(1.0, budgets[0]);
    }
}
