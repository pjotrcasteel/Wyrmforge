using Wyrmforge.Application.Abstractions.Randomness;

namespace Wyrmforge.Application.Tests.TestDoubles;

internal sealed class FirstRandomSource : IRandomSource
{
    public int Next(int exclusiveMax) => 0;

    public double NextDouble() => 0;
}
