using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Combat.Damage;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Domain.Tests.Combat;

[TestClass]
public sealed class CombatDamageTraitsTests
{
    [TestMethod]
    public void Fireball_FireAndExplosion_AreIndependentAndComposable()
    {
        var fireball = CombatDamageProfile.ForSpell(SpellId.FireBolt);
        Assert.IsTrue((fireball & CombatDamageTraits.Fire) != 0);
        Assert.IsTrue((fireball & CombatDamageTraits.Explosive) != 0);
        Assert.IsTrue(CombatDamageProfile.IsIncendiaryBlast(fireball));
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(CombatDamageTraits.Fire));
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(CombatDamageTraits.Explosive));
    }

    [TestMethod]
    public void OtherSchoolsAndCinderNeedle_DoNotGetFreeExplosiveFinishers()
    {
        var needle = CombatDamageProfile.ForSpell(SpellId.CinderNeedle);
        Assert.IsTrue((needle & CombatDamageTraits.Fire) != 0);
        Assert.IsTrue((needle & CombatDamageTraits.Piercing) != 0);
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(needle));
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(CombatDamageProfile.ForSpell(SpellId.FrostShard)));
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(CombatDamageProfile.ForSpell(SpellId.ChainLightning)));
        Assert.IsFalse(CombatDamageProfile.IsIncendiaryBlast(CombatDamageProfile.ForSpell(SpellId.ArcaneOrb)));
    }
}
