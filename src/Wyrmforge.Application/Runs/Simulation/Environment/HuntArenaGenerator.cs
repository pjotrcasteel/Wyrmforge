using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>
/// Reproducible, gameplay-authoritative arena dressing. The map seed, node identity and habitat
/// drive a separate random stream: opening a prop never consumes combat/spawn randomness.
/// Coordinates are normalized to the arena world, never to the current phone viewport.
/// </summary>
public static class HuntArenaGenerator
{
    public sealed record Prop(int Id, string Kind, double X, double Y, double Radius, double Health, string? DropKind);

    public static double WyrmInfluence(int stage, bool preLair) =>
        Math.Clamp((Math.Max(1, stage) - 1) / 7d + (preLair ? .12 : 0), 0, 1);

    public static IReadOnlyList<Prop> Generate(int seed, WyrmrealmHabitat habitat, int stage, bool preLair)
    {
        var random = new Random(unchecked(seed ^ 0x39A86C21));
        var forest = habitat is WyrmrealmHabitat.Outskirts or WyrmrealmHabitat.WetForest
            or WyrmrealmHabitat.FrozenRoad or WyrmrealmHabitat.SnowboundPines;
        var frost = WyrmrealmHabitatCatalog.School(habitat) == SpellSchool.Frost;
        var influence = WyrmInfluence(stage, preLair);
        var requested = forest ? 16 : 12;
        var props = new List<Prop>(requested);

        // Central 36% is deliberately free for swarms, escape circles, gate approach and exit.
        // Scatter along both shoulders, with minimum separation between physical footprints.
        for (var attempt = 0; attempt < requested * 24 && props.Count < requested; attempt++)
        {
            var x = .09 + random.NextDouble() * .82;
            var y = .08 + random.NextDouble() * .84;
            if (x > .32 && x < .68) continue;
            if (Math.Abs(y - .315) < .075 || Math.Abs(y - .675) < .075) continue;
            if (props.Any(prop => Math.Pow((prop.X - x) * 950, 2) + Math.Pow((prop.Y - y) * 1550, 2) < 68 * 68)) continue;

            var variant = random.NextDouble();
            var standingTree = forest && variant < .28;
            var kind = standingTree ? frost ? "pine-snow" : influence > .55 ? "dead-tree" : "pine"
                : variant < .28 + influence * .27 ? (frost ? "frozen-urn" : "ember-urn")
                : variant < .52 ? "barrel" : variant < .77 ? "crate" : forest ? "stump" : "urn";
            var dropRoll = random.NextDouble();
            // Old trees have rooted physical trunks, while small ruins provide occasional supplies.
            // Loot remains uncommon: scenery must not overwhelm Hunt combat rewards.
            var drop = standingTree ? null : dropRoll < .12 ? "experience" : dropRoll < .18 ? "health" : null;
            var size = standingTree ? 12 : kind is "stump" ? 17 : 13;
            var health = standingTree ? 75 : kind is "stump" ? 32 : 18;
            props.Add(new Prop(props.Count + 1, kind, x, y, size, health, drop));
        }
        return props;
    }
}
