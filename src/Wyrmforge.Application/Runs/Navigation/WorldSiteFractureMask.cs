using System.Numerics;

namespace Wyrmforge.Application.Runs.Navigation;

/// <summary>
/// One allocation-free 512-bit value for a modified 1m terrain block, with eight
/// physical Z slices of 8x8 microcells. A set bit means that local 12.5cm cube
/// has been excavated; an absent mask means the original C# block is intact.
/// This is only immutable C# fracture data, not a separate damage, collider,
/// navigation, lighting or debris engine. No scene objects are created here.
/// </summary>
public readonly record struct WorldSiteFractureMask(
    ulong Z0,
    ulong Z1,
    ulong Z2,
    ulong Z3,
    ulong Z4,
    ulong Z5,
    ulong Z6,
    ulong Z7)
{
    public int RemovedMicrocellCount => BitOperations.PopCount(Z0) + BitOperations.PopCount(Z1) +
        BitOperations.PopCount(Z2) + BitOperations.PopCount(Z3) + BitOperations.PopCount(Z4) +
        BitOperations.PopCount(Z5) + BitOperations.PopCount(Z6) + BitOperations.PopCount(Z7);

    public bool IsEmpty => RemovedMicrocellCount == 0;
    public bool IsFullyExcavated => RemovedMicrocellCount == WorldSiteFractureGeometry.MicrocellsPerBlock;

    /// <summary>Query the current C# removal bit at one bounded local XYZ microcell.</summary>
    public bool IsRemoved(int x, int y, int z)
    {
        var index = WorldSiteFractureGeometry.Pack(x, y, z);
        var layer = LayerAt(z);
        return (layer & (1UL << (index & 63))) != 0;
    }

    /// <summary>
    /// Return a new 64-byte mask after removing one local cube. Re-removing the
    /// same microcell is idempotent and can never damage a neighboring block.
    /// </summary>
    public WorldSiteFractureMask Remove(int x, int y, int z)
    {
        var index = WorldSiteFractureGeometry.Pack(x, y, z);
        var bit = 1UL << (index & 63);
        return z switch
        {
            0 => this with { Z0 = Z0 | bit },
            1 => this with { Z1 = Z1 | bit },
            2 => this with { Z2 = Z2 | bit },
            3 => this with { Z3 = Z3 | bit },
            4 => this with { Z4 = Z4 | bit },
            5 => this with { Z5 = Z5 | bit },
            6 => this with { Z6 = Z6 | bit },
            7 => this with { Z7 = Z7 | bit },
            _ => throw new ArgumentOutOfRangeException(nameof(z)),
        };
    }

    private ulong LayerAt(int z) => z switch
    {
        0 => Z0,
        1 => Z1,
        2 => Z2,
        3 => Z3,
        4 => Z4,
        5 => Z5,
        6 => Z6,
        7 => Z7,
        _ => throw new ArgumentOutOfRangeException(nameof(z)),
    };
}
