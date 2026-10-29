using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteGeographyTests
{
    [TestMethod]
    public void GeneratedChart_UsesOneVersionedSitePerNodeAndMapsEveryRealEdge()
    {
        foreach (var tier in new[] { WyrmTier.Wyrm, WyrmTier.Ascendant, WyrmTier.Elder })
        {
            for (var seed = 0; seed < 36; seed++)
            {
                var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, tier);
                var byId = nodes.ToDictionary(node => node.Id, StringComparer.Ordinal);
                var identities = new HashSet<string>(StringComparer.Ordinal);
                foreach (var node in nodes)
                {
                    var site = node.Geography;
                    Assert.IsNotNull(site);
                    Assert.AreEqual(WorldSiteGeography.CurrentVersion, site.Version);
                    Assert.AreEqual(seed, site.WorldSeed);
                    Assert.AreEqual("fire", site.RegionId);
                    Assert.IsTrue(identities.Add(site.SiteId));
                    Assert.AreEqual(node.Site!.Point, site.ChartCenter);
                    Assert.AreEqual(node.Habitat.ToString(), site.Archetype);
                    Assert.AreEqual(site.Ports.Count, site.Corridors.Count);
                    Assert.AreEqual(site.Ports.Count, site.Ports.Select(port => port.EdgeId).Distinct().Count());

                    var incoming = site.Ports.Where(port => port.Entrance).ToArray();
                    Assert.AreEqual(node.PreviousNodeIds.Count == 0 ? 1 : node.PreviousNodeIds.Count, incoming.Length);
                    foreach (var previous in node.PreviousNodeIds)
                        Assert.AreEqual(1, incoming.Count(port => port.NeighborNodeId == previous));

                    foreach (var port in site.Ports)
                    {
                        Assert.IsTrue(port.LocalPoint.X >= .059 && port.LocalPoint.X <= .941);
                        Assert.IsTrue(port.LocalPoint.Y >= .059 && port.LocalPoint.Y <= .941);
                        Assert.IsTrue(Math.Abs(port.LocalPoint.X - .5) >= .439 ||
                            Math.Abs(port.LocalPoint.Y - .5) >= .439, "Every local port must be on a physical arena boundary.");
                        Assert.IsTrue(site.Corridors.Any(corridor => corridor.EdgeId == port.EdgeId &&
                            corridor.Points[0] == new HuntPoint(.5, .5) &&
                            corridor.Points[^1] == port.LocalPoint));

                        if (port.NeighborNodeId == "camp")
                            continue;

                        var neighbor = byId[port.NeighborNodeId].Geography!;
                        var reciprocal = neighbor.Ports.Single(other => other.EdgeId == port.EdgeId);
                        Assert.AreEqual(node.Id, reciprocal.NeighborNodeId);
                        Assert.AreNotEqual(port.Entrance, reciprocal.Entrance);
                    }
                }
            }
        }
    }

    [TestMethod]
    public void SameSavedWorldSeed_ReplaysIdenticalSiteAndArenaSnapshots()
    {
        foreach (var seed in new[] { 0, 1, 1204, 87122 })
        {
            var first = new WyrmrealmMapState(seed: seed, introductoryFire: true, huntTier: WyrmTier.Ascendant);
            var replay = new WyrmrealmMapState(seed: seed, introductoryFire: true, huntTier: WyrmTier.Ascendant);
            Assert.AreEqual(JsonSerializer.Serialize(first.Nodes), JsonSerializer.Serialize(replay.Nodes));

            foreach (var node in first.Nodes.Where(node => node.Type == WyrmrealmNodeType.Combat))
            {
                var environment = ArenaEnvironmentState.Create(first.Seed, node).Snapshot();
                Assert.IsNotNull(environment.Geography);
                Assert.AreEqual(node.Geography, environment.Geography);
                Assert.AreEqual(JsonSerializer.Serialize(node.Geography),
                    JsonSerializer.Serialize(replay.Nodes.Single(other => other.Id == node.Id).Geography));
                Assert.AreEqual(JsonSerializer.Serialize(environment),
                    JsonSerializer.Serialize(ArenaEnvironmentState.Create(first.Seed, node).Snapshot()));
            }
        }
    }

    [TestMethod]
    public void DifferentVisualPresentationCannotAlterTheCSharpGeographicRecipe()
    {
        var first = new WyrmrealmMapState(seed: 1204, introductoryFire: true);
        var node = first.Nodes.Single(node => node.Type == WyrmrealmNodeType.Combat);
        var before = JsonSerializer.Serialize(node.Geography);
        var normal = ArenaEnvironmentState.Create(first.Seed, node).Snapshot();
        var preview = ArenaEnvironmentState.Create(first.Seed, node, generatorPreview: true).Snapshot();

        Assert.AreEqual(before, JsonSerializer.Serialize(normal.Geography));
        Assert.AreEqual(before, JsonSerializer.Serialize(preview.Geography));
        Assert.AreEqual(normal.Geography!.WorldSeed, preview.Geography!.WorldSeed);
        Assert.AreEqual(normal.Geography!.SiteId, preview.Geography!.SiteId);
    }
}
