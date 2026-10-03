using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Application.Runs.Simulation;

public readonly record struct MovementInput(double X, double Y)
{
    public Vector2D Direction => new Vector2D(X, Y).Normalized();

    public bool IsMoving => Math.Abs(X) > double.Epsilon || Math.Abs(Y) > double.Epsilon;
}
