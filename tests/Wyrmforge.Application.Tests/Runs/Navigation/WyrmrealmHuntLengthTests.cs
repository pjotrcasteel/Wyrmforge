using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Progression.Refinements;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmHuntLengthTests
{
    [TestMethod]
    public void EightHundredMaps_KeepDeterministicConnectedForwardRoutesWithinDepthBudgets()
    {
        foreach (var profile in WyrmrealmHuntLengthCatalog.All)
        foreach (var school in new[] { SpellSchool.Fire, SpellSchool.Frost })
        for (var seed = 0; seed < 100; seed++)
        {
            var nodes = WyrmrealmMapGenerator.Generate(profile.Depth, seed, school);
            var description = $"depth {profile.Depth}, {school}, seed {seed}";
            Assert.AreEqual(JsonSerializer.Serialize(nodes), JsonSerializer.Serialize(WyrmrealmMapGenerator.Generate(profile.Depth, seed, school)), description);
            var distances = new Dictionary<string, (int Min, int Max)>();
            foreach (var node in nodes.OrderByDescending(n => n.Site!.Point.Y))
            {
                var previous = node.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)).ToArray();
                Assert.IsTrue(previous.All(p => p.Site!.Point.Y > node.Site!.Point.Y), description);
                Assert.IsTrue(node.Type == WyrmrealmNodeType.Dragon || nodes.Any(next => next.PreviousNodeIds.Contains(node.Id)), description);
                var cost = node.Type == WyrmrealmNodeType.Combat ? 1 : 0;
                distances[node.Id] = previous.Length == 0 ? (cost, cost)
                    : (cost + previous.Min(p => distances[p.Id].Min), cost + previous.Max(p => distances[p.Id].Max));
            }
            var boss = nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(profile.MinimumCombatEncounters, distances[boss.Id].Min, description);
            Assert.IsTrue(distances[boss.Id].Max <= profile.MaximumCombatEncounters, description);
            Assert.IsTrue(distances[boss.Id].Max > distances[boss.Id].Min, description);
            foreach (var fork in nodes.Where(n => n.Site!.RoadId is null && nodes.Count(next => next.PreviousNodeIds.Contains(n.Id)) > 1))
            {
                var choices = nodes.Where(next => next.PreviousNodeIds.Contains(fork.Id)).ToArray();
                Assert.IsTrue(choices.Length >= 2 && choices.Length <= profile.MaximumRoadChoices, description);
                Assert.AreEqual(choices.Length, choices.Select(c => c.AttunementSchool).Distinct().Count(), description);
            }
            var roadNodes = nodes.Where(n => n.Site!.RoadId is not null).ToArray();
            for (var index = 0; index < roadNodes.Length; index++)
            foreach (var other in roadNodes.Skip(index + 1))
                Assert.IsTrue(Math.Abs(roadNodes[index].Site!.Point.X - other.Site!.Point.X) >= 15
                    || Math.Abs(roadNodes[index].Site!.Point.Y - other.Site!.Point.Y) >= 2.8, description);
            foreach (var road in nodes[0].Territory!.Roads.Where(r => r.BonusRelic))
            {
                var reward = nodes.Single(n => n.Site!.RoadId == road.Id && n.Site.BonusRelic);
                Assert.IsNotNull(reward.Route!.Reward.Relic, description);
                foreach (var stop in nodes.Where(n => n.Site!.RoadId == road.Id))
                foreach (var incoming in stop.PreviousNodeIds.Select(id => nodes.Single(n => n.Id == id)))
                    if (incoming.Site!.RoadId is not null && incoming.Site.RoadId != road.Id)
                        Assert.IsTrue(stop.Site!.RoadIndex <= reward.Site!.RoadIndex, description);
            }
        }
    }

    [TestMethod]
    public void LongerGeneratedPaths_GrantOnlyBoundedMinorTrailRefinements()
    {
        foreach (var profile in WyrmrealmHuntLengthCatalog.All)
        {
            var map = WyrmrealmMapGenerator.Generate(profile.Depth, 42);
            var build = new RunBuildState();
            Assert.IsTrue(build.Spells.TryChoosePrimary(SpellId.FireBolt));
            var service = new LevelChoiceService(new FirstRandomSource());
            var current = map.Single(n => n.PreviousNodeIds.Count == 0);
            while (current.Type != WyrmrealmNodeType.Dragon)
            {
                var choices = service.RollForProgression(build, 1, trailReward: true, current.AttunementSchool);
                Assert.IsTrue(choices.All(c => c.Kind == LevelChoiceKind.Refinement));
                if (choices.Count > 0) Assert.IsTrue(service.ApplyForProgression(build, choices[0], 1, trailReward: true));
                Assert.AreEqual(1, build.Spells[SpellId.FireBolt]);
                foreach (var id in Enum.GetValues<RunRefinementId>()) Assert.IsTrue(build.Refinements[id] <= RunRefinementDefinition.MaxRank);
                current = map.Where(n => n.PreviousNodeIds.Contains(current.Id))
                    .OrderByDescending(n => n.Site!.RoadId is null ? 0 : n.Territory!.Roads.Single(r => r.Id == n.Site.RoadId).Encounters).First();
            }
            for (var attempt = 0; attempt < 100; attempt++) build.Refinements.Apply(RunRefinementId.Force);
            Assert.AreEqual(6, build.Refinements[RunRefinementId.Force]);
            Assert.IsFalse(build.Refinements.Apply(RunRefinementId.Force));
        }
    }
}
