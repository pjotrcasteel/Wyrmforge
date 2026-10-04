using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class DragonSignStateTests
{
    [TestMethod]
    public void Calculate_BeforeFirstTrail_ReturnsNoSigns()
    {
        var state = new DragonSignState();

        var signs = state.Calculate(Attraction(86, 14), 0, null);

        Assert.AreEqual(0, signs.Count);
    }

    [TestMethod]
    public void Calculate_StrongAshfangAttentionAfterFirstTrail_ReturnsFaintFireSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate(Attraction(86, 14), 1, null).Single();

        Assert.AreEqual(SpellSchool.Fire, sign.School);
        Assert.AreEqual(DragonSignIntensity.Faint, sign.Intensity);
        Assert.AreEqual("Warm ash", sign.Title);
    }

    [TestMethod]
    public void Calculate_CloseAttentionAfterThirdTrail_ReturnsCompetingSigns()
    {
        var state = new DragonSignState();

        var signs = state.Calculate(Attraction(54, 46), 3, null);

        Assert.AreEqual(2, signs.Count);
        Assert.AreEqual(SpellSchool.Fire, signs[0].School);
        Assert.AreEqual(DragonSignIntensity.Ominous, signs[0].Intensity);
        Assert.AreEqual(SpellSchool.Storm, signs[1].School);
        Assert.AreEqual(DragonSignIntensity.Growing, signs[1].Intensity);
    }

    [TestMethod]
    public void Calculate_ResolvedStormcoilAfterFourthTrail_ReturnsOnlyImminentStormSign()
    {
        var state = new DragonSignState();

        var sign = state.Calculate(Attraction(86, 14), 4, DragonId.Stormcoil).Single();

        Assert.AreEqual(SpellSchool.Storm, sign.School);
        Assert.AreEqual(DragonSignIntensity.Imminent, sign.Intensity);
        Assert.AreEqual("The storm circles", sign.Title);
    }

    private static IReadOnlyList<DragonAttractionEntry> Attraction(int ashfangWeight, int stormcoilWeight)
    {
        var total = ashfangWeight + stormcoilWeight;
        return
        [
            new DragonAttractionEntry(DragonId.Ashfang, ashfangWeight, ashfangWeight / (double)total),
            new DragonAttractionEntry(DragonId.Stormcoil, stormcoilWeight, stormcoilWeight / (double)total),
        ];
    }
}
