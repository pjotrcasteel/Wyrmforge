using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>Authoritative boss sources for the shared scene registry. No damage or renderer decisions.</summary>
public static class AshfangLightingProjection
{
    public static IReadOnlyList<LightingEmitter> Capture(DragonRenderSnapshot? dragon,
        IReadOnlyList<AshfangEffectRenderSnapshot> effects,
        IReadOnlyList<AshfangGroundFireRenderSnapshot>? groundFires = null)
    {
        var lights = new List<LightingEmitter>();
        if (dragon is { School: SpellSchool.Fire, Health: > 0, FlightStage: "ground", Action: "breath" or "breath_sweep" }
            && dragon.ActionPhase is "windup" or "strike")
        {
            var scale = dragon.Radius / 60;
            var strength = dragon.ActionPhase == "strike" ? .32 : .10 * Math.Clamp(dragon.ActionProgress, 0, 1);
            lights.Add(new LightingEmitter($"ashfang:{dragon.EntityId}:breath:{dragon.AttackSequence}",
                $"ashfang:{dragon.EntityId}", "point",
                dragon.X + dragon.DirectionX * 100 * scale, dragon.Y + dragon.DirectionY * 100 * scale,
                38 * scale, "#f8a368", strength, 135 * scale));
        }
        foreach (var effect in effects)
        {
            if (effect.Kind is not ("meteor" or "cinder") || effect.Progress >= .16) continue;
            lights.Add(new LightingEmitter($"ashfang-effect:{effect.Id}", $"ashfang-effect:{effect.Id}", "point",
                effect.X, effect.Y, 8, "#f8a368", .65 * (1 - Math.Clamp(effect.Progress, 0, .16) / .16), effect.Radius * 2.4));
        }
        // A limited set of true GPU light emitters makes the scorched floor illuminate nearby actors.
        // Static atlas pixels stay unchanged; only these tiny C#-owned lights move/fade.
        foreach (var patch in (groundFires ?? []).Where(patch => patch.Burning)
            .OrderByDescending(patch => patch.Fuel == "wood").ThenBy(patch => patch.Id).Take(6))
        {
            lights.Add(new LightingEmitter($"ashfang-ground-fire:{patch.Id}", $"ashfang-ground-fire:{patch.Id}", "point",
                patch.X, patch.Y, patch.Z + 6, "#e87a43", patch.Fuel == "wood" ? .28 : .19, patch.Radius * 1.8));
        }
        return lights;
    }
}
