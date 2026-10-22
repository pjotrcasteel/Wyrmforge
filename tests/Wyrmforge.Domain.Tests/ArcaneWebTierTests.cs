using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Modifiers;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Domain.Tests;

[TestClass]
public sealed class ArcaneWebTierTests
{
    [TestMethod]
    public void Catalog_ExpandedFireBranches_HaveUniqueConnectedNodes()
    {
        var nodes = PassiveTreeCatalog.All;
        Assert.AreEqual(nodes.Count, nodes.Select(node => node.Id).Distinct(StringComparer.Ordinal).Count());

        var ids = nodes.Select(node => node.Id).ToHashSet(StringComparer.Ordinal);
        Assert.IsTrue(PassiveTreeCatalog.Connections.All(edge => ids.Contains(edge.From) && ids.Contains(edge.To)));
        Assert.IsTrue(nodes.Count(node => node.School == PassiveSchool.Fire) >= 26);

        foreach (var id in new[] { "fire-conflagration", "fire-spread-crown", "fire-immolation", "fire-ember-altar" })
        {
            Assert.IsTrue(ids.Contains(id), $"Missing authored landmark {id}");
            Assert.IsTrue(PassiveTreeCatalog.Neighbors(id).Count > 0, $"Disconnected landmark {id}");
        }
    }

    [TestMethod]
    public void Tiers_TravelMediumAndMajor_HaveExpectedPointCosts()
    {
        var nodes = PassiveTreeCatalog.All.Where(node => node.Kind != PassiveNodeKind.Origin);
        Assert.IsTrue(nodes.Any(node => PassiveNodeTiers.For(node) == PassiveNodeTier.Minor));
        Assert.IsTrue(nodes.Any(node => PassiveNodeTiers.For(node) == PassiveNodeTier.Medium));
        Assert.IsTrue(nodes.Any(node => PassiveNodeTiers.For(node) == PassiveNodeTier.Major));
        Assert.IsTrue(nodes.All(node => PassiveNodeTiers.For(node) switch
        {
            PassiveNodeTier.Minor => node.Cost == 1,
            PassiveNodeTier.Medium => node.Cost == 2,
            PassiveNodeTier.Major => node.Cost == 3,
            _ => false,
        }));
    }

    [TestMethod]
    public void FireMajorNodes_AreRealModifiers_NotUnimplementedPlaceholders()
    {
        var crown = PassiveTreeCatalog.Get("fire-spread-crown");
        var furnace = PassiveTreeCatalog.Get("fire-ember-altar");
        Assert.AreEqual(PassiveNodeTier.Major, PassiveNodeTiers.For(crown));
        Assert.AreEqual(PassiveNodeTier.Major, PassiveNodeTiers.For(furnace));
        Assert.IsTrue(crown.Modifiers.Stats.Any(modifier => modifier.Stat == BuildStatId.MutationRadius));
        Assert.IsTrue(furnace.Modifiers.Stats.Any(modifier => modifier.Stat == BuildStatId.Damage));
    }

    [TestMethod]
    public void FireBranch_ActivePyromancer_CanPlanRouteToMajor()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        Assert.IsTrue(selection.Select("fire-start"));
        Assert.IsTrue(selection.Select("fire-1"));

        var route = PassiveTreePlanner.Plan(selection, "fire-spread-crown");
        Assert.IsNotNull(route);
        Assert.IsTrue(route.NodeIds.Contains("fire-conflagration"));
        Assert.IsTrue(route.NodeIds.Contains("fire-spread-crown"));
        Assert.IsTrue(route.AdditionalCost <= selection.AvailablePoints);
        Assert.IsTrue(selection.SelectPath(route.NodeIds));
        Assert.IsTrue(selection.Selected.Contains("fire-spread-crown"));
    }

    [TestMethod]
    public void FireBranch_InactiveSchool_DoesNotAllowNewAllocation()
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Frost);

        Assert.IsFalse(selection.CanSelect("fire-ember-drift"));
        Assert.IsNull(PassiveTreePlanner.Plan(selection, "fire-ember-altar"));
    }
}
