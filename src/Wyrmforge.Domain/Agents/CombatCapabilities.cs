namespace Wyrmforge.Domain.Agents;

public enum AgentTier { Instinctive = 1, Reactive, Tactical, Adaptive, Masterful }

/// <summary>Capabilities only: never modifies health, damage, telegraphs or cooldowns.</summary>
public sealed record CombatCapabilities(AgentTier Tier, bool Reposition, bool Coordinate, bool Adapt, bool PhaseAware)
{
    public static CombatCapabilities For(AgentTier tier) => Enum.IsDefined(tier)
        ? new(tier, tier >= AgentTier.Reactive, tier >= AgentTier.Tactical, tier >= AgentTier.Adaptive, tier == AgentTier.Masterful)
        : throw new ArgumentOutOfRangeException(nameof(tier));
}
