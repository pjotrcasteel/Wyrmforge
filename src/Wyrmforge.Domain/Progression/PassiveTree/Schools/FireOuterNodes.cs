using Wyrmforge.Domain.Combat.Modifiers;

namespace Wyrmforge.Domain.Progression.PassiveTree.Schools;

internal static class FireOuterNodes
{
    // Additive, tunable investments. Each outer route is affordable within the
    // current earned budget; taking every route is deliberately not required.
    internal static IReadOnlyList<PassiveNodeDefinition> All { get; } =
    [
        Node("fire-enduring-inner-1", "Cinder Pulse", BuildStatId.BurnDamage, .02),
        Node("fire-enduring-inner-2", "Hearth Ash", BuildStatId.MaxHealth, .02),
        Node("fire-furnace-inner-1", "Heat Retention", BuildStatId.MutationDuration, .02),
        Node("fire-furnace-inner-2", "Kiln Ward", BuildStatId.MaxHealth, .02),
        Node("fire-shelter-inner-1", "Banked Heat", BuildStatId.MutationDuration, .02),
        Node("fire-shelter-inner-2", "Guarding Coals", BuildStatId.BurnDamage, .02),
        Node("fire-pyre-crossroads", "Afterglow", BuildStatId.MutationDuration, .01),
        Node("fire-enduring-1", "Patient Flame", BuildStatId.MutationDuration, .02),
        Node("fire-enduring-2", "Lingering Heat", BuildStatId.MutationDuration, .02),
        Node("fire-enduring-3", "Slow Embers", BuildStatId.MutationDuration, .02),
        Node("fire-enduring-4", "Vigil of Ash", BuildStatId.MutationDuration, .04, PassiveNodeTier.Medium),
        Node("fire-enduring-5", "Undying Hearth", BuildStatId.MutationDuration, .07, PassiveNodeTier.Major),
        Node("fire-furnace-1", "Coal Seam", BuildStatId.BurnDamage, .02),
        Node("fire-furnace-2", "White Embers", BuildStatId.BurnDamage, .02),
        Node("fire-furnace-3", "Furnace Breath", BuildStatId.BurnDamage, .02),
        Node("fire-furnace-4", "Deep Combustion", BuildStatId.BurnDamage, .04, PassiveNodeTier.Medium),
        Node("fire-furnace-5", "Heart of Cinders", BuildStatId.BurnDamage, .07, PassiveNodeTier.Major),
        Node("fire-shelter-1", "Warm Blood", BuildStatId.MaxHealth, .02),
        Node("fire-shelter-2", "Ashen Resolve", BuildStatId.MaxHealth, .02),
        Node("fire-shelter-3", "Hearthkeeper", BuildStatId.MaxHealth, .02),
        Node("fire-shelter-4", "Tempered Vessel", BuildStatId.MaxHealth, .04, PassiveNodeTier.Medium),
        Node("fire-shelter-5", "Shelter in the Pyre", BuildStatId.MaxHealth, .07, PassiveNodeTier.Major),
    ];

    internal static IEnumerable<PassiveTreeConnection> Connections
    {
        get
        {
            yield return new("fire-long-pyre", "fire-pyre-crossroads");
            foreach (var route in new[] { "enduring", "furnace", "shelter" })
            {
                // Equal-cost paths to the medium node reward different investments.
                yield return new($"fire-{route}-1", $"fire-{route}-inner-1");
                yield return new($"fire-{route}-inner-1", $"fire-{route}-inner-2");
                yield return new($"fire-{route}-inner-2", $"fire-{route}-4");
                var previous = "fire-pyre-crossroads";
                for (var step = 1; step <= 5; step++)
                {
                    var id = $"fire-{route}-{step}";
                    yield return new(previous, id);
                    previous = id;
                }
            }
        }
    }

    private static PassiveNodeDefinition Node(string id, string name, BuildStatId stat, double value, PassiveNodeTier tier = PassiveNodeTier.Minor)
    {
        var effect = stat switch
        {
            BuildStatId.MutationDuration => "mutation duration",
            BuildStatId.BurnDamage => "burning-ground damage",
            BuildStatId.MaxHealth => "maximum health",
            _ => throw new ArgumentOutOfRangeException(nameof(stat)),
        };
        var cost = tier switch { PassiveNodeTier.Minor => 1, PassiveNodeTier.Medium => 2, _ => 3 };
        var kind = tier == PassiveNodeTier.Minor ? PassiveNodeKind.Travel : PassiveNodeKind.Notable;
        return new(id, name, FormattableString.Invariant($"+{value * 100:0}% {effect}."), kind, PassiveSchool.Fire, cost, 0, 0,
            PassiveNodeModifiers.Stats(PassiveNodeModifiers.Percent(stat, value)), Tier: tier);
    }
}
