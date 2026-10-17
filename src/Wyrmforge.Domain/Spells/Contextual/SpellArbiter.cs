namespace Wyrmforge.Domain.Spells.Contextual;

/// <summary>Contextual spells sit beside the committed primary. They are not persisted; the loadout derives them.</summary>
public enum ContextualSpellId
{
    WardingPulse,
}

public enum SpellDecisionReason
{
    Cast,
    BelowThreshold,
    /// <summary>The pressure is real but nothing in reach can be moved (a boss or a rite), so a pulse would be wasted.</summary>
    NothingToMove,
    Recovering,
}

/// <summary>
/// What the arbiter may know: only things the player can also see on screen. Frozen enemies are already handled and do not
/// count; only telegraphs the spell can actually defuse count as threats.
/// </summary>
public readonly record struct BattlefieldRead(int Crowd, int Movable, int Contacts, int Telegraphs);

public readonly record struct SpellDecision(bool Cast, int Score, SpellDecisionReason Reason);

/// <summary>
/// One trigger policy, the sensible default the amendment asks for. Weights are small integers so a decision trace reads
/// like arithmetic: <c>crowd + contacts + 3 × telegraphs ≥ 4</c>. The Nexus may later offer alternative policies.
/// </summary>
public sealed record ContextualTriggerPolicy(string Name, int CrowdWeight, int ContactWeight, int TelegraphWeight, int Threshold)
{
    /// <summary>Four enemies in reach, three with one already touching, or one defusable windup with company.</summary>
    public static ContextualTriggerPolicy Guard { get; } = new("Guard", 1, 1, 3, 4);

    public int Score(BattlefieldRead read) => read.Crowd * CrowdWeight + read.Contacts * ContactWeight + read.Telegraphs * TelegraphWeight;
}

/// <summary>
/// Deterministic cast arbitration (amendment §5): a pure function of observable state, the policy and the spell's own
/// recovery. Like Final Fantasy XII's gambits, it is one readable rule with a default, not a script the player must write.
/// </summary>
public static class SpellArbiter
{
    public static SpellDecision Decide(ContextualTriggerPolicy policy, BattlefieldRead read, double recoveryRemaining)
    {
        ArgumentNullException.ThrowIfNull(policy);
        var score = policy.Score(read);
        if (score < policy.Threshold) return new(false, score, SpellDecisionReason.BelowThreshold);
        if (read.Movable == 0) return new(false, score, SpellDecisionReason.NothingToMove);
        if (recoveryRemaining > 0) return new(false, score, SpellDecisionReason.Recovering);
        return new(true, score, SpellDecisionReason.Cast);
    }
}

public sealed record SpellDecisionTraceEntry(double Seconds, ContextualSpellId Spell, SpellDecisionReason Reason, int Score, BattlefieldRead Read);

/// <summary>Bounded, append-only record of contextual decisions so a death can be diagnosed after the fact.</summary>
public sealed class SpellDecisionTrace
{
    public const int Capacity = 64;
    private readonly Queue<SpellDecisionTraceEntry> entries = new();

    public IReadOnlyList<SpellDecisionTraceEntry> Entries => entries.ToArray();

    public void Record(SpellDecisionTraceEntry entry)
    {
        ArgumentNullException.ThrowIfNull(entry);
        if (entries.Count == Capacity) entries.Dequeue();
        entries.Enqueue(entry);
    }
}
