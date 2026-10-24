using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class ArenaGroundFireStateTests
{
    [TestMethod]
    public void Ignite_CoveredLeafCentre_BurnsOnlyWhenTheFireTouchesExposedLeaves()
    {
        var fire = Create([
            new("leafbed", .5, .5, .10, .10),
            new("puddle", .5, .5, .05, .05),
        ]);

        Assert.AreEqual(0, fire.Ignite(new Vector2D(500, 500), 1000, 1000, 2),
            "A real fire zone on water must not ignite dry leaves hidden underneath.");
        Assert.IsEmpty(fire.Snapshot());

        Assert.AreEqual(1, fire.Ignite(new Vector2D(575, 500), 1000, 1000, 8),
            "The exposed rim of the same leafbed must burn, even though its centre is under water.");
        Assert.AreEqual(0, fire.Ignite(new Vector2D(575, 500), 1000, 1000, 8));
        Assert.HasCount(1, fire.Snapshot());
        Assert.AreEqual(0, fire.Snapshot()[0].SourcePatchIndex);
    }

    [TestMethod]
    public void Ignite_LaterCoverFullyHidesLeafbed_NeverBurnsBuriedFuel()
    {
        var fire = Create([
            new("leafbed", .5, .5, .04, .04),
            new("clearing", .5, .5, .12, .12),
        ]);

        Assert.AreEqual(0, fire.Ignite(new Vector2D(500, 500), 1000, 1000, 60));
        Assert.IsEmpty(fire.Snapshot());
    }

    [TestMethod]
    public void Ignite_LaterDryLeafbed_BurnsTopLayerWithoutSecretlyBurningCoveredLayer()
    {
        var fire = Create([
            new("leafbed", .5, .5, .04, .04),
            new("leafbed", .5, .5, .08, .08),
        ]);

        Assert.AreEqual(1, fire.Ignite(new Vector2D(500, 500), 1000, 1000, 2));
        Assert.AreEqual(1, fire.Snapshot()[0].SourcePatchIndex);
        fire.Advance(10);
        Assert.IsTrue(fire.Snapshot()[0].Charred);
    }

    private static ArenaGroundFireState Create(IReadOnlyList<HuntArenaGenerator.GroundPatch> patches) =>
        new(new HuntArenaGenerator.WetForestRecipe("test", .5, .5, [], patches));
}
