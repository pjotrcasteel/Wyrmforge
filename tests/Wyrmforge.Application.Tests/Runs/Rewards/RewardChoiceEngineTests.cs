using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.Rewards;

namespace Wyrmforge.Application.Tests.Runs.Rewards;

[TestClass]
public sealed class RewardChoiceEngineTests
{
    [TestMethod]
    public void Roll_MultipleChoices_ReturnsWithoutReplacement()
    {
        var engine = new RewardChoiceEngine(new FixedRandomSource(0));
        RewardCandidate<string>[] candidates =
        [
            new("a", "A"),
            new("b", "B"),
            new("c", "C"),
        ];

        var result = engine.Roll(candidates, 3);

        Assert.HasCount(3, result);
        Assert.AreEqual(3, result.Select(candidate => candidate.Id).Distinct().Count());
    }

    [TestMethod]
    public void Roll_ExcludedCandidate_NeverReturnsExcludedId()
    {
        var engine = new RewardChoiceEngine(new FixedRandomSource(0));
        RewardCandidate<string>[] candidates =
        [
            new("a", "A"),
            new("b", "B"),
        ];

        var result = engine.Roll(candidates, 2, new HashSet<string> { "a" });

        Assert.HasCount(1, result);
        Assert.AreEqual("b", result[0].Id);
    }

    [TestMethod]
    public void Roll_RarityWeight_ChangesSelectionBoundary()
    {
        var engine = new RewardChoiceEngine(new FixedRandomSource(0.5));
        RewardCandidate<string>[] candidates =
        [
            new("common", "Common", RewardRarity.Common),
            new("rare", "Rare", RewardRarity.Rare),
        ];

        var result = engine.Roll(candidates, 1);

        Assert.AreEqual("common", result[0].Id);
    }

    [TestMethod]
    public void Roll_DuplicateCandidateIds_Throws()
    {
        var engine = new RewardChoiceEngine(new FixedRandomSource(0));
        RewardCandidate<string>[] candidates =
        [
            new("same", "A"),
            new("same", "B"),
        ];

        Assert.ThrowsException<InvalidOperationException>(() => engine.Roll(candidates, 1));
    }

    private sealed class FixedRandomSource(double value) : IRandomSource
    {
        public int Next(int exclusiveMax) => 0;
        public double NextDouble() => value;
    }
}
