using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Player;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class OpeningRecoveryProfileTests
{
    [TestMethod]
    public void HealthCacheFraction_OnlyUninvestedOpeningDepthReceivesExtraRecovery()
    {
        Assert.AreEqual(0.12, OpeningRecoveryProfile.HealthCacheFraction(1), .001);
        Assert.AreEqual(0.08, OpeningRecoveryProfile.HealthCacheFraction(2), .001);
        Assert.AreEqual(0.08, OpeningRecoveryProfile.HealthCacheFraction(6), .001);
    }

    [TestMethod]
    public void CollectEnvironmentSupplies_OpenCache_HealsOnlyWhenPhysicallyCollected()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.First(node => node.Type == WyrmrealmNodeType.Combat).Id));
        var arena = Field<ArenaEnvironmentState>(simulation, "arenaEnvironment");
        var player = Field<PlayerState>(simulation, "player");
        player.Health = 40;
        arena.SetPhase(EncounterPhase.Surge);
        var cache = arena.Snapshot().Supplies.Single(supply => supply.Kind == "health");

        InvokeCollect(simulation);
        Assert.AreEqual(40, player.Health, .001, "A sealed or distant cache must never heal remotely.");

        player.Position = new(cache.X * 950, cache.Y * 1550);
        InvokeCollect(simulation);
        Assert.AreEqual(52, player.Health, .001);
        Assert.IsFalse(arena.Snapshot().Supplies.Any(supply => supply.Kind == "health"));
        InvokeCollect(simulation);
        Assert.AreEqual(52, player.Health, .001, "The physical cache can be collected only once.");
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void InvokeCollect(RunSimulation simulation) =>
        typeof(RunSimulation).GetMethod("CollectEnvironmentSupplies", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, [950d, 1550d]);
}
