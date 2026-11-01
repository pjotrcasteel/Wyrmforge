using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation.Lighting;
using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Tests.Runs.Lighting;

[TestClass]
public sealed class HunterVisibilityLightingProjectionTests
{
    [TestMethod]
    public void Capture_UsesAuthoritativeHunterPositionAndStableGenericEmitterIdentity()
    {
        var left = HunterVisibilityLightingProjection.Capture(new Vector2D(240, 480));
        var right = HunterVisibilityLightingProjection.Capture(new Vector2D(360, 320));

        Assert.AreEqual(HunterVisibilityLightingProjection.SourceId, left.Id);
        Assert.AreEqual(left.Id, right.Id, "Moving a source must never allocate another owner identity.");
        Assert.AreEqual("hunter", left.OwnerId);
        Assert.AreEqual("point", left.Type);
        Assert.AreEqual(240d, left.X);
        Assert.AreEqual(480d, left.Y);
        Assert.AreEqual(360d, right.X);
        Assert.AreEqual(320d, right.Y);
        Assert.IsTrue(left.Enabled);
        Assert.IsTrue(left.Intensity > 0);
        Assert.IsTrue(left.Radius >= 125);
        Assert.IsFalse(left.CastsShadows, "Visibility must not take a costly mobile shadow cube.");
    }

    [TestMethod]
    public void NightSky_UsesTheSameGenericLightingContractAndCannotLeakIntoAbsoluteDarknessProof()
    {
        var sky = NightSkyLightingProjection.Capture();
        Assert.AreEqual(NightSkyLightingProjection.SourceId, sky.Id);
        Assert.AreEqual("night-sky", sky.OwnerId);
        Assert.AreEqual("directional", sky.Type);
        Assert.AreEqual(0d, sky.DirectionX);
        Assert.AreEqual(0d, sky.DirectionY);
        Assert.IsTrue(sky.DirectionZ < 0);
        Assert.IsFalse(sky.CastsShadows);
        Assert.IsTrue(sky.Intensity > 0);

        var environment = new LightingEnvironment("gothic-night", "#8c9cbb", .24);
        var snapshot = LightingSceneComposer.Compose("hunt", 6, environment, [sky],
            [HunterVisibilityLightingProjection.Capture(new Vector2D(100, 200))]);
        var gpu = GpuLightingFrameProjection.FromSnapshot(snapshot, 6);
        Assert.IsTrue(gpu.Lights.Any(source => source.Id == NightSkyLightingProjection.SourceId));
        Assert.AreEqual(.24, gpu.Environment.Ambient);
        Assert.AreEqual(0, LightingSceneComposer.Compose("zero-light-proof", 0,
            new LightingEnvironment("zero", "#000000", 0), []).Emitters.Count);
    }

    [TestMethod]
    public void Capture_ComposesWithOtherAuthoritativeSourcesWithoutChangingZeroLightLab()
    {
        var hunter = HunterVisibilityLightingProjection.Capture(new Vector2D(100, 200));
        var fire = new LightingEmitter("projectile:1", "projectile:1", "point",
            140, 220, 24, "#ff7835", 1, 144);
        var night = new LightingEnvironment("gothic-night", "#8c9cbb", .012);
        var composed = LightingSceneComposer.Compose("hunt", 8, night, [fire], [hunter]);
        var gpu = GpuLightingFrameProjection.FromSnapshot(composed, 2);

        Assert.AreEqual(2, gpu.Lights.Count);
        Assert.IsTrue(gpu.Lights.Any(source => source.Id == HunterVisibilityLightingProjection.SourceId));
        Assert.AreEqual(.012, gpu.Environment.Ambient);
        Assert.AreEqual(0, LightingSceneComposer.Compose("zero-light-proof", 0,
            new LightingEnvironment("zero", "#000000", 0), []).Emitters.Count,
            "Isolated absolute-darkness tests must remain genuinely source-free.");
    }
}
