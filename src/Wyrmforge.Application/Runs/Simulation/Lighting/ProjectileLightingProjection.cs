using Wyrmforge.Domain.Combat.Projectiles;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Presentation metadata for a source; no renderer or gameplay logic.</summary>
public sealed record LightSourceProfile(string Color, double Intensity, double Radius, string Type = "point", bool CastsShadows = true);

/// <summary>Generic source metadata, keyed by spell school rather than individual spell IDs.</summary>
public static class LightingSourceCatalog
{
    private static readonly IReadOnlyDictionary<SpellSchool, LightSourceProfile> Schools =
        new Dictionary<SpellSchool, LightSourceProfile>
        {
            [SpellSchool.Fire] = new("#ff7835", 1, 3),
            [SpellSchool.Frost] = new("#8bdfff", 0.8, 3),
            [SpellSchool.Storm] = new("#ffe36a", 1, 3),
            [SpellSchool.Arcane] = new("#b79aff", 0.8, 3),
        };

    public static LightSourceProfile? ForSpell(SpellId spell) =>
        Schools.GetValueOrDefault(SpellCatalog.Get(spell).School);
}

/// <summary>Pure projection of authoritative projectile state. New spells use catalog metadata.</summary>
public static class ProjectileLightingProjection
{
    public static LightingEmitter? FromProjectile(ProjectileState projectile, string stableId)
    {
        var profile = LightingSourceCatalog.ForSpell(projectile.Spell);
        if (profile is null) return null;

        return new LightingEmitter(
            Id: $"projectile:{stableId}",
            OwnerId: stableId,
            Type: profile.Type,
            X: projectile.Position.X,
            Y: projectile.Position.Y,
            Z: 0,
            Color: profile.Color,
            Intensity: profile.Intensity,
            Radius: profile.Radius,
            CastsShadows: profile.CastsShadows);
    }

    public static LightingSnapshot Capture(
        string sceneId,
        long simulationTick,
        IEnumerable<ProjectileState> projectiles,
        ProjectileLightIdentityRegistry identities,
        LightingEnvironment environment) =>
        CaptureWithIdentities(sceneId, simulationTick, projectiles, identities, environment);

    private static LightingSnapshot CaptureWithIdentities(
        string sceneId, long simulationTick, IEnumerable<ProjectileState> projectiles,
        ProjectileLightIdentityRegistry identities, LightingEnvironment environment)
    {
        var active = projectiles.ToArray();
        identities.Retain(active);
        return Capture(sceneId, simulationTick,
            active.Select(projectile => (identities.GetId(projectile), projectile)), environment);
    }

    public static LightingSnapshot Capture(
        string sceneId,
        long simulationTick,
        IEnumerable<(string StableId, ProjectileState Projectile)> projectiles,
        LightingEnvironment environment)
    {
        return LightingSceneComposer.Compose(sceneId, simulationTick, environment,
            projectiles.Select(source => FromProjectile(source.Projectile, source.StableId))
                .OfType<LightingEmitter>());
    }
}
