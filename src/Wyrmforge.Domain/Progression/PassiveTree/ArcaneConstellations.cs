using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree;

// Each ring has two ways around it. Adjacent rings join at their cardinal
// nodes so players can travel between themes without returning to the hub.
internal static class ArcaneConstellations
{
    internal const string Prefix = "constellation-";
    private static readonly (PassiveSchool School, string Gate, string[] Themes, BuildStatId Specialty)[] Schools =
    [
        (PassiveSchool.Fire, "fire-shelter-5", ["Ember", "Hearth", "Cinder", "Forge", "Pyre", "Ash"], BuildStatId.BurnDamage),
        (PassiveSchool.Frost, "winter-shell", ["Rime", "Glacier", "Snow", "Permafrost", "Ice", "Winter"], BuildStatId.MaxHealth),
        (PassiveSchool.Storm, "lightning-form", ["Gale", "Thunder", "Rain", "Lightning", "Tempest", "Squall"], BuildStatId.ProjectileSpeed),
        (PassiveSchool.Arcane, "astral-barrage", ["Glyph", "Astral", "Mirror", "Rune", "Prism", "Aether"], BuildStatId.Damage),
    ];
    private static readonly string[] Names = ["Ward", "Spark", "Focus", "Thread", "Seal", "Trace", "Mantle", "Sign"];
    private static readonly (int Side, int Radius)[] Offsets =
        [(0, -170), (120, -120), (170, 0), (120, 120), (0, 170), (-120, 120), (-170, 0), (-120, -120)];

    internal static IEnumerable<PassiveNodeDefinition> Nodes()
    {
        foreach (var (school, _, themes, specialty) in Schools)
        for (var ring = 0; ring < themes.Length; ring++)
        for (var step = 0; step < Offsets.Length; step++)
        {
            var (side, radius) = Offsets[step];
            var stat = (step % 3) switch
            {
                0 => BuildStatId.MaxHealth,
                1 => specialty,
                _ => BuildStatId.Damage,
            };
            var label = stat switch
            {
                BuildStatId.MaxHealth => "maximum health",
                BuildStatId.BurnDamage => "burning-ground damage",
                BuildStatId.ProjectileSpeed => "projectile speed",
                _ => "spell damage",
            };
            var notable = step == 4;
            var percent = notable ? 3 : 1;
            yield return new(Id(school, ring, step), $"{themes[ring]} {Names[step]}",
                $"+{percent}% {label}.", notable ? PassiveNodeKind.Notable : PassiveNodeKind.Travel,
                school, notable ? 2 : 1, (ring % 3 - 1) * 510 + side, 2650 + ring / 3 * 510 + radius,
                PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(stat, percent / 100d)),
                Tier: notable ? PassiveNodeTier.Medium : PassiveNodeTier.Minor);
        }
    }

    internal static IEnumerable<PassiveTreeConnection> Connections()
    {
        foreach (var (school, gate, themes, _) in Schools)
        {
            yield return new(gate, Id(school, 1, 0));
            for (var ring = 0; ring < themes.Length; ring++)
            {
                for (var step = 0; step < Offsets.Length; step++)
                    yield return new(Id(school, ring, step), Id(school, ring, (step + 1) % Offsets.Length));
                if (ring % 3 < 2)
                    yield return new(Id(school, ring, 2), Id(school, ring + 1, 6));
                if (ring + 3 < themes.Length)
                    yield return new(Id(school, ring, 4), Id(school, ring + 3, 0));
            }
        }
    }

    private static string Id(PassiveSchool school, int ring, int step) =>
        FormattableString.Invariant($"{Prefix}{school}-{ring}-{step}");
}
