using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FrostShardMasteryTests
{
    [TestMethod]
    public void IsActive_BelowRequiredRank_ReturnsFalse()
    {
        Assert.IsFalse(FrostShardMastery.IsActive(2));
    }

    [TestMethod]
    public void IsActive_AtRequiredRank_ReturnsTrue()
    {
        Assert.IsTrue(FrostShardMastery.IsActive(3));
    }

    [TestMethod]
    public void Mastery_UsesCrowdControlValues()
    {
        Assert.AreEqual(82d, FrostShardMastery.NovaRadius);
        Assert.AreEqual(0.45d, FrostShardMastery.NovaFreezeSeconds);
    }
}
