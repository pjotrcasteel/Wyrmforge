namespace Wyrmforge.Application.Abstractions.Randomness;

public interface IRandomSource
{
    int Next(int exclusiveMax);
}
