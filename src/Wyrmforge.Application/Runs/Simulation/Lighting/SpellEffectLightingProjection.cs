using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Projects confirmed cast, impact and fiery-area state into the common light registry.</summary>
public static class SpellEffectLightingProjection
{
    public static IReadOnlyList<LightingEmitter> Capture(CastMotionRenderSnapshot? cast,
        IEnumerable<ElementalImpactRenderSnapshot> impacts, IEnumerable<EssenceBurstRenderSnapshot> fieryAreas)
    {
        var lights = new List<LightingEmitter>();
        if (cast is { Progress: >= 0 and < 1 } && LightingSourceCatalog.ForSpell(cast.Spell) is { } casting)
            lights.Add(Source("cast:player", "player", cast.X, cast.Y, 24, casting, 1 - cast.Progress, casting.Radius));

        // Co-located effects share one stable source. Removing an unrelated effect cannot renumber another light.
        foreach (var group in impacts.Where(impact => impact.Progress >= 0 && impact.Progress < 1)
                     .GroupBy(impact => (impact.Spell, impact.X, impact.Y)))
        {
            if (LightingSourceCatalog.ForSpell(group.Key.Spell) is not { } profile) continue;
            var strength = group.Max(impact => 1 - impact.Progress);
            var id = FormattableString.Invariant($"impact:{group.Key.Spell}:{group.Key.X:R}:{group.Key.Y:R}");
            // A confirmed hit is authored at the target's center (also for chains and area hits).
            // A point-shadow cubemap placed inside a living target's silhouette projects
            // its near-face geometry backwards toward the caster and creates an immense
            // shadow wedge. The short surface flash illuminates without casting its own
            // shadow; travelling projectiles remain real shadow-casting point sources.
            lights.Add(Source(id, id, group.Key.X, group.Key.Y, 24, profile, strength,
                profile.Radius, castsShadows: false));
        }

        var fire = LightingSourceCatalog.ForSpell(SpellId.FireBolt)!;
        foreach (var group in fieryAreas.Where(area => area.Life > 0 && area.Radius > 0).GroupBy(area => (area.X, area.Y)))
        {
            var id = FormattableString.Invariant($"fiery-area:{group.Key.X:R}:{group.Key.Y:R}");
            var strength = Math.Clamp(group.Max(area => area.Life) / .2, 0, 1);
            // Ground-fire and essence bursts originate at floor level, frequently under
            // the same collision volume as a hit. They emit ambient firelight,
            // not a point-shadow cubemap from inside that solid caster.
            lights.Add(Source(id, id, group.Key.X, group.Key.Y, 8, fire, strength,
                group.Max(area => area.Radius), castsShadows: false));
        }
        return lights;
    }

    private static LightingEmitter Source(string id, string owner, double x, double y, double height,
        LightSourceProfile profile, double strength, double radius, bool? castsShadows = null) =>
        new(id, owner, profile.Type, x, y, height, profile.Color, profile.Intensity * strength, radius,
            CastsShadows: castsShadows ?? profile.CastsShadows);
}
