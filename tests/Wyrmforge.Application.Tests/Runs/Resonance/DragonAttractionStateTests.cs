using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Resonance;

[TestClass]
public sealed class DragonAttractionStateTests
{
    [TestMethod]
    public void Calculate_WithStrongFireResonance_StronglyFavorsAshfang()
    {
        var state = new DragonAttractionState();
        var resonance = Resonance(fire: 20, storm: 2);

        var attraction = state.Calculate(resonance);

        Assert.AreEqual(86, attraction.Single(entry => entry.Dragon == DragonId.Ashfang).Weight);
        Assert.AreEqual(14, attraction.Single(entry => entry.Dragon == DragonId.Stormcoil).Weight);
        Assert.AreEqual(0.86, attraction.Single(entry => entry.Dragon == DragonId.Ashfang).Probability, 0.0001);
    }

    [TestMethod]
    public void Calculate_WithStrongStormResonance_StronglyFavorsStormcoil()
    {
        var state = new DragonAttractionState();
        var resonance = Resonance(fire: 2, storm: 20);

        var attraction = state.Calculate(resonance);

        Assert.AreEqual(14, attraction.Single(entry => entry.Dragon == DragonId.Ashfang).Weight);
        Assert.AreEqual(86, attraction.Single(entry => entry.Dragon == DragonId.Stormcoil).Weight);
        Assert.AreEqual(0.86, attraction.Single(entry => entry.Dragon == DragonId.Stormcoil).Probability, 0.0001);
    }

    [TestMethod]
    public void Roll_WhenRollFallsInStormcoilWeight_ReturnsStormcoil()
    {
        var state = new DragonAttractionState();

        var dragon = state.Roll(Resonance(fire: 20, storm: 2), new FixedRandomSource(99));

        Assert.AreEqual(DragonId.Stormcoil, dragon);
    }

    private static IReadOnlyList<RunResonanceEntry> Resonance(int fire, int storm) =>
    [
        new(SpellSchool.Fire, fire),
        new(SpellSchool.Frost, 0),
        new(SpellSchool.Storm, storm),
        new(SpellSchool.Arcane, 0),
    ];

    private sealed class FixedRandomSource(int value) : IRandomSource
    {
        public int Next(int exclusiveMax) => Math.Min(value, exclusiveMax - 1);
        public double NextDouble() => 0;
    }
}
