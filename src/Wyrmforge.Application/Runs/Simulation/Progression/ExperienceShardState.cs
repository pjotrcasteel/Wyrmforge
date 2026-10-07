using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class ExperienceShardState(Vector2D position, int value)
{
    public Vector2D Position { get; set; } = position;
    public int Value { get; private set; } = value;

    public void Absorb(Vector2D position, int value)
    {
        if (value <= 0) return;
        var total = Value + value;
        Position = new Vector2D(((Position.X * Value) + (position.X * value)) / total, ((Position.Y * Value) + (position.Y * value)) / total);
        Value = total;
    }
}
