using Microsoft.VisualStudio.TestTools.UnitTesting;
using Wyrmforge.Application.Runs.Navigation;

namespace Wyrmforge.Application.Tests.Runs.Navigation;

[TestClass]
public sealed class WorldSiteFractureGeometryTests
{
    [TestMethod]
    public void XyzFracture_OneMetreBlockDividesIntoEightIntegerAlignedFourPixelMicrocellsPerEdge()
    {
        Assert.AreEqual(1d, WorldSiteStrataGrid.BlockEdgeMeters);
        Assert.AreEqual(32, WorldSiteStrataGrid.NativeSourceTilePixels);
        Assert.AreEqual(8, WorldSiteFractureGeometry.MicrocellsPerEdge);
        Assert.AreEqual(512, WorldSiteFractureGeometry.MicrocellsPerBlock);
        Assert.AreEqual(.125d, WorldSiteFractureGeometry.MicrocellEdgeMeters);
        Assert.AreEqual(4, WorldSiteFractureGeometry.SourcePixelsPerMicrocell);

        var indices = new HashSet<int>();
        for (var z = 0; z < 8; z++)
        for (var y = 0; y < 8; y++)
        for (var x = 0; x < 8; x++)
        {
            var index = WorldSiteFractureGeometry.Pack(x, y, z);
            Assert.IsTrue(indices.Add(index), "Every microcell must have a unique sparse address.");
            var cell = WorldSiteFractureGeometry.Unpack(index);
            Assert.AreEqual(new WorldSiteFractureCellAddress(x, y, z), cell);
            Assert.AreEqual(4 * x, cell.SourcePixelX);
            Assert.AreEqual(4 * y, cell.SourcePixelY);
            Assert.AreEqual(4 * z, cell.SourcePixelZ);
            Assert.IsTrue(cell.SourcePixelX + 4 <= 32);
            Assert.IsTrue(cell.SourcePixelY + 4 <= 32);
            Assert.IsTrue(cell.SourcePixelZ + 4 <= 32);
        }

        Assert.AreEqual(512, indices.Count);
        CollectionAssert.AreEqual(Enumerable.Range(0, 512).ToArray(), indices.OrderBy(i => i).ToArray());
        Assert.AreEqual(64, WorldSiteFractureGeometry.MicrocellsPerBlock / 8,
            "A damaged-block bitmask can fit in 64 bytes rather than 512 objects.");
    }

    [TestMethod]
    public void XyzFracture_RejectsOutOfBlockAddressesWithoutWrappingIntoNeighbors()
    {
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Pack(-1, 0, 0));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Pack(8, 0, 0));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Pack(0, 8, 0));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Pack(0, 0, 8));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Unpack(-1));
        Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => WorldSiteFractureGeometry.Unpack(512));
        Assert.AreEqual(0, WorldSiteFractureGeometry.Pack(0, 0, 0));
        Assert.AreEqual(511, WorldSiteFractureGeometry.Pack(7, 7, 7));
    }
}
