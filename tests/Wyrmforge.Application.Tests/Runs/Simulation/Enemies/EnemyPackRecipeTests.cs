using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Enemies;

[TestClass]
public sealed class EnemyPackRecipeTests
{
    [TestMethod]
    [DataRow(4)]
    [DataRow(11)]
    [DataRow(23)]
    public void Build_AlwaysFitsTheBudgetAndOnlyUsesTheHabitatsResidents(int seed)
    {
        var random = new SeededRandomSource(seed);
        foreach (var habitat in Enum.GetValues<WyrmrealmHabitat>())
        {
            foreach (var recipe in Enum.GetValues<EnemyPackRecipe>())
            {
                for (var budget = 4; budget <= 40; budget += 6)
                {
                    if (EnemyPackRecipeCatalog.Build(recipe, habitat, budget, random) is not { } members) continue;
                    Assert.IsLessThanOrEqualTo(budget, members.Sum(kind => EnemyCatalog.Get(kind).ThreatCost), $"{habitat}/{recipe}");
                    Assert.IsTrue(members.All(kind => EnemyHabitatProfile.Allows(habitat, kind)), $"{habitat}/{recipe} imported a stranger");
                }
            }
        }
    }

    [TestMethod]
    public void Build_PriestComesAfterItsPack_AndWraithsAreStaggered()
    {
        var random = new SeededRandomSource(7);
        for (var roll = 0; roll < 40; roll++)
        {
            var warband = EnemyPackRecipeCatalog.Build(EnemyPackRecipe.PriestWarband, WyrmrealmHabitat.OpenField, 40, random)!;
            Assert.IsGreaterThanOrEqualTo(5, warband.TakeWhile(kind => kind != EnemyKind.AshPriest).Count(kind => kind == EnemyKind.Ashling));

            var watch = EnemyPackRecipeCatalog.Build(EnemyPackRecipe.DrownedWatch, WyrmrealmHabitat.FloodedCloister, 40, random)!;
            Assert.AreNotEqual(EnemyKind.DrownedWraith, watch[0], "Hollows lead; the wraith ambushes into them.");
            for (var index = 1; index < watch.Count; index++)
                Assert.IsFalse(watch[index] == EnemyKind.DrownedWraith && watch[index - 1] == EnemyKind.DrownedWraith, "Wraiths surface one at a time.");
        }
    }

    [TestMethod]
    public void Build_RefusesUnaffordableOrForeignPacks()
    {
        var random = new SeededRandomSource(1);
        Assert.IsNull(EnemyPackRecipeCatalog.Build(EnemyPackRecipe.LastStand, WyrmrealmHabitat.Lair, 6, random));
        Assert.IsNull(EnemyPackRecipeCatalog.Build(EnemyPackRecipe.DrownedWatch, WyrmrealmHabitat.Outskirts, 40, random));
    }

    [TestMethod]
    public void Choose_IsDeterministicAndLeansOnHabitatIdentity()
    {
        var first = Rolls(WyrmrealmHabitat.FloodedCloister, 99);
        CollectionAssert.AreEqual(first, Rolls(WyrmrealmHabitat.FloodedCloister, 99));
        Assert.IsGreaterThan(first.Count / 2, first.Count(recipe => recipe == EnemyPackRecipe.DrownedWatch), "The cloister is the wraiths' home.");
        Assert.IsTrue(Rolls(WyrmrealmHabitat.WetForest, 5).Contains(EnemyPackRecipe.HuntingPack));
        Assert.IsTrue(Rolls(WyrmrealmHabitat.Outskirts, 5).All(recipe => recipe == EnemyPackRecipe.WanderingDead), "The tutorial stays simple.");
    }

    [TestMethod]
    public void HabitatPlan_StartsWithItsPackThenFills()
    {
        var plan = EnemyEncounterComposition.CreatePlan(EnemyEncounterPattern.Mixed, 2, new SeededRandomSource(3), 1.6, WyrmrealmHabitat.FloodedCloister);
        Assert.IsNotNull(plan.Recipe);
        Assert.IsTrue(plan.Enemies.All(kind => EnemyHabitatProfile.Allows(WyrmrealmHabitat.FloodedCloister, kind)));
    }

    private static List<EnemyPackRecipe> Rolls(WyrmrealmHabitat habitat, int seed)
    {
        var random = new SeededRandomSource(seed);
        return Enumerable.Range(0, 40).Select(_ => EnemyPackRecipeCatalog.Choose(habitat, 30, random)!.Value.Recipe).ToList();
    }
}
