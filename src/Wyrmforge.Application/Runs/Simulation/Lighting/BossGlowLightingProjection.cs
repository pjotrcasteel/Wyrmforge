using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation.Lighting;

/// <summary>
/// The fire bosses glow: Ashfang, the Bell Warden and the Reliquary light the ground around them, and burn hotter, wider and more orange in
/// their second form because the fire-infused magic has woken. The glow swells through a transformation and peaks as it breaks open.
/// Authoritative sources for the shared scene registry; they never cast shadows and decide nothing.
/// </summary>
public static class BossGlowLightingProjection
{
    private const string Ember = "#f08a46", Molten = "#ff6a24", Core = "#ffb060", Gold = "#ffc070", Rust = "#d8803a";

    public static IReadOnlyList<LightingEmitter> Capture(DragonRenderSnapshot? dragon, IEnumerable<EnemyState> enemies)
    {
        ArgumentNullException.ThrowIfNull(enemies);
        var lights = new List<LightingEmitter>();
        if (dragon is { School: SpellSchool.Fire, Health: > 0 })
        {
            var scale = dragon.Radius / 60;
            var enraged = dragon.Phase == 2;
            // Overhead the body is high above the ground, so the same light spreads wider and lower.
            var height = (dragon.FlightStage == "overhead" ? 150 : 54) * scale;
            lights.Add(new LightingEmitter($"boss-glow:ashfang:{dragon.EntityId}", $"boss:ashfang:{dragon.EntityId}", "point",
                dragon.X, dragon.Y, height, enraged ? Molten : Ember, enraged ? 1.0 : .5, (enraged ? 380 : 270) * scale, CastsShadows: false));
            if (enraged)
                lights.Add(new LightingEmitter($"boss-glow:ashfang:{dragon.EntityId}:core", $"boss:ashfang:{dragon.EntityId}", "point",
                    dragon.X, dragon.Y, 40 * scale, Core, .55, 150 * scale, CastsShadows: false));
        }
        foreach (var boss in enemies)
        {
            if (boss.Health <= 0) continue;
            switch (boss)
            {
                case { Kind: EnemyKind.BellWarden, BellWarden: { } bell }:
                    lights.Add(Glow(boss, bell.Cracked || bell.Phase == BellWardenPhase.Crack, bell.Phase == BellWardenPhase.Crack ? bell.CrackProgress : 0, 5, 7, Rust, Molten));
                    break;
                case { Kind: EnemyKind.Reliquary, Reliquary: { } rite }:
                    lights.Add(Glow(boss, rite.Shifted || rite.Phase == ReliquaryPhase.Shift, rite.Phase == ReliquaryPhase.Shift ? rite.ShiftProgress : 0, 4.5, 7, Rust, Gold));
                    break;
            }
        }
        return lights;
    }

    // Second form: hotter colour, a third more reach and more than double the strength; a transformation climbs to its peak as it breaks open.
    private static LightingEmitter Glow(EnemyState boss, bool secondForm, double changeProgress, double firstReach, double secondReach, string first, string second) =>
        new($"boss-glow:{boss.Id}", $"boss:{boss.Id}", "point", boss.Position.X, boss.Position.Y, boss.Radius * 1.2,
            secondForm ? second : first,
            changeProgress > 0 ? .3 + .95 * changeProgress : secondForm ? .75 : .3,
            boss.Radius * (secondForm ? secondReach : firstReach), CastsShadows: false);
}
