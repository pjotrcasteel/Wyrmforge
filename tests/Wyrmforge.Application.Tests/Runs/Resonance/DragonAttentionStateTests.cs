using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class DragonAttentionStateTests
{
    [TestMethod]
    public void Calculate_BeforeFirstTrail_ReturnsNoAttention()
    {
        var state = new DragonAttentionState();

        var attention = state.Calculate(Attraction(86, 14), 0, null);

        Assert.AreEqual(0, attention.Count);
    }

    [TestMethod]
    public void Calculate_StrongAshfangAttentionAfterFirstTrail_ReturnsFaintLeader()
    {
        var state = new DragonAttentionState();

        var attention = state.Calculate(Attraction(86, 14), 1, null).Single();

        Assert.AreEqual(DragonId.Ashfang, attention.Dragon);
        Assert.AreEqual(DragonAttentionIntensity.Faint, attention.Intensity);
    }

    [TestMethod]
    public void Calculate_CloseAttentionAfterThirdTrail_ReturnsLeaderAndRival()
    {
        var state = new DragonAttentionState();

        var attention = state.Calculate(Attraction(54, 46), 3, null);

        Assert.AreEqual(2, attention.Count);
        Assert.AreEqual(new DragonAttention(DragonId.Ashfang, DragonAttentionIntensity.Ominous), attention[0]);
        Assert.AreEqual(new DragonAttention(DragonId.Stormcoil, DragonAttentionIntensity.Growing), attention[1]);
    }

    [TestMethod]
    public void Calculate_ResolvedStormcoilAfterFourthTrail_ReturnsOnlyImminentStormcoil()
    {
        var state = new DragonAttentionState();

        var attention = state.Calculate(Attraction(86, 14), 4, DragonId.Stormcoil).Single();

        Assert.AreEqual(DragonId.Stormcoil, attention.Dragon);
        Assert.AreEqual(DragonAttentionIntensity.Imminent, attention.Intensity);
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
