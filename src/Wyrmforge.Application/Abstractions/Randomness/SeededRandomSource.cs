namespace Wyrmforge.Application.Abstractions.Randomness;

public sealed class SeededRandomSource(int seed) : IRandomSource
{
    private readonly Random random = new(seed);

    public int Next(int exclusiveMax) => random.Next(exclusiveMax);

    public double NextDouble() => random.NextDouble();
}
