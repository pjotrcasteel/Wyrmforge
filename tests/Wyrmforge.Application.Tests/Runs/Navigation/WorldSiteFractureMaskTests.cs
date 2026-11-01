using System.Text.Json;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteFractureMaskTests
{
    [TestMethod]
    public void XyzFracture_ImmutableBitmaskCanRemoveEveryMicrocellWithoutDenseChildObjects()
    {
        var initial = default(WorldSiteFractureMask);
        var mask = initial;
        Assert.IsTrue(mask.IsEmpty);
        Assert.IsFalse(mask.IsFullyExcavated);

        for (var z = 0; z < 8; z++)
        for (var y = 0; y < 8; y++)
        for (var x = 0; x < 8; x++)
        {
            Assert.IsFalse(mask.IsRemoved(x, y, z));
            mask = mask.Remove(x, y, z);
            Assert.IsTrue(mask.IsRemoved(x, y, z));
            Assert.AreEqual(WorldSiteFractureGeometry.Pack(x, y, z) + 1,
                mask.RemovedMicrocellCount);
        }

        Assert.AreEqual(512, mask.RemovedMicrocellCount);
        Assert.IsTrue(mask.IsFullyExcavated);
        Assert.IsTrue(initial.IsEmpty, "Value copies cannot mutate intact C# world material.");
        Assert.AreEqual(mask, mask.Remove(7, 7, 7), "Repeating a hit cannot remove a second cube.");
    }

    [TestMethod]
    public void XyzFracture_OnlySelectedMicrocellsDisappearAndSaveJsonReplaysDeterministically()
    {
        var first = default(WorldSiteFractureMask)
            .Remove(3, 4, 7)
            .Remove(3, 4, 6)
            .Remove(4, 4, 7);
        Assert.AreEqual(3, first.RemovedMicrocellCount);
        Assert.IsTrue(first.IsRemoved(3, 4, 7));
        Assert.IsFalse(first.IsRemoved(3, 4, 5));
        Assert.IsFalse(first.IsRemoved(4, 4, 6));
        Assert.IsFalse(first.IsRemoved(2, 4, 7));

        var json = JsonSerializer.Serialize(first);
        Assert.AreEqual(first, JsonSerializer.Deserialize<WorldSiteFractureMask>(json));
        Assert.AreEqual(json, JsonSerializer.Serialize(JsonSerializer.Deserialize<WorldSiteFractureMask>(json)));
        Assert.AreEqual(first, default(WorldSiteFractureMask)
            .Remove(4, 4, 7).Remove(3, 4, 6).Remove(3, 4, 7),
            "Only final removed coordinates determine the immutable occupancy mask.");

        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => first.Remove(-1, 0, 0));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => first.Remove(0, 8, 0));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => first.IsRemoved(0, 0, 8));
    }
}
