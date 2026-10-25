using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Pure projection of authoritative projectile state. No renderer clock or effects are created.</summary>
public static class ProjectileLightingProjection
{
    public static LightingEmitter? FromProjectile(ProjectileState projectile, string stableId)
    {
        if (projectile.Spell is not (SpellId.FireBolt or SpellId.CinderNeedle))
            return null;

        return new LightingEmitter(
            Id: $"projectile:{stableId}",
            OwnerId: stableId,
            Type: "point",
            X: projectile.Position.X,
            Y: projectile.Position.Y,
            Z: 0,
            Color: "#ff7835",
            Intensity: 1,
            Radius: 3,
            CastsShadows: true);
    }

    public static LightingSnapshot Capture(
        string sceneId,
        long simulationTick,
        IEnumerable<(string StableId, ProjectileState Projectile)> projectiles,
        LightingEnvironment environment)
    {
        var emitters = projectiles
            .Select(source => FromProjectile(source.Projectile, source.StableId))
            .OfType<LightingEmitter>()
            .OrderBy(source => source.Id, StringComparer.Ordinal)
            .ToArray();
        var snapshot = new LightingSnapshot(LightingSnapshot.CurrentSchemaVersion, simulationTick, sceneId, environment, emitters);
        snapshot.Validate();
        return snapshot;
    }
}
