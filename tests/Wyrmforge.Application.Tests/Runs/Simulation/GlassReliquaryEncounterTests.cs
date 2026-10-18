using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Combat.Statuses;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class GlassReliquaryEncounterTests
{
    private static readonly WyrmrealmHabitat[] FrostShrines = [WyrmrealmHabitat.MirrorMere, WyrmrealmHabitat.CairnBarrows, WyrmrealmHabitat.BuriedHamlet];

    [TestMethod]
    public void FrostRoads_RaiseTheReliquaryOfGlass_OnlyAtTheShrines()
    {
        var met = 0;
        for (var seed = 1; seed <= 300; seed++)
        {
            var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, region: RegionCatalog.FrostRegionId);
            for (var stage = 1; stage <= WyrmrealmMapState.CombatStages; stage++)
            {
                foreach (var node in simulation.MapNodes.Where(candidate => candidate.Stage == stage && candidate.Type == WyrmrealmNodeType.Combat))
                {
                    Invoke(simulation, "PrepareReliquaryNode", node);
                    if (simulation.ReliquaryStage != ReliquaryStage.Waiting) continue;
                    Assert.AreEqual(EnemyKind.ReliquaryOfGlass, simulation.ReliquaryKind);
                    CollectionAssert.Contains(FrostShrines, node.Habitat);
                    met++;
                    Invoke(simulation, "ClearReliquaryState");
                }
            }
        }
        Assert.IsGreaterThan(0, met, "Some Frost hunts carry the Reliquary of Glass.");
        Assert.IsTrue(RegionCatalog.Get(RegionCatalog.FrostRegionId).Roster.Contains(EnemyKind.ReliquaryOfGlass));
    }

    [TestMethod]
    public void CrystalWard_ShieldsTheCaster_ItsTetherCutsTheHunter_AndItPaysNothing()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Freeze(boss);
        Invoke(simulation, "RaiseCrystalWard", boss);
        var ward = enemies.Single(enemy => enemy.Kind == EnemyKind.CrystalWard);
        Assert.IsTrue(simulation.CreateSnapshot().Reliquary!.Warded);
        Assert.AreEqual("glass", simulation.CreateSnapshot().Reliquary!.Variant);

        var health = boss.Health;
        Invoke(simulation, "DamageTarget", boss, 10d, null, null);
        Assert.AreEqual(health - 10 * RunSimulation.GlassWardedDamageMultiplier, boss.Health, 0.001);

        var tether = simulation.CreateSnapshot().GlassTethers.Single();
        Assert.IsLessThan(1d, tether.Lit, "A new tether kindles before it burns.");
        player.Position = new Vector2D(-400, -400);
        for (var step = 0; step < 30; step++) HazardStep(simulation, 0.05);
        Assert.AreEqual(1d, simulation.CreateSnapshot().GlassTethers.Single().Lit);

        player.Position = (ward.Position + boss.Position) * 0.5;
        player.Health = player.MaxHealth;
        HazardStep(simulation, 0.05);
        Assert.AreEqual(player.MaxHealth - RunSimulation.GlassTetherDamage, player.Health, 0.001);
        Assert.IsGreaterThan(0, player.Chill.Stacks);
        HazardStep(simulation, 0.05);
        Assert.AreEqual(player.MaxHealth - RunSimulation.GlassTetherDamage, player.Health, 0.001, "One cut per crossing, not a grind.");

        var shards = Field<ExperienceShardField>(simulation, "experienceShards").TotalValue;
        var kills = simulation.CreateSummary().Kills;
        Kill(simulation, ward);
        Assert.AreEqual(shards, Field<ExperienceShardField>(simulation, "experienceShards").TotalValue);
        Assert.AreEqual(kills, simulation.CreateSummary().Kills);
        Assert.IsFalse(simulation.CreateSummary().EnemyRecords.Any(record => record.Kind == EnemyKind.CrystalWard));
        Assert.IsEmpty(simulation.CreateSnapshot().GlassTethers);
        health = boss.Health;
        Invoke(simulation, "DamageTarget", boss, 10d, null, null);
        Assert.AreEqual(health - 10, boss.Health, 0.001, "Breaking the ward drops the shield.");
    }

    [TestMethod]
    public void RefractionVeil_HidesItAmongFalseForms_AndStrikingTheTrueBodyBreaksIt()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Veil(simulation, player, boss);
        var forms = enemies.Where(enemy => enemy.Kind == EnemyKind.GlassFalseForm && enemy.Health > 0).ToArray();
        Assert.HasCount(2, forms);
        var snapshot = simulation.CreateSnapshot();
        Assert.IsTrue(snapshot.Reliquary!.Veiled);
        var bossOpacity = snapshot.Enemies.Single(enemy => enemy.EntityId == boss.Id).Opacity;
        Assert.IsTrue(forms.All(form => snapshot.Enemies.Single(enemy => enemy.EntityId == form.Id).Opacity == bossOpacity),
            "Only the lanterns tell the true body apart, never its opacity.");
        Assert.AreEqual(0, Property<int>(simulation, "HostileCount"), "False forms never hold the road open.");

        var shards = Field<ExperienceShardField>(simulation, "experienceShards").TotalValue;
        var kills = simulation.CreateSummary().Kills;
        Kill(simulation, forms[0]);
        Assert.AreEqual(shards, Field<ExperienceShardField>(simulation, "experienceShards").TotalValue);
        Assert.AreEqual(kills, simulation.CreateSummary().Kills);
        Assert.IsTrue(boss.GlassReliquary!.IsVeiled, "Breaking a false form does not lift the veil.");

        Invoke(simulation, "DamageTarget", boss, 1d, null, null);
        Assert.IsFalse(boss.GlassReliquary.IsVeiled);
        Assert.IsTrue(boss.GlassReliquary.Exposed);
        Assert.AreEqual(1, simulation.GlassVeilsBroken);
        Assert.AreEqual(0d, forms[1].Health, "Every false form breaks with the veil.");
        Assert.AreEqual("glass-exposed", simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == boss.Id).Telegraph!.Kind);
    }

    [TestMethod]
    public void FalseFormsLeftStanding_CloseAPrisonEach_WhenTheVeilFades()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Veil(simulation, player, boss);
        var before = simulation.GlassPrisonsRaised;
        var prisons = simulation.CreateSnapshot().GlassPrisons.Count;
        Invoke(simulation, "FadeRefractionVeil");
        Assert.AreEqual(before + 2, simulation.GlassPrisonsRaised);
        Assert.HasCount(prisons + 2, simulation.CreateSnapshot().GlassPrisons);
        Assert.IsTrue(enemies.Where(enemy => enemy.Kind == EnemyKind.GlassFalseForm).All(form => form.Health <= 0));
    }

    [TestMethod]
    public void GlacialPrison_RisesAroundTheHunter_AndItsWallCostsAHitToCross()
    {
        var (simulation, player, enemies) = Encounter();
        Duel(simulation, player, enemies);
        Invoke(simulation, "AddGlassPrison", player.Position);
        var prison = simulation.CreateSnapshot().GlassPrisons.Single();
        Assert.IsFalse(prison.Risen);
        for (var time = 0d; time < RunSimulation.GlassPrisonRiseSeconds + 0.05; time += 0.05) HazardStep(simulation, 0.05);
        prison = simulation.CreateSnapshot().GlassPrisons.Single();
        Assert.IsTrue(prison.Risen);
        Assert.IsTrue(prison.Trapped);
        Assert.AreEqual(player.MaxHealth, player.Health, "Rising traps, it does not strike.");
        Assert.IsGreaterThan(0, player.Chill.Stacks);

        player.Position += new Vector2D(RunSimulation.GlassPrisonRadius + 20, 0);
        HazardStep(simulation, 0.05);
        Assert.AreEqual(player.MaxHealth - RunSimulation.GlassPrisonWallDamage, player.Health, 0.001);
        HazardStep(simulation, 0.05);
        Assert.AreEqual(player.MaxHealth - RunSimulation.GlassPrisonWallDamage, player.Health, 0.001, "Standing outside costs nothing more.");

        for (var time = 0d; time < RunSimulation.GlassPrisonStandSeconds + 0.1; time += 0.05) HazardStep(simulation, 0.05);
        Assert.IsEmpty(simulation.CreateSnapshot().GlassPrisons);
    }

    [TestMethod]
    public void EveryStandingWard_AddsACageLayer()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Invoke(simulation, "CastGlacialPrisons", boss);
        Assert.HasCount(1, simulation.CreateSnapshot().GlassPrisons);
        Invoke(simulation, "ClearGlassState");
        Invoke(simulation, "RaiseCrystalWard", boss);
        Invoke(simulation, "RaiseCrystalWard", boss);
        Invoke(simulation, "CastGlacialPrisons", boss);
        var prisons = simulation.CreateSnapshot().GlassPrisons;
        Assert.HasCount(3, prisons);
        Assert.IsTrue(prisons.Skip(1).All(cage => Vector2D.Distance(new Vector2D(cage.X, cage.Y), player.Position) > RunSimulation.GlassPrisonRadius),
            "The extra cages fence the hunter's retreat; only one closes on them.");
    }

    [TestMethod]
    public void HalfHealth_ShattersOnce_ThenRaisesWardsToTheCap_AndTheRitualStaysBounded()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        boss.Health = boss.MaxHealth * 0.49;
        Step(simulation, 0.05);
        Assert.AreEqual(1, simulation.ReliquaryShifts);
        Assert.AreEqual(ReliquaryPhase.Shift, boss.GlassReliquary!.Phase);
        Assert.AreEqual("glass-shatter", simulation.CreateSnapshot().Enemies.Single(enemy => enemy.EntityId == boss.Id).Telegraph!.Kind);
        for (var time = 0d; time < GlassReliquaryBehaviorState.ShatterSeconds + 0.1; time += 0.05) Step(simulation, 0.05);
        Assert.IsTrue(boss.GlassReliquary.Shifted);
        Assert.HasCount(RunSimulation.GlassMaxLiveWards, enemies.Where(enemy => enemy.Kind == EnemyKind.CrystalWard && enemy.Health > 0));

        var sawThreeForms = false;
        for (var time = 0d; time < 120; time += 0.05)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
            Assert.IsLessThanOrEqualTo(RunSimulation.GlassMaxLiveWards, enemies.Count(enemy => enemy.Kind == EnemyKind.CrystalWard && enemy.Health > 0));
            Assert.IsLessThanOrEqualTo(RunSimulation.GlassMaxPrisons, simulation.CreateSnapshot().GlassPrisons.Count);
            sawThreeForms |= enemies.Count(enemy => enemy.Kind == EnemyKind.GlassFalseForm && enemy.Health > 0) == 3;
            foreach (var ward in enemies.Where(enemy => enemy.Kind == EnemyKind.CrystalWard && enemy.Health > 0).ToArray()) Kill(simulation, ward);
            enemies.RemoveAll(enemy => enemy.Health <= 0);
        }
        Assert.IsTrue(sawThreeForms, "After the shatter the veil hides it among three forms.");
        Assert.AreEqual(RunSimulation.GlassMaxWardsPerFight, Field<int>(simulation, "crystalWardsRaised"));
    }

    [TestMethod]
    public void Defeat_PaysOnce_RecordsTheKill_AndEndsEveryRite()
    {
        var (simulation, player, enemies) = Encounter();
        var boss = Duel(simulation, player, enemies);
        Veil(simulation, player, boss);
        Invoke(simulation, "RaiseCrystalWard", boss);
        Invoke(simulation, "AddGlassPrison", player.Position);
        var shards = Field<ExperienceShardField>(simulation, "experienceShards");
        var before = shards.TotalValue;
        Kill(simulation, boss);
        Kill(simulation, boss);
        Assert.AreEqual(before + RunSimulation.ReliquaryExperience, shards.TotalValue);
        Assert.AreEqual(ReliquaryStage.Slain, simulation.ReliquaryStage);
        Assert.IsTrue(enemies.Where(enemy => enemy.Kind is EnemyKind.CrystalWard or EnemyKind.GlassFalseForm).All(rite => rite.Health <= 0));
        var snapshot = simulation.CreateSnapshot();
        Assert.IsEmpty(snapshot.GlassPrisons);
        Assert.IsEmpty(snapshot.GlassTethers);
        var summary = simulation.CreateSummary();
        Assert.IsTrue(summary.ReliquarySlain);
        Assert.AreEqual(1, summary.EnemyRecords.Single(record => record.Kind == EnemyKind.ReliquaryOfGlass).Kills);
        Assert.AreEqual(0, simulation.CurrentMapNodeKills, "It never counts toward clearing the road.");
    }

    private static void Veil(RunSimulation simulation, PlayerState player, EnemyState boss)
    {
        for (var step = 0; step < 800 && !boss.GlassReliquary!.IsVeiled; step++)
        {
            Step(simulation, 0.05);
            player.Health = player.MaxHealth;
        }
        Assert.IsTrue(boss.GlassReliquary!.IsVeiled);
    }

    private static EnemyState Duel(RunSimulation simulation, PlayerState player, List<EnemyState> enemies)
    {
        enemies.Clear();
        var definition = EnemyCatalog.Get(EnemyKind.ReliquaryOfGlass);
        var boss = new EnemyState(800, player.Position + new Vector2D(260, 0), definition.Radius, 400, 30, EnemyKind.ReliquaryOfGlass);
        enemies.Add(boss);
        SetField(simulation, "reliquary", boss);
        SetField(simulation, "reliquaryKind", EnemyKind.ReliquaryOfGlass);
        typeof(RunSimulation).GetProperty(nameof(RunSimulation.ReliquaryStage))!.SetValue(simulation, ReliquaryStage.Duel);
        return boss;
    }

    private static void Freeze(EnemyState enemy) => enemy.Statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 999);

    private static (RunSimulation Simulation, PlayerState Player, List<EnemyState> Enemies) Encounter()
    {
        const int seed = 31;
        var simulation = new RunSimulationFactory(new SeededRandomSource(seed)).Create(new HashSet<string>(), seed: seed, region: RegionCatalog.FrostRegionId);
        Assert.IsTrue(simulation.ChooseMapNode(simulation.AvailableMapNodes[0].Id));
        simulation.Tick(0, default, 390, 700);
        SetField(simulation, "entryGraceRemaining", 0d);
        var player = Field<PlayerState>(simulation, "player");
        player.Health = player.MaxHealth;
        return (simulation, player, Field<List<EnemyState>>(simulation, "enemies"));
    }

    private static void Step(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateEnemies", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static void HazardStep(RunSimulation simulation, double delta)
    {
        Invoke(simulation, "BeginPlayerDamageFrame", delta);
        Invoke(simulation, "UpdateGlassReliquaryHazards", delta);
        Invoke(simulation, "ResolvePlayerDamage");
    }

    private static void Kill(RunSimulation simulation, EnemyState enemy) =>
        Invoke(simulation, "DamageTarget", enemy, enemy.Health * 10 + 1, null, null);

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static T Property<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void SetField(RunSimulation simulation, string name, object value) =>
        typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(simulation, value);

    private static void Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
