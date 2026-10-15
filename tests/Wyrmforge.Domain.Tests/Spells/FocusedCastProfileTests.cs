using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class FocusedCastProfileTests
{
    [TestMethod]
    [DataRow(SpellId.ArcaneOrb)]
    [DataRow(SpellId.FireBolt)]
    [DataRow(SpellId.FrostShard)]
    [DataRow(SpellId.ChainLightning)]
    [DataRow(SpellId.CinderNeedle)]
    [DataRow(SpellId.IceLance)]
    [DataRow(SpellId.BallLightning)]
    [DataRow(SpellId.AetherDart)]
    public void For_AllSpells_PreservesRankOneAndEarnsMoreDamageAtHigherRanks(SpellId id)
    {
        var spell = SpellCatalog.Get(id);
        Assert.AreEqual(spell.Ability.CalculateDamage(1), FocusedCastProfile.CalculateDamage(spell, 1));
        Assert.IsTrue(FocusedCastProfile.CalculateDamage(spell, 2) > spell.Ability.CalculateDamage(2));
        Assert.IsTrue(FocusedCastProfile.CalculateDamage(spell, 3) > FocusedCastProfile.CalculateDamage(spell, 2));
        Assert.AreEqual(0, FocusedCastProfile.For(id, 1).BonusPierces);
        Assert.AreEqual(0, FocusedCastProfile.For(id, 1).BonusChains);
    }

    [TestMethod]
    public void For_MasteredSchools_UseDifferentCoverageMechanics()
    {
        Assert.IsTrue(FocusedCastProfile.For(SpellId.FireBolt, 3).SplashRadius > 0);
        Assert.IsTrue(FocusedCastProfile.For(SpellId.FrostShard, 3).BonusPierces > 0);
        Assert.IsTrue(FocusedCastProfile.For(SpellId.ChainLightning, 3).BonusChains > 0);
        Assert.IsTrue(FocusedCastProfile.For(SpellId.ArcaneOrb, 3).RadiusMultiplier > 1);
        Assert.AreEqual(0, FocusedCastProfile.For(SpellId.FireBolt, 3).BonusPierces);
        Assert.AreEqual(0, FocusedCastProfile.For(SpellId.FrostShard, 3).SplashRadius);
    }
}
