using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Behaviors;

/// <summary>Shared deterministic decision primitives. Species own their considerations and committed action state.</summary>
public readonly record struct CreatureActionScore(string Action, double Score);
public static class CreatureDecisions
{
    public static string Choose(params CreatureActionScore[] choices) => choices
        .Where(choice => double.IsFinite(choice.Score) && choice.Score > 0)
        .OrderByDescending(choice => choice.Score).Select(choice => choice.Action).FirstOrDefault() ?? "approach";
    public static Vector2D Chase(Vector2D from, Vector2D target) => Vector2D.DirectionTo(from, target);
    public static Vector2D SurroundSlot(Vector2D target, double radius, double angle) =>
        target + new Vector2D(Math.Cos(angle), Math.Sin(angle)) * radius;
}
