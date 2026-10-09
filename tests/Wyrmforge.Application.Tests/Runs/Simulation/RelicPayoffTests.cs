using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.Relics;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RelicPayoffTests
{
    [TestMethod]
    public void DefeatBurst_BurningChain_ReportsActualDamageAndEachKillOnce()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        var first = AddEnemy(simulation, 1, 80, 10, CombatStatusId.Burning);
        AddEnemy(simulation, 2, 100, 10);
        AddEnemy(simulation, 3, 150, 10);
        AddEnemy(simulation, 4, 400, 100);

        Defeat(simulation, first);
        Invoke(simulation, "ResolveRelicDefeatBursts");
        Defeat(simulation, first);
        Invoke(simulation, "ResolveRelicDefeatBursts");

        var summary = simulation.CreateEvaluationSummary();
        var payoff = summary.RelicLoadout.Single();
        Assert.AreEqual(3, summary.Kills);
        Assert.AreEqual(3, payoff.Bursts);
        Assert.AreEqual(2, payoff.BurstKills);
        Assert.AreEqual(20d, payoff.BurstDamage, 0.001);
        Assert.AreEqual(100d, Field<List<EnemyState>>(simulation, "enemies")[3].Health);
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.Any(impact => impact.Spell == SpellId.FireBolt));
    }

    [TestMethod]
    [DataRow(CombatStatusId.Chilled)]
    [DataRow(CombatStatusId.Frozen)]
    public void DefeatBurst_FrostStatus_ShatterDamagesAndChillsNeighbours(CombatStatusId status)
    {
        var simulation = Create(RelicId.DuelistLens);
        var first = AddEnemy(simulation, 1, 80, 10, status);
        var neighbour = AddEnemy(simulation, 2, 100, 100);

        Defeat(simulation, first);
        Invoke(simulation, "ResolveRelicDefeatBursts");

        Assert.AreEqual(80.56d, neighbour.Health, 0.001);
        Assert.IsTrue(neighbour.Statuses.Has(CombatStatusId.Chilled));
        Assert.AreEqual(1, simulation.CreateEvaluationSummary().RelicLoadout.Single().Bursts);
        Assert.IsTrue(simulation.CreateSnapshot().ElementalImpacts.Any(impact => impact.Spell == SpellId.FrostShard));
    }

    [TestMethod]
    public void DefeatBurst_NonmatchingStatus_DoesNotTrigger()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        Defeat(simulation, AddEnemy(simulation, 1, 80, 10, CombatStatusId.Chilled));
        Invoke(simulation, "ResolveRelicDefeatBursts");
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().RelicLoadout.Single().Bursts);
    }

    [TestMethod]
    public void DefeatBurst_UnequippedRelic_DoesNotTrigger()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        Build(simulation).Relics.TryUnequip(RelicId.EmberheartCharm);
        Invoke(simulation, "RefreshRelicEffects", false);
        Defeat(simulation, AddEnemy(simulation, 1, 80, 10, CombatStatusId.Burning));
        Invoke(simulation, "ResolveRelicDefeatBursts");
        Assert.AreEqual(0, simulation.CreateEvaluationSummary().RelicLoadout.Single().Bursts);
    }

    [TestMethod]
    public void DefeatBurst_DenseChain_TerminatesWithoutDuplicateRewards()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        for (var id = 1; id <= 100; id++) AddEnemy(simulation, id, 80 + id % 10, 1);
        var first = Field<List<EnemyState>>(simulation, "enemies")[0];
        first.Statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Burning), 4);

        Defeat(simulation, first);
        Invoke(simulation, "ResolveRelicDefeatBursts");

        var summary = simulation.CreateEvaluationSummary();
        Assert.AreEqual(100, summary.Kills);
        Assert.AreEqual(100, summary.RelicLoadout.Single().Bursts);
        Assert.AreEqual(99d, summary.RelicLoadout.Single().BurstDamage, 0.001);
    }

    [TestMethod]
    public void DefeatBurst_ProtectedWyrm_DoesNotDamageBoss()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        var dragon = new DragonState(1000, DragonCatalog.Get(DragonId.Stormcoil), new Vector2D(100, 80));
        typeof(RunSimulation).GetField("dragon", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, dragon);
        var first = AddEnemy(simulation, 1, 80, 10, CombatStatusId.Burning);

        Defeat(simulation, first);
        Invoke(simulation, "ResolveRelicDefeatBursts");

        Assert.AreEqual(dragon.MaxHealth, dragon.Health);
        Assert.AreEqual(0d, simulation.CreateEvaluationSummary().RelicLoadout.Single().BurstDamage);
    }

    [TestMethod]
    public void DefeatBurst_MultipleQueuedBursts_StopsAtWyrmPhaseBreak()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        var dragon = new DragonState(1000, DragonCatalog.Get(DragonId.Stormcoil), new Vector2D(100, 80));
        dragon.Health = dragon.MaxHealth * 0.5 + 5;
        typeof(RunSimulation).GetField("dragon", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, dragon);
        var hunt = Field<DragonHuntState>(simulation, "dragonHuntState");
        hunt.Start(DragonHuntCatalog.Get(DragonId.Stormcoil));
        hunt.TickStage(100);
        var first = AddEnemy(simulation, 1, 80, 10, CombatStatusId.Burning);
        var second = AddEnemy(simulation, 2, 90, 10, CombatStatusId.Burning);
        Defeat(simulation, first);
        Defeat(simulation, second);

        Invoke(simulation, "ResolveRelicDefeatBursts");

        Assert.AreEqual(DragonHuntStage.PhaseBreak, hunt.Stage);
        Assert.AreEqual(dragon.MaxHealth * 0.5, dragon.Health, 0.001);
        Assert.AreEqual(5d, simulation.CreateEvaluationSummary().RelicLoadout.Single().BurstDamage, 0.001);
        Assert.AreEqual(1, dragon.Statuses.Stacks(CombatStatusId.Burning));
    }

    [TestMethod]
    public void CastChainSpell_FourDirectHits_TriggersEmberheartBurn()
    {
        var simulation = Create(RelicId.EmberheartCharm);
        var enemy = AddEnemy(simulation, 1, 80, 1000);
        var spell = SpellCatalog.Get(SpellId.ChainLightning);
        for (var cast = 0; cast < 4; cast++) Invoke(simulation, "CastSpell", spell, 1, 1d, false);
        Assert.IsTrue(enemy.Statuses.Has(CombatStatusId.Burning));
        Assert.AreEqual(4, Field<int>(simulation, "hitCount"));
    }

    [TestMethod]
    public void EquipRelic_VitalstoneSwappedRepeatedly_DoesNotFarmHealing()
    {
        var simulation = Create(RelicId.Vitalstone);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = 50;
        Field<RunCheckpointState>(simulation, "checkpointState").Enter();
        for (var swap = 0; swap < 3; swap++)
        {
            Assert.IsTrue(simulation.UnequipRelic(RelicId.Vitalstone));
            Assert.IsTrue(simulation.EquipRelic(RelicId.Vitalstone));
        }
        Assert.AreEqual(50d, player.Health);
        Assert.AreEqual(124d, player.MaxHealth);
    }

    private static RunSimulation Create(RelicId relic)
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        Build(simulation).Relics.Acquire(relic);
        Build(simulation).Relics.TryEquip(relic);
        Invoke(simulation, "RefreshRelicEffects", true);
        return simulation;
    }

    private static EnemyState AddEnemy(RunSimulation simulation, int id, double x, double health, CombatStatusId? status = null)
    {
        var enemy = new EnemyState(id, new Vector2D(x, 80), 10, health, 0);
        if (status is { } effect) enemy.Statuses.Apply(CombatStatusCatalog.Get(effect), 4);
        Field<List<EnemyState>>(simulation, "enemies").Add(enemy);
        Invoke(simulation, "RebuildCombatSpatialIndex");
        return enemy;
    }

    private static RunBuildState Build(RunSimulation simulation) => Field<RunBuildState>(simulation, "build");
    private static void Defeat(RunSimulation simulation, EnemyState enemy) => Invoke(simulation, "DamageTarget", enemy, 10000d, null, null);
    private static T Field<T>(RunSimulation simulation, string name) => (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) => typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
