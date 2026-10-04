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

        Assert.AreEqual(DragonId.Ashfang, sign.Dragon);
        Assert.AreEqual(SpellSchool.Fire, sign.School);
        Assert.AreEqual(DragonAttentionIntensity.Faint, sign.Intensity);
        Assert.AreEqual("Warm ash", sign.Title);
    }

    [TestMethod]
    public void Calculate_CompetingAttention_ReturnsNarrativeSignsInAttentionOrder()
    {
        var state = new DragonSignState();
        DragonAttention[] attention =
        [
            new(DragonId.Ashfang, DragonAttentionIntensity.Ominous),
            new(DragonId.Stormcoil, DragonAttentionIntensity.Growing),
        ];

        var signs = state.Calculate(attention);

        Assert.AreEqual(2, signs.Count);
        Assert.AreEqual("A furnace breath", signs[0].Title);
        Assert.AreEqual("Distant thunder", signs[1].Title);
    }

    [TestMethod]
    public void Calculate_ImminentStormcoilAttention_ReturnsStormCirclesSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate([new DragonAttention(DragonId.Stormcoil, DragonAttentionIntensity.Imminent)]).Single();

        Assert.AreEqual(DragonId.Stormcoil, sign.Dragon);
        Assert.AreEqual(SpellSchool.Storm, sign.School);
        Assert.AreEqual(DragonAttentionIntensity.Imminent, sign.Intensity);
        Assert.AreEqual("The storm circles", sign.Title);
    }
}
