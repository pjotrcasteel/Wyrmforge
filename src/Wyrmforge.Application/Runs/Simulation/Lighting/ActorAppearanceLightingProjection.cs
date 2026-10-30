using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// Projects authored actor appearance lights into the same authoritative scene as spell and boss emitters.
/// Only the nearest few sources receive a local light; self-illumination remains a material concern.
/// </summary>
public static class ActorAppearanceLightingProjection
{
    private const int MaximumLocalActorLights = 2;

    /// <summary>Returns stable owner-bound, non-shadow-casting eye lights for living Ashlings near the player.</summary>
    public static IReadOnlyList<LightingEmitter> Capture(IEnumerable<EnemyState> actors, double viewerX, double viewerY)
    {
        ArgumentNullException.ThrowIfNull(actors);

        return actors
            .Where(actor => actor.Kind == EnemyKind.Ashling && actor.Health > 0)
            .OrderBy(actor => Math.Pow(actor.Position.X - viewerX, 2) + Math.Pow(actor.Position.Y - viewerY, 2))
            .ThenBy(actor => actor.Id)
            .Take(MaximumLocalActorLights)
            .Select(actor => new LightingEmitter(
                $"actor-eye:{actor.Id}", $"actor:{actor.Id}", "point",
                actor.Position.X, actor.Position.Y, actor.Radius * 3.1,
                "#ff9d53", .30, actor.Radius * 3.2, CastsShadows: false))
            .ToArray();
    }
}
