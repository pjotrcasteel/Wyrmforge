using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Simulation;

namespace Wyrmforge.Application.Tests.Runs.Simulation;

[TestClass]
public sealed class AgentPerformanceMetricsTests
{
    [TestMethod]
    public void Inspect_RecentFrameCost_UsesSameRollingWindowForMeanAndP95()
    {
        var metrics = new AgentPerformanceMetrics();
        for (var i = 0; i < 128; i++)
            metrics.Record(10, 64, 32, 32, 2);

        for (var i = 0; i < 128; i++)
            metrics.Record(1, 64, 4, 2, 1);

        var snapshot = metrics.Inspect();
        Assert.AreEqual(256L, snapshot.Frames);
        Assert.AreEqual(1d, snapshot.MeanMilliseconds, 1e-9);
        Assert.AreEqual(1d, snapshot.P95Milliseconds, 1e-9);
        Assert.AreEqual(10d, snapshot.MaximumMilliseconds, 1e-9,
            "Maximum is a lifetime diagnostic; rolling p95 and mean are recent.");
        Assert.AreEqual(32, snapshot.MaxSightQueries);
        Assert.AreEqual(32, snapshot.MaxPathQueries);
        Assert.AreEqual(2, snapshot.MaxCommittedThreats);
        Assert.AreEqual(1, snapshot.CommittedThreats);
    }

    [TestMethod]
    public void Inspect_AfterWrapWithSpikes_ReportsRecentPressureRatherThanHistoricalAverage()
    {
        var metrics = new AgentPerformanceMetrics();
        for (var i = 0; i < 128; i++)
            metrics.Record(1, 64, 1, 0, 0);

        for (var i = 0; i < 127; i++)
            metrics.Record(2, 64, 1, 0, 0);
        metrics.Record(18, 64, 32, 32, 2);

        var snapshot = metrics.Inspect();
        Assert.AreEqual(2.125d, snapshot.MeanMilliseconds, 1e-9);
        Assert.AreEqual(2d, snapshot.P95Milliseconds, 1e-9);
        Assert.AreEqual(18d, snapshot.MaximumMilliseconds, 1e-9);
        Assert.AreEqual(32, snapshot.SightQueries);
    }

    [TestMethod]
    public void Record_RejectsInvalidTimingBeforePoisoningFutureStatistics()
    {
        var metrics = new AgentPerformanceMetrics();
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => metrics.Record(double.NaN, 1, 1, 1, 1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => metrics.Record(-1, 1, 1, 1, 1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => metrics.Record(1, 1, -1, 0, 0));
        Assert.AreEqual(0L, metrics.Inspect().Frames);
        metrics.Record(2.5, 1, 0, 0, 0);
        Assert.AreEqual(2.5d, metrics.Inspect().MeanMilliseconds, 1e-9);
    }
}
