using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.SelfPlay;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.SelfPlay;

[TestClass]
public sealed class RunSelfPlayTests
{
    [TestMethod]
    public void BuildCatalog_AllBuildsFitArcaneBudgetAndReachGoals()
    {
        foreach (var build in SelfPlayBuildCatalog.All)
        {
            Assert.IsLessThanOrEqualTo(24, build.SelectedNodes.Sum(id => Wyrmforge.Domain.Progression.PassiveTree.PassiveTreeCatalog.Get(id).Cost), build.Name);
            foreach (var goal in build.Goals) Assert.IsTrue(build.SelectedNodes.Contains(goal), $"{build.Name} does not contain {goal}.");
        }
    }

    [TestMethod]
    public void Play_SameSeedAndAgent_IsDeterministic()
    {
        var build = SelfPlayBuildCatalog.All.First();
        var first = Play(build, RunAgentPersonality.BuildFocused, 4242);
        var second = Play(build, RunAgentPersonality.BuildFocused, 4242);

        Assert.AreEqual(first.Outcome, second.Outcome);
        Assert.AreEqual(first.Depth, second.Depth);
        Assert.AreEqual(first.Score, second.Score);
        Assert.AreEqual(first.Kills, second.Kills);
        Assert.AreEqual(first.Level, second.Level);
        Assert.AreEqual(first.EssenceSecured, second.EssenceSecured);
        CollectionAssert.AreEqual(first.Decisions.ToArray(), second.Decisions.ToArray());
    }

    [TestMethod]
    public void Play_HeadlessAgent_ProgressesThroughRealRunState()
    {
        var build = SelfPlayBuildCatalog.All.First();
        var result = Play(build, RunAgentPersonality.Greedy, 1337);

        Assert.IsGreaterThan(0, result.SimulatedSeconds);
        Assert.IsGreaterThan(0, result.CompletedRouteNodes);
        Assert.IsGreaterThan(0, result.Kills);
        Assert.IsGreaterThan(0, result.TotalExperience);
        Assert.IsGreaterThan(0, result.Decisions.Count);
    }

    private static RunSelfPlayMetrics Play(SelfPlayBuildDefinition build, RunAgentPersonality personality, int seed)
    {
        var factory = new RunSimulationFactory(new SeededRandomSource(1));
        var simulation = factory.Create(build.SelectedNodes, seed: seed);
        var agent = new HeuristicRunAgent(personality, seed, build.PreferredSchool);
        return new RunSelfPlayDriver().Play(build.Name, seed, simulation, agent, new RunSelfPlayOptions(MaximumSimulatedSeconds: 240));
    }
}
