using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation.Lighting;

namespace Wyrmforge.Application.Tests.Runs.Lighting;

[TestClass]
public sealed class GpuLightingFrameProjectionTests
{
    private static readonly LightingEnvironment Environment = new("night", "#8c9cbb", 0.012);

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

    private static LightingSnapshot CreateSnapshot(long tick, params LightingEmitter[] lights) =>
        new(LightingSnapshot.CurrentSchemaVersion, tick, "test", Environment, lights);
}
