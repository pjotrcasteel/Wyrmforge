using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Tests.Combat.Dragons;

[TestClass]
public sealed class DragonStateTests
{
    [TestMethod]
    public void Constructor_HealthMultiplier_ScalesCurrentAndMaximumHealth()
    {
        var definition = DragonCatalog.Get(DragonId.Ashfang);

        var state = new DragonState(1, definition, Vector2D.Zero, 1.55);

        Assert.AreEqual(definition.MaxHealth * 1.55, state.MaxHealth, 0.001);
        Assert.AreEqual(state.MaxHealth, state.Health, 0.001);
    }
}
