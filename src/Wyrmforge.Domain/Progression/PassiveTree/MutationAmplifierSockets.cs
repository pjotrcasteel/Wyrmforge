namespace Wyrmforge.Domain.Progression.PassiveTree;

// Effect capabilities describe the shape of a mutation, never its spell or school.
// Adapters for Fireball, Frostfire and later spells can publish these same tags.
public enum MutationEffectCapability
{
    Area,
    Duration,
    Potency,
    SecondaryTrigger,
}

public sealed record MutationEffectDescriptor(
    string SpellId,
    string MutationId,
    IReadOnlyList<MutationEffectCapability> Capabilities);

public sealed record MutationAmplifierDefinition(
    string NodeId,
    MutationEffectCapability Capability,
    double Factor);

public sealed record MutationAmplifierAssignment(string NodeId, string SpellId, string MutationId);

// The Web stores only assignments. Equipped mutations, node ownership, research,
// and base effect magnitudes remain authoritative in their respective systems.
public sealed class MutationAmplifierSockets
{
    public const double MaximumCombinedFactor = 1.5;

    private readonly IReadOnlyDictionary<string, MutationAmplifierDefinition> definitions;
    private readonly Dictionary<string, MutationAmplifierAssignment> assignments = new(StringComparer.Ordinal);

    public MutationAmplifierSockets(IEnumerable<MutationAmplifierDefinition> definitions)
    {
        ArgumentNullException.ThrowIfNull(definitions);
        var all = definitions.ToArray();
        if (all.Any(item => string.IsNullOrWhiteSpace(item.NodeId)
            || !Enum.IsDefined(item.Capability)
            || !double.IsFinite(item.Factor) || item.Factor < 1 || item.Factor > MaximumCombinedFactor))
            throw new ArgumentException("Amplifier definitions must have valid nodes, capabilities and bounded factors.", nameof(definitions));

        if (all.Select(item => item.NodeId).Distinct(StringComparer.Ordinal).Count() != all.Length)
            throw new ArgumentException("An amplifier node can contain only one socket.", nameof(definitions));

        this.definitions = all.ToDictionary(item => item.NodeId, StringComparer.Ordinal);
    }

    public IReadOnlyList<MutationAmplifierAssignment> Assignments => assignments.Values.OrderBy(item => item.NodeId).ToArray();

    public bool Assign(string nodeId, MutationEffectDescriptor mutation, IReadOnlySet<string> learnedNodes,
        IReadOnlyCollection<MutationEffectDescriptor> equippedMutations)
    {
        ArgumentNullException.ThrowIfNull(mutation);
        ArgumentNullException.ThrowIfNull(learnedNodes);
        ArgumentNullException.ThrowIfNull(equippedMutations);

        if (!definitions.TryGetValue(nodeId, out var socket) || !learnedNodes.Contains(nodeId)
            || string.IsNullOrWhiteSpace(mutation.SpellId) || string.IsNullOrWhiteSpace(mutation.MutationId)
            || !mutation.Capabilities.Contains(socket.Capability)
            || !equippedMutations.Any(item => Matches(item, mutation) && item.Capabilities.Contains(socket.Capability)))
            return false;

        assignments[nodeId] = new MutationAmplifierAssignment(nodeId, mutation.SpellId, mutation.MutationId);
        return true;
    }

    public bool Clear(string nodeId) => assignments.Remove(nodeId);

    // The consumer applies the returned factor to that mutation effect's original
    // base value exactly once. Never amplify a total spell stat or feed the amplified
    // result back as an input; this avoids cross-mutation leaks and recursion.
    public double FactorFor(MutationEffectDescriptor mutation, MutationEffectCapability capability,
        IReadOnlySet<string> learnedNodes, IReadOnlyCollection<MutationEffectDescriptor> equippedMutations)
    {
        ArgumentNullException.ThrowIfNull(mutation);
        ArgumentNullException.ThrowIfNull(learnedNodes);
        ArgumentNullException.ThrowIfNull(equippedMutations);

        if (!mutation.Capabilities.Contains(capability)
            || !equippedMutations.Any(item => Matches(item, mutation) && item.Capabilities.Contains(capability)))
            return 1;

        var factor = 1d;
        foreach (var binding in assignments.Values.OrderBy(item => item.NodeId))
        {
            if (!learnedNodes.Contains(binding.NodeId) || !definitions.TryGetValue(binding.NodeId, out var socket)
                || socket.Capability != capability || binding.SpellId != mutation.SpellId
                || binding.MutationId != mutation.MutationId)
                continue;

            factor = Math.Min(MaximumCombinedFactor, factor * socket.Factor);
        }

        return factor;
    }

    public IReadOnlyList<MutationAmplifierAssignment> ToSave() => Assignments;

    // Old or unrelated socket IDs are discarded safely. A restored assignment is
    // dormant unless that node is still learned and the exact mutation is equipped.
    public void Restore(IEnumerable<MutationAmplifierAssignment>? saved)
    {
        assignments.Clear();
        if (saved is null) return;

        foreach (var entry in saved)
        {
            if (entry is null || !definitions.ContainsKey(entry.NodeId)
                || string.IsNullOrWhiteSpace(entry.SpellId) || string.IsNullOrWhiteSpace(entry.MutationId))
                continue;

            assignments[entry.NodeId] = entry;
        }
    }

    private static bool Matches(MutationEffectDescriptor left, MutationEffectDescriptor right) =>
        string.Equals(left.SpellId, right.SpellId, StringComparison.Ordinal)
        && string.Equals(left.MutationId, right.MutationId, StringComparison.Ordinal);
}
