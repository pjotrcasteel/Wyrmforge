using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmInfluenceFieldTests
{
    [TestMethod]
    [DataRow(WyrmTier.Wyrm)]
    [DataRow(WyrmTier.Ascendant)]
    [DataRow(WyrmTier.Elder)]
    public void ThousandSeeds_InfluenceRisesStrictlyAlongEveryRouteFromZeroToOne(WyrmTier tier)
    {
        for (var seed = 0; seed < 1000; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireHunt(seed, tier);
            var byId = nodes.ToDictionary(node => node.Id);
            var entrance = nodes.Single(node => node.PreviousNodeIds.Count == 0);
            var lair = nodes.Single(node => node.Type == WyrmrealmNodeType.Dragon);
            Assert.AreEqual(0d, entrance.Influence, $"seed {seed}");
            Assert.AreEqual(1d, lair.Influence, $"seed {seed}");

            foreach (var node in nodes)
            {
                Assert.IsInRange(0d, 1d, node.Influence, $"seed {seed} {node.Id}");
                foreach (var previous in node.PreviousNodeIds.Select(id => byId[id]))
                {
                    if (node.Refuge || node.Watchtower)
                        Assert.AreEqual(previous.Influence, node.Influence, $"seed {seed}: a side site shares its hub's land");
                    else if (!previous.Refuge && !previous.Watchtower)
                        Assert.IsLessThan(node.Influence, previous.Influence, $"seed {seed}: {previous.Id} -> {node.Id}");
                }
            }
        }
    }

    [TestMethod]
    public void FireTierOne_NeighbouringSitesNeverSkipAnInfluenceBand()
    {
        var profile = WyrmInfluenceProfile.Fire;
        for (var seed = 0; seed < 1000; seed++)
        {
            var nodes = WyrmrealmMapGenerator.GenerateFireTierOne(seed);
            var byId = nodes.ToDictionary(node => node.Id);
            foreach (var node in nodes)
                foreach (var previous in node.PreviousNodeIds.Select(id => byId[id]))
                    Assert.IsLessThanOrEqualTo(1, (int)profile.Band(node.Influence) - (int)profile.Band(previous.Influence),
                        $"seed {seed}: {previous.Id} -> {node.Id}");
            Assert.AreEqual(WyrmInfluenceBand.Natural, profile.Band(nodes.Single(n => n.PreviousNodeIds.Count == 0).Influence));
            Assert.AreEqual(WyrmInfluenceBand.Domain, profile.Band(nodes.Single(n => n.Type == WyrmrealmNodeType.Dragon).Influence));
        }
    }

    [TestMethod]
    public void FireProfile_NamesTheFourBandsAndClampsInvalidInput()
    {
        var profile = WyrmInfluenceProfile.For(SpellSchool.Fire);
        Assert.AreEqual("Wet Forest", profile.Name(0));
        Assert.AreEqual("Scorched Forest", profile.Name(.3));
        Assert.AreEqual("Burning Forest", profile.Name(.7));
        Assert.AreEqual("Volcanic Devastation", profile.Name(1));
        Assert.AreEqual(WyrmInfluenceBand.Natural, profile.Band(double.NaN));
        Assert.AreEqual(WyrmInfluenceBand.Domain, profile.Band(5));
    }

    [TestMethod]
    public void RealHuntArena_PublishesTheNodeInfluenceAndTheLabKeepsItsStagePreview()
    {
        var nodes = WyrmrealmMapGenerator.GenerateFireTierOne(1204);
        foreach (var node in nodes.Where(node => node.Type == WyrmrealmNodeType.Combat))
        {
            Assert.AreEqual(node.Influence, ArenaEnvironmentState.Create(1204, node, greybox: true).Snapshot().Corruption, $"{node.Id} greybox");
            Assert.AreEqual(HuntArenaGenerator.WyrmInfluence(node.Stage, node.PreLair),
                ArenaEnvironmentState.Create(1204, node, generatorPreview: true).Snapshot().Corruption, $"{node.Id} lab");
        }
    }

    [TestMethod]
    public void Assignment_IsDeterministic()
    {
        var first = WyrmrealmMapGenerator.GenerateFireTierOne(77).Select(node => (node.Id, node.Influence)).ToArray();
        var second = WyrmrealmMapGenerator.GenerateFireTierOne(77).Select(node => (node.Id, node.Influence)).ToArray();
        CollectionAssert.AreEqual(first, second);
    }
}
