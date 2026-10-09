using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Experience;

namespace Wyrmforge.Domain.Tests.Progression.Experience;

[TestClass]
public sealed class ExperienceCurveTests
{
    [TestMethod]
    [DataRow(0, 6)]
    [DataRow(1, 6)]
    [DataRow(2, 10)]
    [DataRow(3, 20)]
    [DataRow(5, 30)]
    public void RequiredForLevel_ReturnsExpectedCurve(int level, int expected)
    {
        Assert.AreEqual(expected, ExperienceCurve.RequiredForLevel(level));
    }
}
