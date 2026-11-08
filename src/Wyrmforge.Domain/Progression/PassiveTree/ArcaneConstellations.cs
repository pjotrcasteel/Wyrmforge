using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

// Each ring has two ways around it. Adjacent rings join at their cardinal
// nodes so players can travel between themes without returning to the hub.
internal static class ArcaneConstellations
{
    internal const string Prefix = "constellation-";
    private static readonly (PassiveSchool School, string Gate, string[] Themes, BuildStatId Specialty)[] Schools =
    [
        (PassiveSchool.Fire, "volcanic", ["Ember", "Hearth", "Cinder", "Forge", "Pyre", "Ash",
            "Wildfire", "Obsidian", "Kiln", "Sunstone", "Beacon", "Phoenix",
            "Scoria", "Lava", "Brazier", "Caldera", "Salamander", "Kindling",
            "Flare", "Soot", "Glassfire", "Bellows", "Sunspot", "Crucible",
            "Torch", "Charcoal", "Afterburn"], BuildStatId.BurnDamage),
    ];
    private static readonly string[] Names = ["Ward", "Spark", "Focus", "Thread", "Seal", "Trace", "Mantle", "Sign"];
    private static readonly (int Side, int Radius)[] Offsets =
        [(0, -170), (120, -120), (170, 0), (120, 120), (0, 170), (-120, 120), (-170, 0), (-120, -120)];

    internal static IEnumerable<PassiveNodeDefinition> Nodes()
    {
        int[] meridianSides = [350, 0, -500, -1250, -2000];
        for (var step = 0; step < meridianSides.Length; step++)
        {
            yield return new(TransitId(step), $"Ember Meridian {step + 1}", "+1% mutation duration.",
                PassiveNodeKind.Travel, PassiveSchool.Fire, 1, meridianSides[step], 3500,
                PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(BuildStatId.MutationDuration, .01)),
                Tier: PassiveNodeTier.Minor);
        }

        foreach (var (school, _, themes, specialty) in Schools)
        for (var ring = 0; ring < themes.Length; ring++)
        for (var step = 0; step < Offsets.Length; step++)
        {
            var (side, radius) = Offsets[step];
            var stat = (StableRingId(ring) < 6 ? step % 3 : (step + ring) % 6) switch
            {
                0 => BuildStatId.MaxHealth,
                1 => specialty,
                3 => BuildStatId.ProjectileSpeed,
                4 => BuildStatId.MutationDuration,
                5 => BuildStatId.MutationRadius,
                _ => BuildStatId.Damage,
            };
            var label = stat switch
            {
                BuildStatId.MaxHealth => "maximum health",
                BuildStatId.BurnDamage => "burning-ground damage",
                BuildStatId.ProjectileSpeed => "projectile speed",
                BuildStatId.MutationDuration => "mutation duration",
                BuildStatId.MutationRadius => "mutation area",
                _ => "spell damage",
            };
            var notable = step == 4;
            var major = notable && ring is 11 or 20 or 26;
            var percent = major ? 5 : notable ? 3 : 1;
            var shape = ring % 4;
            side = side * (8 + shape) / 10;
            radius = radius * (11 - shape) / 10;
            yield return new(Id(school, ring, step), $"{themes[StableRingId(ring)]} {Names[step]}",
                $"+{percent}% {label}.", notable ? PassiveNodeKind.Notable : PassiveNodeKind.Travel,
                school, major ? 3 : notable ? 2 : 1, (ring % 9 - 4) * 500 + side, 3900 + ring / 9 * 540 + radius + (ring % 9 % 2) * 75,
                PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(stat, percent / 100d)),
                Tier: major ? PassiveNodeTier.Major : notable ? PassiveNodeTier.Medium : PassiveNodeTier.Minor);
        }
    }

    internal static IEnumerable<PassiveTreeConnection> Connections()
    {
        foreach (var (school, gate, themes, _) in Schools)
        {
            yield return new(gate, Id(school, 5, 0));
            yield return new("fire-banked-embers", Id(school, 8, 0));
            yield return new(Id(school, 5, 0), TransitId(0));
            for (var step = 1; step < 5; step++)
                yield return new(TransitId(step - 1), TransitId(step));
            yield return new(TransitId(2), Id(school, 3, 0));
            yield return new(TransitId(4), Id(school, 0, 0));
            for (var ring = 0; ring < themes.Length; ring++)
            {
                for (var step = 0; step < Offsets.Length; step++)
                    yield return new(Id(school, ring, step), Id(school, ring, (step + 1) % Offsets.Length));
                if (ring % 9 < 8)
                    yield return new(Id(school, ring, 2), Id(school, ring + 1, 6));
                if (ring + 9 < themes.Length)
                    yield return new(Id(school, ring, 4), Id(school, ring + 9, 0));
            }
        }
    }

    private static string TransitId(int step) => FormattableString.Invariant($"{Prefix}Fire-meridian-{step}");

    private static string Id(PassiveSchool school, int ring, int step) =>
        FormattableString.Invariant($"{Prefix}{school}-{StableRingId(ring)}-{step}");

    // Retain the existing Fire entry ID when placing it on the east side.
    private static int StableRingId(int ring) => ring switch { 2 => 5, 5 => 2, _ => ring };
}
