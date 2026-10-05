using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;
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
        var modifiers = state.CalculateEncounterModifiers(Array.Empty<DragonAttention>());

        Assert.AreEqual(0, cues.Count);
        Assert.AreEqual(0, modifiers.Count);
    }

    [TestMethod]
    public void Calculate_FaintAshfangAttention_ReturnsOnlyAshfall()
    {
        var state = new RealmInfluenceState();

        var cue = state.Calculate([new DragonAttention(DragonId.Ashfang, DragonAttentionIntensity.Faint)]).Single();

        Assert.AreEqual(RealmInfluenceEffect.Ashfall, cue.Effect);
        Assert.AreEqual(0.25, cue.Strength, 0.001);
    }

    [TestMethod]
    public void Calculate_ImminentStormcoilAttention_ReturnsFullStormProfile()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate([new DragonAttention(DragonId.Stormcoil, DragonAttentionIntensity.Imminent)]);

        Assert.AreEqual(4, cues.Count);
        Assert.IsTrue(cues.Any(cue => cue.Effect == RealmInfluenceEffect.StormPulse));
    }

    [TestMethod]
    public void Calculate_ImminentRimeclawAttention_ReturnsFullFrostProfile()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate([new DragonAttention(DragonId.Rimeclaw, DragonAttentionIntensity.Imminent)]);

        Assert.AreEqual(4, cues.Count);
        CollectionAssert.AreEquivalent(
            new[] { RealmInfluenceEffect.FrostMotes, RealmInfluenceEffect.RimeVeins, RealmInfluenceEffect.ColdHaze, RealmInfluenceEffect.IcePulse },
            cues.Select(cue => cue.Effect).ToArray());
    }

    [TestMethod]
    public void Calculate_ImminentVoidweaverAttention_ReturnsFullArcaneProfile()
    {
        var state = new RealmInfluenceState();

        var cues = state.Calculate([new DragonAttention(DragonId.Voidweaver, DragonAttentionIntensity.Imminent)]);

        Assert.AreEqual(4, cues.Count);
        CollectionAssert.AreEquivalent(
            new[] { RealmInfluenceEffect.AetherMotes, RealmInfluenceEffect.RealityFractures, RealmInfluenceEffect.VoidHaze, RealmInfluenceEffect.ArcanePulse },
            cues.Select(cue => cue.Effect).ToArray());
    }

    [TestMethod]
    public void CalculateEncounterModifiers_GrowingRimeclaw_StacksMobilityPressure()
    {
        var state = new RealmInfluenceState();

        var modifiers = state.CalculateEncounterModifiers([new DragonAttention(DragonId.Rimeclaw, DragonAttentionIntensity.Growing)]);
        var combined = WyrmrealmEncounterModifierSet.Aggregate(modifiers);

        Assert.AreEqual(2, modifiers.Count);
        Assert.AreEqual(0.9212d, combined.PlayerMoveSpeedMultiplier, 0.0001);
    }

    [TestMethod]
    public void CalculateEncounterModifiers_GrowingVoidweaver_ActivatesUnstableRifts()
    {
        var state = new RealmInfluenceState();

        var modifiers = state.CalculateEncounterModifiers([new DragonAttention(DragonId.Voidweaver, DragonAttentionIntensity.Growing)]);
        var combined = WyrmrealmEncounterModifierSet.Aggregate(modifiers);

        Assert.AreEqual(1.04d, combined.ThreatBudgetMultiplier, 0.0001);
        Assert.IsTrue(combined.TryGetHazardInterval(WyrmrealmHazardKind.UnstableRifts, out var interval));
        Assert.AreEqual(1d, interval, 0.0001);
    }

    [TestMethod]
    public void CalculateEncounterModifiers_RivalAttention_ComposesBothWyrms()
    {
        var state = new RealmInfluenceState();
        DragonAttention[] attention =
        [
            new(DragonId.Ashfang, DragonAttentionIntensity.Faint),
            new(DragonId.Stormcoil, DragonAttentionIntensity.Faint),
        ];

        var combined = WyrmrealmEncounterModifierSet.Aggregate(state.CalculateEncounterModifiers(attention));

        Assert.AreEqual(1.03d, combined.DamageTakenMultiplier, 0.0001);
        Assert.AreEqual(1.04d, combined.EnemySpeedMultiplier, 0.0001);
    }
}
