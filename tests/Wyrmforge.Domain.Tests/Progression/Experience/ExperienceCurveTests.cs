using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.Experience;

namespace Wyrmforge.Domain.Tests.Progression.Experience;

[TestClass]
public sealed class ExperienceCurveTests
{
    [TestMethod]
    [DataRow(1, 10)]
    [DataRow(2, 15)]
    [DataRow(5, 30)]
    public void RequiredForLevel_ReturnsExpectedCurve(int level, int expected)
    {
        Assert.AreEqual(expected, ExperienceCurve.RequiredForLevel(level));
    }
}
