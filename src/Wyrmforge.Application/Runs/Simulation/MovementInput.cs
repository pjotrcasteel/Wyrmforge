using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Version 2 input: zero/default aim preserves version 1 automatic targeting.</summary>
public readonly record struct MovementInput(double X, double Y, double AimX = 0, double AimY = 0)
{
    public const int CurrentVersion = 2;
    public Vector2D Direction => new Vector2D(X, Y).Normalized();
    public bool IsMoving => Math.Abs(X) > double.Epsilon || Math.Abs(Y) > double.Epsilon;
    public bool HasManualAim => double.IsFinite(AimX) && double.IsFinite(AimY) && Math.Sqrt(AimX * AimX + AimY * AimY) > 0.01;
    public Vector2D AimDirection => HasManualAim ? new Vector2D(AimX, AimY).Normalized() : Vector2D.Zero;
}
