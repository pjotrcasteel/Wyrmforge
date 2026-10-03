using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class ChainLightningMasteryTests
{
    [TestMethod]
    public void IsActive_BelowRequiredRank_ReturnsFalse()
    {
        Assert.IsFalse(ChainLightningMastery.IsActive(2));
    }

    [TestMethod]
    public void IsActive_AtRequiredRank_ReturnsTrue()
    {
        Assert.IsTrue(ChainLightningMastery.IsActive(3));
    }

    [TestMethod]
    public void CalculateForkDamage_UsesMasteryMultiplier()
    {
        Assert.AreEqual(65d, ChainLightningMastery.CalculateForkDamage(100));
    }
}
