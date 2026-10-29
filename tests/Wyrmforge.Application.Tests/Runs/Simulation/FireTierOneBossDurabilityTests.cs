using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class FireTierOneBossDurabilityTests
{
    [TestMethod]
    public void Ashfang_FireTierOne_HasLongerHealthPoolWithoutBuffingOtherTiersOrDamage()
    {
        var tierOne = SpawnAshfang(HuntSelection.FireTierOne);
        var tierTwo = SpawnAshfang(HuntSelection.FireTierTwo);
        var tierThree = SpawnAshfang(HuntSelection.FireTierThree);

        Assert.AreEqual(DragonCatalog.Ashfang.MaxHealth * RunSimulation.FireTierOneAshfangDurability, tierOne.MaxHealth, 1e-9);
        Assert.AreEqual(DragonCatalog.Ashfang.MaxHealth * 1.35, tierTwo.MaxHealth, 1e-9, "Ascendant health scaling must not change.");
        Assert.AreEqual(DragonCatalog.Ashfang.MaxHealth * 1.75, tierThree.MaxHealth, 1e-9, "Elder health scaling must not change.");
        Assert.AreEqual(DragonCatalog.Ashfang.Speed, tierOne.Speed, 1e-9);
        Assert.AreEqual(38d, tierOne.Definition.Combat.Attack.Damage.PhaseOne, 1e-9);
        Assert.AreEqual(50d, tierOne.Definition.Combat.Attack.Damage.PhaseTwo, 1e-9);
    }

    [TestMethod]
    public void BellWarden_FireTierOne_SurvivesLongerAndStillCracksAtHalfHealth()
    {
        var (simulation, warden) = SpawnBellWarden();
        var definition = EnemyCatalog.Get(EnemyKind.BellWarden);
        var unmodified = ((double Health, double Speed))typeof(RunSimulation)
            .GetMethod("EnemyStats", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, [definition])!;

        Assert.AreEqual(unmodified.Health * RunSimulation.FireTierOneBellWardenDurability, warden.MaxHealth, 1e-9);
        Assert.AreEqual(unmodified.Speed, warden.Speed, 1e-9);
        Assert.AreEqual(26d, RunSimulation.BellSmashDamage, 1e-9);
        Assert.AreEqual(15d, RunSimulation.BellTollDamage, 1e-9);

        typeof(RunSimulation).GetMethod("DamageTarget", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, [warden, warden.MaxHealth * 5, null, null]);
        Assert.AreEqual(warden.MaxHealth * 0.5, warden.Health, 1e-9, "Burst damage must not skip the crack phase.");
        Assert.AreEqual(BellWardenPhase.Crack, warden.BellWarden!.Phase);
    }

    private static DragonState SpawnAshfang(HuntSelection hunt)
    {
        var simulation = Create(hunt);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        typeof(RunSimulation).GetMethod("SpawnDragon", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(simulation, [DragonCatalog.Ashfang, 390d, 700d]);
        return Field<DragonState>(simulation, "dragon");
    }

    private static (RunSimulation Simulation, EnemyState Warden) SpawnBellWarden()
    {
        var simulation = Create(HuntSelection.FireTierOne);
        var map = Field<WyrmrealmMapState>(simulation, "mapState");
        while (!simulation.AvailableMapNodes.Any(node => node.PreLair))
        {
            var road = simulation.AvailableMapNodes.Where(node => node.Type == WyrmrealmNodeType.Combat).OrderBy(node => node.Id).First();
            Assert.IsTrue(simulation.ChooseMapNode(road.Id));
            for (var kill = map.CurrentNodeKills; kill < map.CurrentNodeKillsRequired; kill++) map.RegisterKill();
        }

        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes.Single(node => node.PreLair).Id));
        simulation.Tick(0, default, 390, 700);
        for (var frame = 0; frame < 120 && simulation.BellWardenStage != BellWardenStage.Fight; frame++)
            typeof(RunSimulation).GetMethod("UpdateSpawn", BindingFlags.Instance | BindingFlags.NonPublic)!
                .Invoke(simulation, [0.05d, 390d, 700d]);

        Assert.AreEqual(BellWardenStage.Fight, simulation.BellWardenStage);
        var warden = Field<List<EnemyState>>(simulation, "enemies").Single(enemy => enemy.Kind == EnemyKind.BellWarden);
        return (simulation, warden);
    }

    private static RunSimulation Create(HuntSelection hunt)
    {
        var random = new FirstRandomSource();
        return new RunSimulationFactory(random).Create(new HashSet<string>(), seed: 42, hunt: hunt);
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
}
