namespace Wyrmforge.Domain.Progression.PassiveTree;

// Tier follows real investment cost. This preserves legacy one-point mutation nodes
// instead of silently repricing them when their presentation gets upgraded.
public enum PassiveNodeTier
{
    Minor,
    Medium,
    Major,
}

public static class PassiveNodeTiers
{
    public static PassiveNodeTier For(PassiveNodeDefinition node) => node.Kind == PassiveNodeKind.Origin
        ? PassiveNodeTier.Major
        : node.Cost switch
        {
            1 => PassiveNodeTier.Minor,
            2 => PassiveNodeTier.Medium,
            3 => PassiveNodeTier.Major,
            _ => throw new ArgumentOutOfRangeException(nameof(node)),
        };
}
