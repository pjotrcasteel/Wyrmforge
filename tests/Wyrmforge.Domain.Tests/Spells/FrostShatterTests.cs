using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FrostShatterTests
{
    [TestMethod]
    public void OnlyFrostShardKillsOnFrozenTargetsShatter()
    {
        Assert.IsTrue(FrostShatter.Triggers(SpellId.FrostShard, targetFrozen: true));
        Assert.IsFalse(FrostShatter.Triggers(SpellId.FrostShard, targetFrozen: false));
        Assert.IsFalse(FrostShatter.Triggers(SpellId.ChainLightning, targetFrozen: true));
        Assert.IsFalse(FrostShatter.Triggers(SpellId.FireBolt, targetFrozen: true));
        Assert.IsFalse(FrostShatter.Triggers(SpellId.ArcaneOrb, targetFrozen: true));
    }

    [TestMethod]
    public void ShatterDamageScalesWithTheShatteredEnemysMaximumHealth()
    {
        Assert.AreEqual(60 * FrostShatter.DamageFraction, FrostShatter.Damage(60), 1e-9);
        Assert.AreEqual(2 * FrostShatter.Damage(60), FrostShatter.Damage(120), 1e-9);
        Assert.AreEqual(0, FrostShatter.Damage(-5));
    }
}
