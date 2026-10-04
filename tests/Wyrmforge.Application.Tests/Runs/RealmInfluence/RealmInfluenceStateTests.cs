using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.RealmInfluence;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.RealmInfluence;

[TestClass]
public sealed class RealmInfluenceStateTests
{
    [TestMethod]
    public void Calculate_NoAttention_ReturnsNoInfluence()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate(Array.Empty<DragonAttention>());

        Assert.AreEqual(0, cues.Count);
    }

    [TestMethod]
    public void Calculate_FaintAshfangAttention_ReturnsOnlyAshfall()
    {
        var state = new RealmInfluenceState();

        var cue = state.Calculate([new DragonAttention(DragonId.Ashfang, DragonAttentionIntensity.Faint)]).Single();

        Assert.AreEqual(DragonId.Ashfang, cue.Source);
        Assert.AreEqual(RealmInfluenceEffect.Ashfall, cue.Effect);
        Assert.AreEqual(0.25, cue.Strength, 0.001);
    }

    [TestMethod]
    public void Calculate_OminousAshfangAttention_AccumulatesEnvironmentalEffects()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate([new DragonAttention(DragonId.Ashfang, DragonAttentionIntensity.Ominous)]);

        Assert.AreEqual(3, cues.Count);
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.Ashfall));
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.ScorchMarks));
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.HeatHaze));
        Assert.IsTrue(cues.All(cue => Math.Abs(cue.Strength - 0.75) < 0.001));
    }

    [TestMethod]
    public void Calculate_ImminentStormcoilAttention_ReturnsFullStormProfile()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate([new DragonAttention(DragonId.Stormcoil, DragonAttentionIntensity.Imminent)]);

        Assert.AreEqual(4, cues.Count);
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.StaticArcs));
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.LightningFlashes));
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.ChargedGround));
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.StormPulse));
        Assert.IsTrue(cues.All(cue => Math.Abs(cue.Strength - 1) < 0.001));
    }
}
