using System.Reflection;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Depth;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class LaboratoryMutationSimulationTests
{
    private const int Seed = 1204;

    [TestMethod]
    public void ChoosePrimary_FireBoltWithRimeInfusion_RealizesFrostfireOnOnePrimaryCast()
    {
        var simulation = Create(LaboratoryMutationId.RimeInfusion);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        var build = Build(simulation);

        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, simulation.ActiveLaboratoryMutation);
        Assert.AreEqual(SpellId.FireBolt, build.Spells.ActiveSpell);
        Assert.IsTrue(build.Synergies.Contains(SynergyId.Frostfire));
        Assert.AreEqual(1, build.Synergies.Count);

        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.AreEqual(1, Projectiles(simulation).Count, "A mutation changes the cast; it never adds an attack stream.");
        Assert.AreEqual(SpellId.FireBolt, Projectiles(simulation)[0].Spell);
        Assert.AreEqual(SynergyId.Frostfire, simulation.CreateSnapshot().Projectiles.Single().Combination);

        var enemy = Enemy(simulation);
        Projectiles(simulation)[0].Position = enemy.Position;
        Invoke(simulation, "ResolveProjectileHits");
        Assert.IsTrue(enemy.Statuses.Has(CombatStatusId.Frozen));
        Assert.IsTrue(enemy.Statuses.Has(CombatStatusId.Burning));
    }

    [TestMethod]
    public void LevelChoices_AfterMutation_NeverOfferLegacyFrostfireButKeepPrimaryRanks()
    {
        var simulation = Create(LaboratoryMutationId.RimeInfusion);
        simulation.ChoosePrimary(SpellId.FireBolt);
        var build = Build(simulation);
        var service = new LevelChoiceService(new FirstRandomSource());

        var choices = service.Roll(build, count: 50);
        Assert.IsFalse(choices.Any(choice => choice.Id == "synergy:Frostfire"), "The legacy synergy must not stack on the researched one.");
        Assert.IsTrue(choices.Any(choice => choice.Id == "spell:FireBolt"), "Rank and milestone progression stays intact.");
        Assert.IsFalse(build.Synergies.Select(SynergyId.Frostfire, build.Spells));
        var interactions = (System.Collections.ICollection)Invoke(simulation, "ResolveStatusInteractions", SpellId.FireBolt, FrozenEnemy(simulation))!;
        Assert.AreEqual(1, interactions.Count, "Exactly one Frozen shatter rule applies; no legacy duplicate.");
    }

    [TestMethod]
    [DataRow(SpellId.FrostShard)]
    [DataRow(SpellId.ArcaneOrb)]
    [DataRow(SpellId.ChainLightning)]
    public void ChoosePrimary_OtherFoundation_LeavesMutationDormant(SpellId primary)
    {
        var simulation = Create(LaboratoryMutationId.RimeInfusion);
        Assert.IsTrue(simulation.ChoosePrimary(primary));
        Assert.IsNull(simulation.ActiveLaboratoryMutation);
        Assert.AreEqual(0, Build(simulation).Synergies.Count);
        Assert.AreEqual(1, Build(simulation).Spells.LearnedCount);
        Assert.IsNull(simulation.CreateSummary().PreparedMutation);
    }

    [TestMethod]
    public void ChoosePrimary_FireBoltWithoutMutation_IsUnchanged()
    {
        var simulation = Create(null);
        simulation.ChoosePrimary(SpellId.FireBolt);
        Assert.IsNull(simulation.ActiveLaboratoryMutation);
        Assert.AreEqual(0, Build(simulation).Synergies.Count);
        Assert.AreEqual(0, Build(simulation).Spells[SpellId.FrostShard]);
    }

    [TestMethod]
    public void Mutation_AppliesItsPrototypeDamageTradeOffAgainstTheLegacyFrostfirePath()
    {
        var mutated = Create(LaboratoryMutationId.RimeInfusion);
        mutated.ChoosePrimary(SpellId.FireBolt);

        var legacy = Create(null);
        legacy.ChoosePrimary(SpellId.FireBolt);
        var build = Build(legacy);
        build.Spells.LearnOrUpgrade(SpellId.FrostShard);
        Assert.IsTrue(build.Synergies.Select(SynergyId.Frostfire, build.Spells));
        Invoke(legacy, "RefreshBuildModifiers", false);

        Invoke(mutated, "UpdateSpellcasting", 0d, false);
        Invoke(legacy, "UpdateSpellcasting", 0d, false);
        var ratio = Projectiles(mutated)[0].Damage / Projectiles(legacy)[0].Damage;
        Assert.AreEqual(1 + LaboratoryCatalog.RimeInfusionDamageTradeOff, ratio, 1e-9);
    }

    [TestMethod]
    public void ChoosePrimary_ArcaneOrbWithStormInfusion_RealizesArcaneConduitOnOnePrimaryCast()
    {
        var simulation = Create(LaboratoryMutationId.StormInfusion);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.ArcaneOrb));
        var build = Build(simulation);

        Assert.AreEqual(LaboratoryMutationId.StormInfusion, simulation.ActiveLaboratoryMutation);
        Assert.AreEqual(SpellId.ArcaneOrb, build.Spells.ActiveSpell);
        Assert.IsTrue(build.Synergies.Contains(SynergyId.ArcaneConduit));
        Assert.AreEqual(1, build.Synergies.Count);
        Invoke(simulation, "UpdateSpellcasting", 0d, false);
        Assert.AreEqual(1, Projectiles(simulation).Count, "A mutation changes the cast; it never adds an attack stream.");
        Assert.AreEqual(SpellId.ArcaneOrb, Projectiles(simulation)[0].Spell);
    }

    [TestMethod]
    public void LevelChoices_AfterStormInfusion_NeverOfferLegacyArcaneConduit()
    {
        var simulation = Create(LaboratoryMutationId.StormInfusion);
        simulation.ChoosePrimary(SpellId.ArcaneOrb);
        var build = Build(simulation);
        var choices = new LevelChoiceService(new FirstRandomSource()).Roll(build, count: 50);
        Assert.IsFalse(choices.Any(choice => choice.Id == "synergy:ArcaneConduit"), "The legacy synergy must not stack on the researched one.");
        Assert.IsTrue(choices.Any(choice => choice.Id == "spell:ArcaneOrb"));
        Assert.IsFalse(build.Synergies.Select(SynergyId.ArcaneConduit, build.Spells));
    }

    [TestMethod]
    [DataRow(SpellId.FireBolt)]
    [DataRow(SpellId.FrostShard)]
    [DataRow(SpellId.ChainLightning)]
    public void ChoosePrimary_OtherFoundation_LeavesStormInfusionDormant(SpellId primary)
    {
        var simulation = Create(LaboratoryMutationId.StormInfusion);
        Assert.IsTrue(simulation.ChoosePrimary(primary));
        Assert.IsNull(simulation.ActiveLaboratoryMutation);
        Assert.AreEqual(0, Build(simulation).Synergies.Count);
    }

    [TestMethod]
    public void StormInfusion_AppliesItsCastIntervalTradeOffAgainstTheLegacyConduitPath()
    {
        var mutated = Create(LaboratoryMutationId.StormInfusion);
        mutated.ChoosePrimary(SpellId.ArcaneOrb);

        var legacy = Create(null);
        legacy.ChoosePrimary(SpellId.ArcaneOrb);
        var build = Build(legacy);
        build.Spells.LearnOrUpgrade(SpellId.ChainLightning);
        Assert.IsTrue(build.Synergies.Select(SynergyId.ArcaneConduit, build.Spells));
        Invoke(legacy, "RefreshBuildModifiers", false);

        Invoke(mutated, "UpdateSpellcasting", 0d, false);
        Invoke(legacy, "UpdateSpellcasting", 0d, false);
        var ratio = Cooldowns(mutated)[SpellId.ArcaneOrb] / Cooldowns(legacy)[SpellId.ArcaneOrb];
        Assert.AreEqual(1 + LaboratoryCatalog.StormInfusionCastIntervalTradeOff, ratio, 1e-9);
    }

    [TestMethod]
    public void RealHunt_StormInfusion_DischargesDeterministicallyWithOnePrimary()
    {
        var first = Hunt(LaboratoryMutationId.StormInfusion, SpellSchool.Arcane);
        var second = Hunt(LaboratoryMutationId.StormInfusion, SpellSchool.Arcane);

        Assert.AreEqual(LaboratoryMutationId.StormInfusion, first.Summary.PreparedMutation);
        Assert.IsTrue(first.Summary.ReactionsTriggered > 0, "Field test must observe Conduit discharges in a real hunt.");
        Assert.AreEqual(1, first.Metrics.PeakActivePrimaryCount);
        Assert.AreEqual(first.Summary.Score, second.Summary.Score);
        Assert.AreEqual(first.Summary.ReactionsTriggered, second.Summary.ReactionsTriggered);
    }

    [TestMethod]
    public void ResearchLead_DecidesTheAttractedWyrm()
    {
        foreach (var wyrm in new[] { DragonId.Rimeclaw, DragonId.Stormcoil })
        {
            var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: Seed, researchLead: wyrm);
            Invoke(simulation, "ResolveDragonAttraction");
            Assert.AreEqual(wyrm, simulation.AttractedDragon);
        }
    }

    [TestMethod]
    public void ResearchLead_IsIgnoredDuringTheFirstHunt()
    {
        DragonId? Attract(DragonId? lead)
        {
            var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: Seed, firstHunt: true, researchLead: lead);
            Invoke(simulation, "ResolveDragonAttraction");
            return simulation.AttractedDragon;
        }
        var baseline = Attract(null);
        var lead = Enum.GetValues<DragonId>().First(wyrm => wyrm != baseline);
        Assert.AreEqual(baseline, Attract(lead));
    }

    [TestMethod]
    public void ResearchLead_NeverOverridesADueAscendantRite()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: Seed, ascendantWyrm: DragonId.Ashfang, researchLead: DragonId.Rimeclaw);
        Assert.IsTrue(Field<RunDepthState>(simulation, "depthState").PushDeeper());
        Invoke(simulation, "ResolveDragonAttraction");
        Assert.AreEqual(DragonId.Ashfang, simulation.AttractedDragon);
    }

    [TestMethod]
    public void PrepareLaboratoryMutation_AfterCommit_IsIgnored()
    {
        var simulation = Create(null);
        simulation.ChoosePrimary(SpellId.FireBolt);
        simulation.PrepareLaboratoryMutation(LaboratoryMutationId.RimeInfusion);
        Assert.IsNull(simulation.PreparedLaboratoryMutation);
    }

    [TestMethod]
    public void RealHunt_RimeInfusion_TriggersReactionsDeterministicallyWithOnePrimary()
    {
        var first = Hunt(LaboratoryMutationId.RimeInfusion);
        var second = Hunt(LaboratoryMutationId.RimeInfusion);

        Assert.AreEqual(LaboratoryMutationId.RimeInfusion, first.Summary.PreparedMutation);
        Assert.IsTrue(first.Summary.ReactionsTriggered > 0, "Field test must observe Frostfire shatters in a real hunt.");
        Assert.AreEqual(1, first.Metrics.PeakActivePrimaryCount);
        Assert.AreEqual(0, first.Metrics.PrimarySwitches);
        Assert.AreEqual(first.Summary.Score, second.Summary.Score);
        Assert.AreEqual(first.Summary.ReactionsTriggered, second.Summary.ReactionsTriggered);
        Assert.AreEqual(first.Summary.Kills, second.Summary.Kills);
    }

    private static (RunSelfPlayMetrics Metrics, Wyrmforge.Application.Runs.EndRun.RunSummary Summary) Hunt(LaboratoryMutationId? mutation, SpellSchool school = SpellSchool.Fire)
    {
        var build = SelfPlayBuildCatalog.All.First(candidate => candidate.PreferredSchool == school);
        var simulation = new RunSimulationFactory(new SeededRandomSource(1)).Create(build.SelectedNodes, seed: Seed, preparedMutation: mutation);
        var agent = new HeuristicRunAgent(RunAgentPersonality.BuildFocused, Seed, build.PreferredSchool);
        var metrics = new RunSelfPlayDriver().Play(build, Seed, simulation, agent, new RunSelfPlayOptions(MaximumSimulatedSeconds: 120));
        return (metrics, simulation.CreateSummary());
    }

    private static RunSimulation Create(LaboratoryMutationId? mutation)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: Seed, preparedMutation: mutation);
        Field<List<EnemyState>>(simulation, "enemies").Add(new EnemyState(999, new Vector2D(80, 80), 10, 100000, 0));
        Invoke(simulation, "RebuildCombatSpatialIndex");
        return simulation;
    }

    private static EnemyState FrozenEnemy(RunSimulation simulation)
    {
        var enemy = Enemy(simulation);
        enemy.Statuses.Apply(CombatStatusCatalog.Get(CombatStatusId.Frozen), 3);
        return enemy;
    }

    private static RunBuildState Build(RunSimulation simulation) => Field<RunBuildState>(simulation, "build");
    private static EnemyState Enemy(RunSimulation simulation) => Field<List<EnemyState>>(simulation, "enemies").Single(enemy => enemy.Id == 999);
    private static Dictionary<SpellId, double> Cooldowns(RunSimulation simulation) => Field<Dictionary<SpellId, double>>(simulation, "spellCooldowns");
    private static List<ProjectileState> Projectiles(RunSimulation simulation) => Field<List<ProjectileState>>(simulation, "projectiles");
    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;
    private static object? Invoke(RunSimulation simulation, string name, params object?[] arguments) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, arguments);
}
