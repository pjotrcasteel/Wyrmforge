using System.Collections.Immutable;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Domain.Agents;

namespace Wyrmforge.Domain.Tests.Agents;

[TestClass]
public sealed class CivilianActivitySelectorTests
{
    [TestMethod]
    public void Select_ClosedOrOccupiedPlaces_ChoosesAvailableActivity()
    {
        var result = CivilianActivitySelector.Select([
            new("forge", CivilianActivity.Work, 10, false, true),
            new("bench", CivilianActivity.Rest, 5, true, false),
            new("square", CivilianActivity.Socialize, 2, true, true)]);
        Assert.AreEqual("square", result.PlaceId);
        Assert.AreEqual(CivilianActivity.Socialize, result.Activity);
        Assert.AreEqual(2, result.Alternatives.Count(a => !a.Allowed));
    }

    [TestMethod]
    public void Select_NoAvailablePlace_WaitsWithoutInventingDestination()
    {
        var result = CivilianActivitySelector.Select([new("forge", CivilianActivity.Work, 10, false, true)]);
        Assert.IsNull(result.PlaceId);
        Assert.AreEqual(CivilianActivity.Wait, result.Activity);
    }

    [TestMethod]
    public void Select_EqualUtilities_IsIndependentOfInputOrder()
    {
        ImmutableArray<CivilianActivityOption> options = [
            new("west", CivilianActivity.Visit, 2, true, true),
            new("east", CivilianActivity.Work, 2, true, true)];
        var first = CivilianActivitySelector.Select(options);
        var second = CivilianActivitySelector.Select(options.Reverse().ToImmutableArray());
        Assert.AreEqual("east", first.PlaceId);
        Assert.AreEqual(first.PlaceId, second.PlaceId);
        CollectionAssert.AreEqual(first.Alternatives.ToArray(), second.Alternatives.ToArray());
    }
}
