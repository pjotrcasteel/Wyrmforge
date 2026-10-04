using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Tests.Progression.DragonEssences;

[TestClass]
public sealed class DragonEssenceModifiersTests
{
    [TestMethod]
    public void Aggregate_StaticEssenceModifiers_ComposesIndependentEffects()
    {
        DragonEssenceModifiers?[] modifiers =
        [
            DragonEssenceCatalog.Get(DragonEssenceId.RimeHeart).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.GlacialScale).Modifiers,
            DragonEssenceCatalog.Get(DragonEssenceId.VoidHeart).Modifiers,
        ];

        var result = DragonEssenceModifiers.Aggregate(modifiers);

        Assert.AreEqual(42, result.MaxHealthBonus);
        Assert.AreEqual(0.84, result.DamageTakenMultiplier, 0.0001);
        Assert.AreEqual(1.2, result.DamageMultiplier, 0.0001);
    }
}
