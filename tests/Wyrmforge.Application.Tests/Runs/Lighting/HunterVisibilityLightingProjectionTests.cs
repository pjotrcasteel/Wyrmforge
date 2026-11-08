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
    public void CaptureForScene_UsesMoonlightInsteadOfMovingHunterPoolOnVoxelTerrain()
    {
        var position = new Vector2D(240, 480);
        var moonlit = HunterVisibilityLightingProjection.CaptureForScene(position, hasMoonlitTerrain: true);
        var legacy = HunterVisibilityLightingProjection.CaptureForScene(position, hasMoonlitTerrain: false);

        Assert.HasCount(0, moonlit, "Voxel Hunts already have moon/sky illumination: no moving flashlight-like pool.");
        Assert.HasCount(1, legacy, "Legacy dark greybox still needs the authoritative local visibility source.");
        Assert.AreEqual(HunterVisibilityLightingProjection.SourceId, legacy[0].Id);
        Assert.AreEqual(position.X, legacy[0].X);
        Assert.AreEqual(position.Y, legacy[0].Y);

        var environment = new LightingEnvironment("gothic-night", "#8c9cbb", 1.0);
        var composed = LightingSceneComposer.Compose("voxel-hunt", 6, environment,
            [NightSkyLightingProjection.Capture(relief: true)], moonlit,
            [new LightingEmitter("projectile:fire", "projectile:fire", "point",
                250, 470, 24, "#ff7835", 2, 100)]);
        var gpu = GpuLightingFrameProjection.FromSnapshot(composed, 6);

        Assert.IsFalse(gpu.Lights.Any(light => light.Id == HunterVisibilityLightingProjection.SourceId));
        Assert.IsTrue(gpu.Lights.Any(light => light.Id == NightSkyLightingProjection.SourceId),
            "The moon must continue illuminating terrain and actor materials.");
        Assert.IsTrue(gpu.Lights.Any(light => light.Id == "projectile:fire"),
            "Removing the hunter pool must not remove spell light.");
        Assert.AreEqual(1.0, gpu.Environment.Ambient, "Preserve distributed night visibility.");
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
