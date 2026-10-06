using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Tests.TestDoubles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class RunEvaluationSummaryTests
{
    [TestMethod]
    public void CreateEvaluationSummary_NewRun_CapturesSeedAndStartingBuild()
    {
        var random = new FirstRandomSource();
        var simulation = new RunSimulation(new HashSet<string>(), new LevelChoiceService(random), random);
        simulation.InitializeRunSeed(4242);
        simulation.InitializeResonance(new HashSet<string>());

        var summary = simulation.CreateEvaluationSummary();

        Assert.AreEqual(4242, summary.Seed);
        Assert.AreEqual(1, summary.SpellLoadout.Count);
        Assert.AreEqual(SpellId.ArcaneOrb, summary.SpellLoadout[0].Id);
        Assert.AreEqual(1, summary.SpellLoadout[0].Rank);
        Assert.AreEqual(0, summary.CompletedRouteNodes);
        Assert.AreEqual(0, summary.RareRouteNodes);
    }

    [TestMethod]
    public void SeededRandomSource_SameSeed_ProducesSameSequence()
    {
        var first = new SeededRandomSource(1337);
        var second = new SeededRandomSource(1337);

        var firstSequence = Enumerable.Range(0, 8).Select(_ => (first.Next(1000), first.NextDouble())).ToArray();
        var secondSequence = Enumerable.Range(0, 8).Select(_ => (second.Next(1000), second.NextDouble())).ToArray();

        CollectionAssert.AreEqual(firstSequence, secondSequence);
    }
}
