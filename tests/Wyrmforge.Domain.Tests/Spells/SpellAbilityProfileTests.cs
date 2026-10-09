using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Abilities;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Spells;

[TestClass]
public sealed class SpellAbilityProfileTests
{
    [TestMethod]
    public void ArcaneOrb_Profile_PreservesProjectileScaling()
    {
        var spell = SpellCatalog.Get(SpellId.ArcaneOrb);
        var projectile = (ProjectileAbilityProfile)spell.Ability.Delivery;

        Assert.AreEqual(0.65d, spell.Ability.CalculateCooldownSeconds(1), 0.0001);
        Assert.AreEqual(23.04d, spell.Ability.CalculateDamage(2), 0.0001);
        Assert.AreEqual(430d, projectile.CalculateSpeed(2), 0.0001);
        Assert.AreEqual(5d, projectile.Radius, 0.0001);
    }

    [TestMethod]
    public void FireBolt_Profile_PreservesProjectileScaling()
    {
        var spell = SpellCatalog.Get(SpellId.FireBolt);
        var projectile = (ProjectileAbilityProfile)spell.Ability.Delivery;

        Assert.AreEqual(1.012d, spell.Ability.CalculateCooldownSeconds(3), 0.0001);
        Assert.AreEqual(48d, spell.Ability.CalculateDamage(3), 0.0001);
        Assert.AreEqual(370d, projectile.CalculateSpeed(3), 0.0001);
        Assert.AreEqual(7d, projectile.Radius, 0.0001);
    }

    [TestMethod]
    public void FrostShard_Profile_PreservesProjectileScaling()
    {
        var spell = SpellCatalog.Get(SpellId.FrostShard);
        var projectile = (ProjectileAbilityProfile)spell.Ability.Delivery;

        Assert.AreEqual(0.836d, spell.Ability.CalculateCooldownSeconds(3), 0.0001);
        Assert.AreEqual(24d, spell.Ability.CalculateDamage(3), 0.0001);
        Assert.AreEqual(550d, projectile.CalculateSpeed(3), 0.0001);
    }

    [TestMethod]
    public void ChainLightning_Profile_PreservesChainScaling()
    {
        var spell = SpellCatalog.Get(SpellId.ChainLightning);
        var chain = (ChainAbilityProfile)spell.Ability.Delivery;

        Assert.AreEqual(1.188d, spell.Ability.CalculateCooldownSeconds(3), 0.0001);
        Assert.AreEqual(25d, spell.Ability.CalculateDamage(3), 0.0001);
        Assert.AreEqual(4, chain.CalculateJumps(3));
        Assert.AreEqual(0.84d, chain.DamageFalloff, 0.0001);
    }
}
