using System.Reflection;
using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Extraction;
using Wyrmforge.Application.Runs.Hunts;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Player;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class FireTierOneHuntTests
{
    [TestMethod]
    public void ThousandSeeds_OfferOneCommittedForkThreeOrFourFightsAndReachableAshfang()
    {
        for (var seed = 0; seed < 1000; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireTierOne(seed);
            Assert.AreEqual(JsonSerializer.Serialize(nodes), JsonSerializer.Serialize(WyrmrealmMapGenerator.GenerateFireTierOne(seed)));
            Assert.AreEqual(nodes.Count, nodes.Select(n => n.Id).Distinct().Count());
            Assert.AreEqual(1, nodes.Count(n => n.PreviousNodeIds.Count == 0));
            Assert.AreEqual(1, nodes.Count(n => nodes.Count(next => next.PreviousNodeIds.Contains(n.Id)) > 1));
            var land = nodes[0].Territory!;
            Assert.AreEqual(2, land.Roads.Count);
            CollectionAssert.AreEquivalent(new[] { 1, 2 }, land.Roads.Select(r => r.Encounters).ToArray());
            var boss = nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(DragonCatalog.Get(DragonId.Ashfang).Name, boss.Name);
            var counts = new Dictionary<string, (int Min, int Max)>();
            foreach (var node in nodes.OrderByDescending(n => n.Site!.Point.Y))
            {
                var previous = node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)).ToArray();
                Assert.IsTrue(previous.All(p => p.Site!.Point.Y > node.Site!.Point.Y), $"seed {seed}: every edge leads forward");
                Assert.IsTrue(node == boss || nodes.Any(next => next.PreviousNodeIds.Contains(node.Id)));
                var cost = node.Type == WyrmrealmNodeType.Combat ? 1 : 0;
                counts[node.Id] = previous.Length == 0 ? (cost, cost)
                    : (cost + previous.Min(p => counts[p.Id].Min), cost + previous.Max(p => counts[p.Id].Max));
                if (node.Route is not null) Assert.AreEqual(SpellSchool.Fire, node.AttunementSchool);
                foreach (var parent in previous)
                {
                    if (parent.Site!.RoadId is not null && node.Site!.RoadId is not null)
                        Assert.AreEqual(parent.Site.RoadId, node.Site.RoadId, "A committed fork cannot collect the other road's reward.");
                    AssertDryEdge(parent.Site.Point, node.Site!.Point, land, seed);
                }
            }
            Assert.AreEqual((3, 4), counts[boss.Id]);
            Assert.AreEqual(1, nodes.Count(n => n.Site!.BonusRelic));
            Assert.IsNotNull(nodes.Single(n => n.Site!.BonusRelic).Route!.Reward.Relic);
            var bridge = land.Features.Single(f => f.Kind == "bridge");
            Assert.AreEqual(92d, bridge.Center.Y);
            Assert.AreEqual(WyrmrealmMapGenerator.RiverX(land.River, 92), bridge.Center.X, 1e-8);
        }
    }

    [TestMethod]
    public void SelectedHunt_OverridesResearchTargetAndKeepsLegacyFactorySeparate()
    {
        var factory = new RunSimulationFactory(new FirstRandomSource());
        var selected = factory.Create(new HashSet<string>(), seed: 42, researchLead: DragonId.Rimeclaw, hunt: HuntSelection.FireTierOne);
        Assert.AreEqual(DragonId.Ashfang, selected.HuntTarget);
        Assert.IsFalse(selected.CanPushDeeper);
        Assert.AreEqual(HuntSelection.FireTierOne, selected.CreateEvaluationSummary().Hunt);
        Assert.AreEqual(HuntSelection.FireTierOne, JsonSerializer.Deserialize<HuntSelection>(JsonSerializer.Serialize(HuntSelection.FireTierOne)));
        var legacy = factory.Create(new HashSet<string>(), seed: 42);
        Assert.IsNull(legacy.SelectedHunt);
        Assert.IsTrue(legacy.CanPushDeeper);
        Assert.IsTrue(legacy.MapNodes.Count > selected.MapNodes.Count);
        Assert.Throws<ArgumentException>(() => factory.Create(new HashSet<string>(), hunt: new(RegionCatalog.CinderFrontierId, WyrmTier.Divine)));
        Assert.Throws<ArgumentException>(() => factory.Create(new HashSet<string>(), hunt: new(RegionCatalog.FrostRegionId, WyrmTier.Wyrm)));
        Assert.Throws<ArgumentException>(() => factory.Create(new HashSet<string>(), hunt: HuntSelection.FireTierOne with { Version = 99 }));
        Assert.Throws<ArgumentException>(() => factory.Create(new HashSet<string>(), hunt: HuntSelection.FireTierOne, region: RegionCatalog.FrostRegionId));
        Assert.Throws<ArgumentException>(() => factory.Create(new HashSet<string>(), hunt: HuntSelection.FireTierOne, ascendantAshfang: true));
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public void TierOneVictory_RequiresHarvestAndExtractionEvenForFirstHunt(bool firstHunt)
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42, firstHunt: firstHunt, hunt: HuntSelection.FireTierOne);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Invoke(simulation, "SpawnDragon", DragonCatalog.Get(DragonId.Ashfang), 390d, 700d);
        Invoke(simulation, "DefeatDragon", Field<DragonState>(simulation, "dragon"));
        Assert.IsFalse(simulation.IsEnded);
        Assert.AreEqual(0, simulation.SecuredEssenceCount);
        CollectionAssert.AreEquivalent(
            Wyrmforge.Domain.Progression.DragonEssences.DragonEssenceCatalog.AshfangChoices.Select(c => c.Id).ToArray(),
            simulation.PendingDragonEssenceChoices.Select(c => c.Id).ToArray());
        var essence = simulation.PendingDragonEssenceChoices[0].Id;
        Assert.IsTrue(simulation.ApplyDragonEssence(essence));
        Assert.IsFalse(simulation.ApplyDragonEssence(essence));
        var ritual = Field<RunExtractionState>(simulation, "extractionState");
        for (var frame = 0; frame < 201; frame++)
        {
            Field<PlayerState>(simulation, "player").Health = simulation.MaxHealth;
            simulation.Tick(.05, default, 390, 700);
            while (simulation.PendingChoices.Count > 0)
                Assert.IsTrue(simulation.ApplyChoice(simulation.PendingChoices[0].Id));
        }
        Assert.IsFalse(ritual.IsActive);
        Assert.IsTrue(simulation.IsEnded);
        Assert.IsFalse(simulation.AtCheckpoint);
        Assert.IsFalse(simulation.PushDeeper());
        var summary = simulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Extracted, summary.Outcome);
        CollectionAssert.AreEqual(new[] { essence }, summary.EssenceIds.ToArray());
        Assert.AreEqual(1, simulation.ExtractionRitualsCompleted);
        simulation.Tick(.05, default, 390, 700);
        Assert.AreEqual(1, simulation.SecuredEssenceCount);
        Assert.AreEqual(1, simulation.ExtractionRitualsCompleted);
    }

    [TestMethod]
    public void DeathBeforeExtraction_LosesPendingEssenceAndDoesNotCompleteHunt()
    {
        var simulation = new RunSimulationFactory(new FirstRandomSource()).Create(new HashSet<string>(), seed: 42, hunt: HuntSelection.FireTierOne);
        Assert.IsTrue(simulation.ChoosePrimary(SpellId.FireBolt));
        simulation.Tick(0, default, 390, 700);
        Invoke(simulation, "SpawnDragon", DragonCatalog.Get(DragonId.Ashfang), 390d, 700d);
        Invoke(simulation, "DefeatDragon", Field<DragonState>(simulation, "dragon"));
        Assert.IsTrue(simulation.ApplyDragonEssence(simulation.PendingDragonEssenceChoices[0].Id));
        while (simulation.PendingChoices.Count > 0) simulation.ApplyChoice(simulation.PendingChoices[0].Id);
        Field<PlayerState>(simulation, "player").Health = 0;
        simulation.Tick(.05, default, 390, 700);
        var summary = simulation.CreateEvaluationSummary();
        Assert.AreEqual(RunOutcome.Defeated, summary.Outcome);
        Assert.AreEqual(0, summary.EssenceIds.Count);
    }

    private static void AssertDryEdge(HuntPoint start, HuntPoint end, WyrmrealmTerritory land, int seed)
    {
        for (var step = 0; step <= 40; step++)
        {
            var point = WyrmrealmMapGenerator.TrailPoint(start, end, step / 40d);
            Assert.IsTrue(Math.Abs(point.X - WyrmrealmMapGenerator.RiverX(land.River, point.Y)) > 3, $"seed {seed}: road crosses water");
            foreach (var hill in land.Features.Where(f => f.Kind is "mountain" or "forest" or "rocks"))
                Assert.IsTrue(Math.Pow((point.X - hill.Center.X) / hill.RadiusX, 2) + Math.Pow((point.Y - hill.Center.Y) / hill.RadiusY, 2) > 1,
                    $"seed {seed}: scenery blocks a graph edge");
        }
    }

    private static T Field<T>(RunSimulation simulation, string name) =>
        (T)typeof(RunSimulation).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(simulation)!;

    private static void Invoke(RunSimulation simulation, string name, params object[] args) =>
        typeof(RunSimulation).GetMethod(name, BindingFlags.Instance | BindingFlags.NonPublic)!.Invoke(simulation, args);
}
