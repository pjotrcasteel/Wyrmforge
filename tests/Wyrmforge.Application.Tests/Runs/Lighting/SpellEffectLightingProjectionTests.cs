using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation.Lighting;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Lighting;

[TestClass]
public sealed class SpellEffectLightingProjectionTests
{
    [TestMethod]
    [DataRow(SpellId.FireBolt)]
    [DataRow(SpellId.FrostShard)]
    [DataRow(SpellId.ChainLightning)]
    [DataRow(SpellId.ArcaneOrb)]
    public void Capture_ConfirmedSchoolEffects_UsesSharedSourceMetadata(SpellId spell)
    {
        var cast = new CastMotionRenderSnapshot(50, 60, spell, 1, null, 0, .5);
        var lights = SpellEffectLightingProjection.Capture(cast, [new(70, 80, spell, .25)], []);
        var profile = LightingSourceCatalog.ForSpell(spell)!;

        Assert.HasCount(2, lights);
        Assert.IsTrue(lights.All(light => light.Color == profile.Color && light.Radius == profile.Radius));
        Assert.AreEqual(profile.Intensity * .5, lights[0].Intensity);
        Assert.AreEqual(profile.Intensity * .75, lights[1].Intensity);
        Assert.IsTrue(lights.All(light => light.Z > 0));
    }

    [TestMethod]
    public void Capture_TargetCenteredFireballImpact_KeepsLightButCannotCastBackwardsShadow()
    {
        // Projectile impact snapshots are anchored to target.Position, which is
        // inside the target's upright shadow caster. The transient flash must not
        // request a cubemap there, even though the flying projectile still does.
        var profile = LightingSourceCatalog.ForSpell(SpellId.FireBolt)!;
        Assert.IsTrue(profile.CastsShadows, "Moving Fireballs still cast directional shadows.");

        var cast = new CastMotionRenderSnapshot(50, 60, SpellId.FireBolt, 1, null, 0, .5);
        var impact = new ElementalImpactRenderSnapshot(100, 120, SpellId.FireBolt, 0);
        var emitters = SpellEffectLightingProjection.Capture(cast, [impact], []);

        Assert.HasCount(2, emitters);
        Assert.IsTrue(emitters[0].CastsShadows, "A free-standing cast can still use the shadow map.");
        Assert.IsFalse(emitters[1].CastsShadows, "An embedded impact flash cannot project the struck mob toward its caster.");
        Assert.AreEqual(100d, emitters[1].X);
        Assert.AreEqual(120d, emitters[1].Y);
        Assert.AreEqual(24d, emitters[1].Z);
        Assert.AreEqual(profile.Intensity, emitters[1].Intensity, "The flash still illuminates on contact.");

        var frame = GpuLightingFrameProjection.FromSnapshot(
            LightingSceneComposer.Compose("hunt", 2,
                new LightingEnvironment("gothic-night", "#8c9cbb", .24), emitters), .25);
        Assert.IsTrue(frame.Lights.Any(light => light.Id == "cast:player" && light.CastsShadow));
        Assert.IsTrue(frame.Lights.Any(light => light.Id.StartsWith("impact:") && !light.CastsShadow &&
            light.Enabled && light.Intensity == profile.Intensity));
    }

    [TestMethod]
    public void Capture_ExpiredEffects_LeaveNoSources()
    {
        var cast = new CastMotionRenderSnapshot(50, 60, SpellId.FireBolt, 1, null, 0, 1);
        var lights = SpellEffectLightingProjection.Capture(cast, [new(70, 80, SpellId.FireBolt, 1)], [new(90, 100, 68, 0)]);
        Assert.IsEmpty(lights);
    }

    [TestMethod]
    public void Capture_RemovedOrCoLocatedEffects_PreservesIdentityAndAvoidsDuplicateSources()
    {
        ElementalImpactRenderSnapshot first = new(10, 20, SpellId.FireBolt, 0);
        ElementalImpactRenderSnapshot second = new(30, 40, SpellId.FrostShard, .25);
        var before = SpellEffectLightingProjection.Capture(null, [first, second, second with { Progress = .5 }], []);
        var after = SpellEffectLightingProjection.Capture(null, [second], []);
        Assert.HasCount(2, before);
        Assert.HasCount(1, after);
        Assert.AreEqual(before[1].Id, after[0].Id);
        Assert.AreEqual(before[1].Intensity, after[0].Intensity);
    }

    [TestMethod]
    public void Capture_LingeringFire_TracksConfirmedAreaAndFadesWithoutGameplayChanges()
    {
        var area = new EssenceBurstRenderSnapshot(100, 200, 68, .1);
        var lights = SpellEffectLightingProjection.Capture(null, [], [area, area]);
        Assert.HasCount(1, lights);
        Assert.AreEqual(100d, lights[0].X);
        Assert.AreEqual(200d, lights[0].Y);
        Assert.AreEqual(68d, lights[0].Radius);
        Assert.IsFalse(lights[0].CastsShadows,
            "Floor-level burning ground must not request a point cubemap inside an enemy caster.");
        Assert.AreEqual(LightingSourceCatalog.ForSpell(SpellId.FireBolt)!.Intensity * .5, lights[0].Intensity);
        Assert.AreEqual(.1, area.Life);
        Assert.IsEmpty(SpellEffectLightingProjection.Capture(null, [], []));
    }
}
