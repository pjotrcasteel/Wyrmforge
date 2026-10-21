using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmHuntProgressTests
{
    [DataTestMethod]
    [DataRow(1, 4, 0d)]
    [DataRow(2, 4, 1d / 3)]
    [DataRow(3, 4, 2d / 3)]
    [DataRow(4, 4, 1d)]
    [DataRow(1, 14, 0d)]
    [DataRow(8, 14, 7d / 13)]
    [DataRow(14, 14, 1d)]
    public void Fraction_ChosenRouteNode_NormalizesIndependentlyOfRouteLength(int current, int length, double expected)
    {
        Assert.AreEqual(expected, WyrmrealmHuntProgress.Fraction(current, length), 0.00000000001d);
    }

    [TestMethod]
    public void Fraction_ShortAndLongRoutes_HaveDifferentInfluenceAtSameNodeNumber()
    {
        Assert.IsGreaterThan(WyrmrealmHuntProgress.Fraction(2, 14), WyrmrealmHuntProgress.Fraction(2, 4));
        Assert.AreEqual(1, WyrmrealmHuntProgress.Fraction(14, 14));
        Assert.AreEqual(1, WyrmrealmHuntProgress.Fraction(4, 4));
    }

    [TestMethod]
    public void Fraction_InvalidRouteIndices_Throws()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WyrmrealmHuntProgress.Fraction(1, 1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WyrmrealmHuntProgress.Fraction(0, 4));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WyrmrealmHuntProgress.Fraction(5, 4));
    }
}
