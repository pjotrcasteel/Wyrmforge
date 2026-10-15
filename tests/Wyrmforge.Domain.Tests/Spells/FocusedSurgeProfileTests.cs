using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FocusedSurgeProfileTests
{
    [TestMethod]
    public void For_FourthFocusedPrimaryCast_EarnsPowerWithoutChangingBaseCasts()
    {
        for (var cast = 1; cast <= 12; cast++)
        {
            var profile = FocusedSurgeProfile.For(cast, 1);
            Assert.AreEqual(cast % 4 == 0, profile.IsSurge);
            Assert.AreEqual(cast % 4 == 0 ? 1.65 : 1, profile.DamageMultiplier, .001);
        }
        Assert.IsFalse(FocusedSurgeProfile.For(0, 3).IsSurge);
    }

    [TestMethod]
    public void For_EarnedSurge_IncreasesCoverageWithRank()
    {
        var first = FocusedSurgeProfile.For(4, 1);
        var mastered = FocusedSurgeProfile.For(8, 3);
        Assert.IsGreaterThan(first.SplashRadius, mastered.SplashRadius);
        Assert.IsTrue(first.BonusPierces > 0);
        Assert.IsTrue(mastered.BonusChains > 0);
        Assert.AreEqual(1, FocusedSurgeProfile.Identity.RadiusMultiplier);
    }
}
