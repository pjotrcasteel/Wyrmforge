using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Stats;

namespace Wyrmforge.Domain.Tests.Combat.Stats;

[TestClass]
public sealed class PassiveCombatProfileTests
{
    [TestMethod]
    public void Create_WithAllocatedTravelAndNotableNodes_AggregatesTheirModifiers()
    {
        var selected = new HashSet<string> { "fire-start", "fire-1", "fire-2", "fire-major" };

        var profile = PassiveCombatProfile.Create(selected);

        Assert.IsTrue(profile.DamageMultiplier > 1.20);
        Assert.IsTrue(profile.DamageMultiplier < 1.30);
    }

    [TestMethod]
    public void Create_WithMasteryAndKeystone_EnablesBehaviorRules()
    {
        var selected = new HashSet<string> { "fire-start", "fire-1", "fire-2", "fire-major", "wildfire", "inferno" };

        var profile = PassiveCombatProfile.Create(selected);

        Assert.IsTrue(profile.Wildfire);
        Assert.IsTrue(profile.Inferno);
        Assert.IsFalse(profile.Detonation);
    }
}
