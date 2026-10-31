using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Lighting;

namespace Wyrmforge.Application.Tests.Runs.Lighting;

[TestClass]
public sealed class GpuLightingFrameProjectionTests
{
    private static readonly LightingEnvironment Environment = new("night", "#8c9cbb", 0.012);

    [TestMethod]
    public void FromProjectile_FireSource_UsesWorldPixelRadiusAndPositiveHeight()
    {
        var projectile = new Wyrmforge.Domain.Combat.Projectiles.ProjectileState(
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(144, 240),
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(1, 0),
            1, 1, Wyrmforge.Domain.Spells.SpellId.FireBolt, default!);

        var source = ProjectileLightingProjection.FromProjectile(projectile, "fire-test");

        Assert.IsNotNull(source);
        Assert.AreEqual(144d, source.X);
        Assert.AreEqual(240d, source.Y);
        Assert.AreEqual(320d, source.Radius);
        Assert.AreEqual(24d, source.Z);
        Assert.AreEqual(24d, source.Intensity,
            "The authoritative Fireball needs G1-calibrated direct light to form a visible ground shadow.");
        Assert.IsTrue(source.CastsShadows,
            "Hollowed should receive an actual GPU occlusion shadow from the Fireball point emitter.");
        var projected = GpuLightingFrameProjection.FromSnapshot(
            ProjectileLightingProjection.Capture("hunt", 1,
                [("fire-test", projectile)], Environment), .5);
        Assert.IsTrue(projected.Lights.Any(light =>
            light.Id == "projectile:fire-test" && light.CastsShadow &&
            light.Intensity == 24 && light.Range == 320));
    }

    [TestMethod]
    public void G5_AuthoredWetForestTorch_ComposesWithMovingProjectileWithoutNewEngine()
    {
        var recipe = HuntArenaGenerator.GenerateWetForest(91);
        var fixture = recipe.LightFixtures.Single();
        var sources = HuntFixtureLightingProjection.Capture(recipe, 950, 1550);
        var fixedLight = sources.Single();
        Assert.AreEqual(fixture.Id, fixedLight.Id);
        Assert.AreEqual(fixture.X * 950, fixedLight.X);
        Assert.AreEqual(fixture.Y * 1550, fixedLight.Y);
        Assert.AreEqual(fixture.Color, fixedLight.Color);
        Assert.AreEqual(fixture.Intensity, fixedLight.Intensity);
        Assert.AreEqual(fixture.Range, fixedLight.Radius);
        Assert.IsFalse(fixedLight.CastsShadows, "G5 decorative fixture deliberately uses the reduced shadow tier.");

        var moving = new LightingEmitter("projectile:fireball", "fireball", "point", 110, 350, 24,
            "#ff7835", 24, 320, ExpiresAtTick: 8);
        var frame = GpuLightingFrameProjection.FromSnapshot(
            LightingSceneComposer.Compose("hunt", 7, Environment, sources, [moving]), 1.4);
        CollectionAssert.AreEquivalent(new[] { fixture.Id, moving.Id }, frame.Lights.Select(light => light.Id).ToArray());
        Assert.AreEqual("point", frame.Lights.Single(light => light.Id == fixture.Id).Type);
        Assert.IsTrue(frame.Lights.Single(light => light.Id == moving.Id).CastsShadow);
        var expired = GpuLightingFrameProjection.FromSnapshot(
            LightingSceneComposer.Compose("hunt", 8, Environment, sources, [moving]), 1.5);
        Assert.AreEqual(fixture.Id, expired.Lights.Single().Id,
            "An expired moving spell must not remove the independent fixed fixture.");
        Assert.AreEqual(0, HuntFixtureLightingProjection.Capture(null, 950, 1550).Count,
            "Non-Wet-Forest scenes never invent a torch.");
        var portraitLight = HuntFixtureLightingProjection.Capture(recipe, 1014, 2110).Single();
        Assert.AreEqual(fixture.X * 1014, portraitLight.X,
            "The wider 390px Hunt must use its actual C# world dimensions, not a fixed 950px preview.");
        Assert.AreEqual(fixture.Y * 2110, portraitLight.Y);

        var switchedOff = recipe with { LightFixtures = [fixture with
        {
            Enabled = false,
            Color = "#88ccff",
            Intensity = 9,
            Range = 160,
            ExpiresAtTick = 9,
        }] };
        var controlled = HuntFixtureLightingProjection.Capture(switchedOff, 950, 1550).Single();
        Assert.IsFalse(controlled.Enabled);
        Assert.AreEqual("#88ccff", controlled.Color);
        Assert.AreEqual(9d, controlled.Intensity);
        Assert.AreEqual(160d, controlled.Radius);
        Assert.AreEqual(9L, controlled.ExpiresAtTick);
    }

    [TestMethod]
    public void FromSnapshot_ExpiredEmitter_ExcludesLight()
    {
        var snapshot = CreateSnapshot(10,
            new LightingEmitter("old", "owner", "point", 0, 0, 0, "#ffffff", 1, 3, ExpiresAtTick: 10),
            new LightingEmitter("live", "owner", "point", 1, 2, 3, "#ff7835", 2, 5, ExpiresAtTick: 11));

        var frame = GpuLightingFrameProjection.FromSnapshot(snapshot, 0.5);

        Assert.AreEqual(1, frame.Lights.Count);
        Assert.AreEqual("live", frame.Lights[0].Id);
    }

    [TestMethod]
    public void FromSnapshot_GenericSource_UsesG1WireProperties()
    {
        var snapshot = CreateSnapshot(1,
            new LightingEmitter("town:lantern", "town", "point", 1, 2, 3, "#ffffff", 4, 5));

        var frame = GpuLightingFrameProjection.FromSnapshot(snapshot, 1);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(frame));
        var root = document.RootElement;

        Assert.AreEqual(1, root.GetProperty("version").GetInt32());
        Assert.AreEqual("town:lantern", root.GetProperty("lights")[0].GetProperty("id").GetString());
        Assert.AreEqual(5, root.GetProperty("lights")[0].GetProperty("range").GetDouble());
        Assert.AreEqual(3, root.GetProperty("lights")[0].GetProperty("position").GetArrayLength());
        Assert.IsFalse(root.GetProperty("lights")[0].TryGetProperty("expiresAt", out _));
        Assert.AreEqual(0.012, root.GetProperty("environment").GetProperty("ambient").GetDouble());
    }

    [TestMethod]
    public void Capture_InactiveTownFixture_DoesNotProduceGhostLight()
    {
        var profile = new LightSourceProfile("#ff7835", 2, 4);
        var fixtures = new[]
        {
            new TownLightFixtureState("window", "blacksmith", 0, 0, 1, false, profile),
            new TownLightFixtureState("lantern", "gate", 2, 0, 2, true, profile),
        };

        var snapshot = TownLightingProjection.Capture("town", 3, fixtures, Environment);

        Assert.AreEqual(1, snapshot.Emitters.Count);
        Assert.AreEqual("lantern", snapshot.Emitters[0].Id);
    }

    [TestMethod]
    public void ProjectileIdentityRegistry_RemovalAndReordering_PreservesOtherIds()
    {
        var identities = new ProjectileLightIdentityRegistry();
        var first = new Wyrmforge.Domain.Combat.Projectiles.ProjectileState(
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(0, 0),
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(1, 0),
            1, 1, default, default!);
        var second = new Wyrmforge.Domain.Combat.Projectiles.ProjectileState(
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(1, 0),
            new Wyrmforge.Domain.Combat.Geometry.Vector2D(1, 0),
            1, 1, default, default!);
        var firstId = identities.GetId(first);
        var secondId = identities.GetId(second);

        identities.Retain([second]);

        Assert.AreEqual(secondId, identities.GetId(second));
        Assert.AreNotEqual(firstId, identities.GetId(first));
    }

    [TestMethod]
    public void Compose_MixedSceneSources_OrdersLightsAndRejectsDuplicateIds()
    {
        var torch = new LightingEmitter("torch", "town", "point", 0, 0, 1, "#ff7835", 2, 4);
        var spell = new LightingEmitter("spell", "player", "point", 2, 1, 1, "#ffffff", 1, 3);
        var snapshot = LightingSceneComposer.Compose("scene", 5, Environment, [torch], [spell]);

        CollectionAssert.AreEqual(new[] { "spell", "torch" }, snapshot.Emitters.Select(light => light.Id).ToArray());
        Assert.ThrowsExactly<ArgumentException>(() =>
            LightingSceneComposer.Compose("scene", 5, Environment, [torch], [torch]));
    }

    [TestMethod]
    public void Registry_ExpiredLight_IsRemoved()
    {
        var registry = new LightingEmitterRegistry();
        registry.Upsert(new LightingEmitter("spark", "effect", "point", 0, 0, 0, "#ffffff", 1, 3, ExpiresAtTick: 5));
        Assert.AreEqual(1, registry.Capture("hunt", 4, Environment).Emitters.Count);
        Assert.AreEqual(0, registry.Capture("hunt", 5, Environment).Emitters.Count);
    }

    [TestMethod]
    public void Registry_ReplaceOwner_DoesNotRemoveUnrelatedLights()
    {
        var registry = new LightingEmitterRegistry();
        registry.Upsert(new LightingEmitter("old", "wizard", "point", 0, 0, 1, "#ffffff", 1, 3));
        registry.Upsert(new LightingEmitter("gate", "town", "point", 1, 0, 1, "#ffffff", 1, 3));
        registry.ReplaceOwner("wizard", [new LightingEmitter("new", "wizard", "point", 2, 0, 1, "#ff7835", 2, 4)]);
        var ids = registry.Capture("town", 3, Environment).Emitters.Select(light => light.Id).ToArray();
        CollectionAssert.AreEqual(new[] { "gate", "new" }, ids);
    }

    [TestMethod]
    public void Registry_ReplaceOwner_InvalidReplacement_DoesNotLoseExistingLights()
    {
        var registry = new LightingEmitterRegistry();
        registry.Upsert(new LightingEmitter("old", "wizard", "point", 0, 0, 1, "#ffffff", 1, 3));
        var invalid = new LightingEmitter("bad", "wizard", "point", 0, 0, 1, "invalid", 1, 3);
        Assert.ThrowsExactly<ArgumentException>(() => registry.ReplaceOwner("wizard", [invalid]));
        Assert.AreEqual("old", registry.Capture("hunt", 1, Environment).Emitters.Single().Id);
    }

    private static LightingSnapshot CreateSnapshot(long tick, params LightingEmitter[] lights) =>
        new(LightingSnapshot.CurrentSchemaVersion, tick, "test", Environment, lights);
}
