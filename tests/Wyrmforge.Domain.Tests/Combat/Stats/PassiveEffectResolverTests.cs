using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Stats;

namespace Wyrmforge.Domain.Tests.Combat.Stats;

[TestClass]
public sealed class PassiveEffectResolverTests
{
    [TestMethod]
    public void ResolveDetonation_FourthHit_ReturnsAreaExplosion()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "detonation" });

        var effect = PassiveEffectResolver.ResolveDetonation(profile, 4);

        Assert.IsNotNull(effect);
        Assert.AreEqual(2d, effect.DamageMultiplier);
        Assert.AreEqual(58d, effect.Radius);
        Assert.IsNull(PassiveEffectResolver.ResolveDetonation(profile, 3));
    }

    [TestMethod]
    public void ResolveDetonation_WithVolcanicHeart_MakesExplosionLargerAndStronger()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "detonation", "volcanic" });

        var effect = PassiveEffectResolver.ResolveDetonation(profile, 4);

        Assert.IsNotNull(effect);
        Assert.AreEqual(2.5d, effect.DamageMultiplier);
        Assert.AreEqual(94d, effect.Radius);
    }

    [TestMethod]
    public void ResolveArcaneEchoScales_ArcaneEcho_FiresSingleReducedEcho()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "arcane-echo" });

        var scales = PassiveEffectResolver.ResolveArcaneEchoScales(profile, 4);

        CollectionAssert.AreEqual(new[] { 0.60d }, scales.ToArray());
    }

    [TestMethod]
    public void ResolveArcaneEchoScales_EchoChamber_FiresTwoFullEchoes()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "arcane-echo", "echo-chamber" });

        var scales = PassiveEffectResolver.ResolveArcaneEchoScales(profile, 4);

        CollectionAssert.AreEqual(new[] { 1d, 1d }, scales.ToArray());
    }

    [TestMethod]
    public void ResolveArcaneEchoScales_BeforeFourthCast_DoesNotEcho()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "arcane-echo" });

        var scales = PassiveEffectResolver.ResolveArcaneEchoScales(profile, 3);

        Assert.AreEqual(0, scales.Count);
    }

    [TestMethod]
    public void FrostIdentity_UsesFrequentFreezeAndMeaningfulFrozenPayoff()
    {
        Assert.AreEqual(3, PassiveEffectResolver.DeepFreezeHitInterval);
        Assert.AreEqual(1.75d, PassiveEffectResolver.DeepFreezeDurationSeconds);
        Assert.AreEqual(2.5d, PassiveEffectResolver.AbsoluteZeroDamageMultiplier);
        Assert.AreEqual(0.65d, PassiveEffectResolver.WinterShellGuardSeconds);
    }

    [TestMethod]
    public void ApplyIceArmor_ActiveBarrier_ReducesDamageByFortyPercent()
    {
        var profile = PassiveCombatProfile.Create(new HashSet<string> { "ice-armor" });

        var damage = PassiveEffectResolver.ApplyIceArmor(profile, true, 20);

        Assert.AreEqual(12d, damage);
        Assert.AreEqual(20d, PassiveEffectResolver.ApplyIceArmor(profile, false, 20));
    }
}
