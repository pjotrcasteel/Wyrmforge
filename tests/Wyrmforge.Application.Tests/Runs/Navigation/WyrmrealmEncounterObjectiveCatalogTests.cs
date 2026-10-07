using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WyrmrealmEncounterObjectiveCatalogTests
{
    [TestMethod]
    [DataRow(WyrmrealmEncounterKind.StalkerPressure, 1, 12)]
    [DataRow(WyrmrealmEncounterKind.Mixed, 1, 16)]
    [DataRow(WyrmrealmEncounterKind.Swarm, 1, 20)]
    [DataRow(WyrmrealmEncounterKind.StalkerPressure, 3, 18)]
    [DataRow(WyrmrealmEncounterKind.Mixed, 3, 24)]
    [DataRow(WyrmrealmEncounterKind.Swarm, 3, 28)]
    public void KillsRequired_ReturnsPatternAndDepthSpecificObjective(WyrmrealmEncounterKind kind, int depth, int expected)
    {
        Assert.AreEqual(expected, WyrmrealmEncounterObjectiveCatalog.KillsRequired(kind, depth));
    }
}
