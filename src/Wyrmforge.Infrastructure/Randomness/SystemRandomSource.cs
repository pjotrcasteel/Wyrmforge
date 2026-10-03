using Wyrmforge.Application.Abstractions.Randomness;

namespace Wyrmforge.Infrastructure.Randomness;

public sealed class SystemRandomSource : IRandomSource
{
    public int Next(int exclusiveMax) => Random.Shared.Next(exclusiveMax);
}
