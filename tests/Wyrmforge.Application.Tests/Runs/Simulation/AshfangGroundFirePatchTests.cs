using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class AshfangGroundFirePatchTests
{
    [TestMethod]
    public void BreathScorch_BurnsInsideItsExactRadius_UntilItCools()
    {
        var patch = new AshfangGroundFirePatch(12, new Vector2D(100, 200));
        Assert.IsTrue(patch.Burns(new Vector2D(134, 200)));
        Assert.IsFalse(patch.Burns(new Vector2D(134.01, 200)));
        patch.Advance(AshfangGroundFirePatch.HotSeconds);
        Assert.IsFalse(patch.Burning);
        Assert.IsFalse(patch.Burns(new Vector2D(100, 200)), "Cooling marks must not deal invisible damage.");
        Assert.IsFalse(patch.Expired, "The scorched-earth visual must outlive the damaging fire.");
        patch.Advance(AshfangGroundFirePatch.VisibleSeconds);
        Assert.IsTrue(patch.Expired);
    }

    [TestMethod]
    public void RekindlingExistingPatch_RestartsItsHotPhaseWithoutAddingAnotherPatch()
    {
        var patch = new AshfangGroundFirePatch(1, Vector2D.Zero);
        patch.Advance(AshfangGroundFirePatch.HotSeconds + 0.1);
        Assert.IsFalse(patch.Burning);
        patch.Rekindle();
        Assert.IsTrue(patch.Burning);
        Assert.AreEqual(0, patch.AgeSeconds);
    }

    [TestMethod]
    public void ZeroOrNegativeDelta_DoesNotAdvanceFire()
    {
        var patch = new AshfangGroundFirePatch(1, Vector2D.Zero);
        patch.Advance(0);
        patch.Advance(-2);
        Assert.AreEqual(0, patch.AgeSeconds);
    }
}
