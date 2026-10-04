using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class DragonSignStateTests
{
    [TestMethod]
    public void Calculate_FaintAshfangAttention_ReturnsWarmAshSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate([new DragonAttention(DragonId.Ashfang, DragonAttentionIntensity.Faint)]).Single();

        Assert.AreEqual(SpellSchool.Fire, sign.School);
        Assert.AreEqual("Warm ash", sign.Title);
    }

    [TestMethod]
    public void Calculate_ImminentRimeclawAttention_ReturnsFrozenTrailSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate([new DragonAttention(DragonId.Rimeclaw, DragonAttentionIntensity.Imminent)]).Single();

        Assert.AreEqual(SpellSchool.Frost, sign.School);
        Assert.AreEqual("The trail freezes behind you", sign.Title);
    }

    [TestMethod]
    public void Calculate_OminousVoidweaverAttention_ReturnsWeightlessStonesSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate([new DragonAttention(DragonId.Voidweaver, DragonAttentionIntensity.Ominous)]).Single();

        Assert.AreEqual(SpellSchool.Arcane, sign.School);
        Assert.AreEqual("Weightless stones", sign.Title);
    }
}
