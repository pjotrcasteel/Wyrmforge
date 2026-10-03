using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Simulation.Dragons;

[TestClass]
public sealed class DragonHuntRouteTests
{
    [TestMethod]
    public void ForAshfang_PutsStormcoilDeeper()
    {
        var route = DragonHuntRoute.For(DragonId.Ashfang);
        Assert.AreEqual(DragonId.Ashfang, route.First);
        Assert.AreEqual(DragonId.Stormcoil, route.Deep);
    }

    [TestMethod]
    public void ForStormcoil_PutsAshfangDeeper()
    {
        var route = DragonHuntRoute.For(DragonId.Stormcoil);
        Assert.AreEqual(DragonId.Stormcoil, route.First);
        Assert.AreEqual(DragonId.Ashfang, route.Deep);
    }
}
