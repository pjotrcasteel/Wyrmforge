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
    public void Calculate_WithFourSchools_ReturnsOneWyrmPerSchool()
    {
        var state = new DragonAttractionState();

        var attraction = state.Calculate(Resonance(fire: 20, frost: 8, storm: 2, arcane: 5));

        Assert.AreEqual(4, attraction.Count);
        Assert.AreEqual(86, attraction.Single(entry => entry.Dragon == DragonId.Ashfang).Weight);
        Assert.AreEqual(38, attraction.Single(entry => entry.Dragon == DragonId.Rimeclaw).Weight);
        Assert.AreEqual(14, attraction.Single(entry => entry.Dragon == DragonId.Stormcoil).Weight);
        Assert.AreEqual(26, attraction.Single(entry => entry.Dragon == DragonId.Voidweaver).Weight);
        Assert.AreEqual(1, attraction.Sum(entry => entry.Probability), 0.0001);
    }

    [TestMethod]
    public void Calculate_WithStrongFrostResonance_StronglyFavorsRimeclaw()
    {
        var state = new DragonAttractionState();

        var attraction = state.Calculate(Resonance(fire: 0, frost: 20, storm: 0, arcane: 0));

        Assert.AreEqual(86, attraction.Single(entry => entry.Dragon == DragonId.Rimeclaw).Weight);
        Assert.IsTrue(attraction.Single(entry => entry.Dragon == DragonId.Rimeclaw).Probability > 0.75);
    }

    [TestMethod]
    public void Calculate_AfterAshfangWasDefeated_ExcludesAshfangFromNextDepth()
    {
        var state = new DragonAttractionState();
        var excluded = new HashSet<DragonId> { DragonId.Ashfang };

        var attraction = state.Calculate(Resonance(fire: 20, frost: 2, storm: 2, arcane: 2), excluded);

        Assert.IsFalse(attraction.Any(entry => entry.Dragon == DragonId.Ashfang));
        Assert.AreEqual(3, attraction.Count);
        Assert.AreEqual(1, attraction.Sum(entry => entry.Probability), 0.0001);
    }

    [TestMethod]
    public void Roll_WhenOnlyVoidweaverRemains_ReturnsVoidweaver()
    {
        var state = new DragonAttractionState();
        var excluded = new HashSet<DragonId> { DragonId.Ashfang, DragonId.Stormcoil, DragonId.Rimeclaw };

        var dragon = state.Roll(Resonance(0, 0, 0, 0), new FixedRandomSource(0), excluded);

        Assert.AreEqual(DragonId.Voidweaver, dragon);
    }

    private static IReadOnlyList<RunResonanceEntry> Resonance(int fire, int frost, int storm, int arcane) =>
    [
        new(SpellSchool.Fire, fire),
        new(SpellSchool.Frost, frost),
        new(SpellSchool.Storm, storm),
        new(SpellSchool.Arcane, arcane),
    ];

    private sealed class FixedRandomSource(int value) : IRandomSource
    {
        public int Next(int exclusiveMax) => Math.Min(value, exclusiveMax - 1);
        public double NextDouble() => 0;
    }
}
