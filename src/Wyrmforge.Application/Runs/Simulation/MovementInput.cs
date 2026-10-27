using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Version 3 input: optional prop focus preserves the original movement and manual-aim contracts.</summary>
public readonly record struct MovementInput(double X, double Y, double AimX = 0, double AimY = 0, int? FocusPropId = null)
{
    public const int CurrentVersion = 3;
    public Vector2D Direction => new Vector2D(X, Y).Normalized();
    public bool IsMoving => Math.Abs(X) > double.Epsilon || Math.Abs(Y) > double.Epsilon;
    public bool HasManualAim => double.IsFinite(AimX) && double.IsFinite(AimY) && Math.Sqrt(AimX * AimX + AimY * AimY) > 0.01;
    public Vector2D AimDirection => HasManualAim ? new Vector2D(AimX, AimY).Normalized() : Vector2D.Zero;
}
