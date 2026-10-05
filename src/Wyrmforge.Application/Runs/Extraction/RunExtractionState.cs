using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Extraction;

public sealed class RunExtractionState
{
    public const double DurationSeconds = 10;
    public const double Radius = 96;

    public bool IsActive { get; private set; }
    public bool IsProgressing { get; private set; }
    public Vector2D Position { get; private set; } = Vector2D.Zero;
    public double RemainingSeconds { get; private set; }

    public bool Start(Vector2D position)
    {
        if (IsActive) return false;
        IsActive = true;
        IsProgressing = true;
        Position = position;
        RemainingSeconds = DurationSeconds;
        return true;
    }

    public bool Tick(double delta, Vector2D playerPosition)
    {
        if (!IsActive) return false;
        IsProgressing = Vector2D.Distance(playerPosition, Position) <= Radius;
        if (!IsProgressing) return false;
        RemainingSeconds = Math.Max(0, RemainingSeconds - Math.Max(0, delta));
        if (RemainingSeconds > 0) return false;
        IsActive = false;
        IsProgressing = false;
        return true;
    }

    public void Cancel()
    {
        IsActive = false;
        IsProgressing = false;
        Position = Vector2D.Zero;
        RemainingSeconds = 0;
    }
}
