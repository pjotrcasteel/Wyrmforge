using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Spells.Composition;

namespace Wyrmforge.Domain.Progression.Laboratory;

public enum ExperimentAvailability { Ready, AlreadyRecorded, MissingSample, MissingObservation }

public enum MutationResearchStatus { MissingObservations, MissingStabilizer, ReadyToStabilize, Stabilized }

public enum MutationEquipResult { Equipped, NotStabilized, SocketLocked, InvalidBlueprint, IncompatibleSocket, FoundationTaken, SocketLimitReached }

public sealed record LaboratoryExperimentResult(LaboratoryExperimentDefinition Experiment, bool Novel, bool Rejected)
{
    public string Message => Rejected ? "Not possible yet." : Novel ? Experiment.Finding : "Already recorded. Repeating it teaches nothing new.";
}

// Tracked, Slots and LeadMisses were added after v1 shipped; older saves omit them and deserialize them as null.
// Slots holds "Socket:Mutation" pairs; Equipped is still written (first slot) so older builds keep one mutation.
public sealed record LaboratorySave(int Version, string[] Observations, string[] Mutations, string? Equipped, int FieldTests, int FieldReactions, string? Tracked = null, string[]? Slots = null, int LeadMisses = 0);

// Persistent research knowledge and up to two socketed mutations. Experiments are deterministic and
// idempotent: a novel experiment always records its specific observation, a repeated one never farms
// progress, and no experiment consumes a specimen. Only stabilization spends one, with explicit consent.
public sealed class LaboratoryState
{
    public const int SaveVersion = 1;

    private readonly HashSet<LaboratoryObservationId> observations = [];
    private readonly HashSet<LaboratoryMutationId> stabilized = [];
    private readonly Dictionary<ArcaneMutationSocketId, LaboratoryMutationId> slotted = [];

    public IReadOnlySet<LaboratoryObservationId> Observations => new HashSet<LaboratoryObservationId>(observations);
    public IReadOnlySet<LaboratoryMutationId> Stabilized => new HashSet<LaboratoryMutationId>(stabilized);
    public int FieldTests { get; private set; }
    public int FieldReactions { get; private set; }

    public bool HasObserved(LaboratoryObservationId id) => observations.Contains(id);

    public ExperimentAvailability Availability(LaboratoryExperimentId id, DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        var experiment = LaboratoryCatalog.Get(id);
        if (observations.Contains(experiment.Reveals)) return ExperimentAvailability.AlreadyRecorded;
        if (!experiment.RequiresObservations.All(observations.Contains)) return ExperimentAvailability.MissingObservation;
        if (experiment.RequiresSample is { } sample && vault.Count(sample) == 0) return ExperimentAvailability.MissingSample;
        return ExperimentAvailability.Ready;
    }

    public LaboratoryExperimentResult Run(LaboratoryExperimentId id, DragonEssenceVault vault)
    {
        var experiment = LaboratoryCatalog.Get(id);
        return Availability(id, vault) switch
        {
            ExperimentAvailability.Ready => new(experiment, Novel: observations.Add(experiment.Reveals), Rejected: false),
            ExperimentAvailability.AlreadyRecorded => new(experiment, Novel: false, Rejected: false),
            _ => new(experiment, Novel: false, Rejected: true),
        };
    }

    public IReadOnlyList<LaboratoryObservationId> MissingObservations(LaboratoryMutationId id) =>
        LaboratoryCatalog.Get(id).RequiresObservations.Where(observation => !observations.Contains(observation)).ToArray();

    public MutationResearchStatus Status(LaboratoryMutationId id, DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        if (stabilized.Contains(id)) return MutationResearchStatus.Stabilized;
        if (MissingObservations(id).Count > 0) return MutationResearchStatus.MissingObservations;
        return vault.Count(LaboratoryCatalog.Get(id).Stabilizer) > 0 ? MutationResearchStatus.ReadyToStabilize : MutationResearchStatus.MissingStabilizer;
    }

    // Once every condition is known and the specimen is present, success is guaranteed. Without
    // explicit consent nothing is consumed.
    public bool Stabilize(LaboratoryMutationId id, DragonEssenceVault vault, bool consentToConsume)
    {
        if (!consentToConsume || Status(id, vault) != MutationResearchStatus.ReadyToStabilize) return false;
        if (!vault.Consume(LaboratoryCatalog.Get(id).Stabilizer)) return false;
        if (Tracked == id) Untrack();
        return stabilized.Add(id);
    }

    public static bool SocketUnlocked(ArcaneMutationSocketId socket, IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        return arcaneNodes.Contains(LaboratoryCatalog.Get(socket).NodeId);
    }

    public IReadOnlyDictionary<ArcaneMutationSocketId, LaboratoryMutationId> Slotted => new Dictionary<ArcaneMutationSocketId, LaboratoryMutationId>(slotted);

    public IReadOnlyList<LaboratoryMutationId> EquippedMutations => slotted.OrderBy(pair => pair.Key).Select(pair => pair.Value).ToArray();

    public bool IsEquipped(LaboratoryMutationId id) => slotted.ContainsValue(id);

    public ArcaneMutationSocketId? SocketOf(LaboratoryMutationId id) =>
        slotted.Where(pair => pair.Value == id).Select(pair => (ArcaneMutationSocketId?)pair.Key).FirstOrDefault();

    // Places the mutation without the player picking a socket: keeps its current socket, else the first free
    // unlocked socket that accepts it (home socket first), else replaces whatever sits in the first one.
    public MutationEquipResult Equip(LaboratoryMutationId id, IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        if (!stabilized.Contains(id)) return MutationEquipResult.NotStabilized;
        var mutation = LaboratoryCatalog.Get(id);
        if (!BlueprintValidator.Validate(mutation.Blueprint, BlueprintRuleset.Current).IsValid) return MutationEquipResult.InvalidBlueprint;
        if (SocketOf(id) is { } current && SocketUnlocked(current, arcaneNodes)) return MutationEquipResult.Equipped;
        var candidates = mutation.CompatibleSockets
            .Where(socket => SocketUnlocked(socket, arcaneNodes))
            .OrderBy(socket => socket == mutation.Socket ? 0 : 1)
            .ToArray();
        if (candidates.Length == 0) return MutationEquipResult.SocketLocked;
        var target = candidates.FirstOrDefault(socket => !slotted.ContainsKey(socket), candidates[0]);
        return Equip(id, target, arcaneNodes);
    }

    public MutationEquipResult Equip(LaboratoryMutationId id, ArcaneMutationSocketId socket, IReadOnlySet<string> arcaneNodes)
    {
        var result = CheckEquip(id, socket, arcaneNodes);
        if (result != MutationEquipResult.Equipped) return result;
        if (SocketOf(id) is { } previous) slotted.Remove(previous);
        slotted[socket] = id;
        return MutationEquipResult.Equipped;
    }

    // What equipping into this socket would do, without changing anything. Equipped means legal; a mutation
    // already in the socket is replaced, and the mutation moves if it sits in another socket.
    public MutationEquipResult CheckEquip(LaboratoryMutationId id, ArcaneMutationSocketId socket, IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        if (!stabilized.Contains(id)) return MutationEquipResult.NotStabilized;
        if (!SocketUnlocked(socket, arcaneNodes)) return MutationEquipResult.SocketLocked;
        var mutation = LaboratoryCatalog.Get(id);
        // Rejected before a hunt can start, never discovered mid-fight.
        if (!BlueprintValidator.Validate(mutation.Blueprint, BlueprintRuleset.Current).IsValid) return MutationEquipResult.InvalidBlueprint;
        if (!mutation.ValidationFor(socket).IsValid) return MutationEquipResult.IncompatibleSocket;
        var remaining = slotted.Where(pair => pair.Key != socket && pair.Value != id).ToArray();
        // One primary cast: two mutations on the same foundation could never both wake.
        if (remaining.Any(pair => LaboratoryCatalog.Get(pair.Value).Foundation == mutation.Foundation)) return MutationEquipResult.FoundationTaken;
        if (remaining.Length + 1 > LaboratoryCatalog.MaxEquippedMutations) return MutationEquipResult.SocketLimitReached;
        return MutationEquipResult.Equipped;
    }

    public bool Unequip(LaboratoryMutationId id) => SocketOf(id) is { } socket && slotted.Remove(socket);

    public void Unequip() => slotted.Clear();

    // Called whenever the Arcane Web changes. A socket whose node is gone safely unequips its mutation;
    // the stabilized recipe itself is never removed.
    public string? ReconcileSocket(IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        var messages = new List<string>();
        foreach (var (socketId, id) in slotted.OrderBy(pair => pair.Key).ToArray())
        {
            if (SocketUnlocked(socketId, arcaneNodes)) continue;
            slotted.Remove(socketId);
            var socket = LaboratoryCatalog.Get(socketId);
            messages.Add($"{LaboratoryCatalog.Get(id).Name} was unequipped: the {socket.Name} needs {socket.NodeName} on the {socket.Route}. The recipe is kept.");
        }
        return messages.Count == 0 ? null : string.Join(' ', messages);
    }

    public IReadOnlyList<LaboratoryMutationId> PreparedFor(IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        return slotted.Where(pair => SocketUnlocked(pair.Key, arcaneNodes)).OrderBy(pair => pair.Key).Select(pair => pair.Value).ToArray();
    }
    // A pinned research lead: while the Laboratory still needs that mutation's specimen, the next hunt's
    // Wyrm is the one that carries it. The lead lapses on its own once the specimen is secured.
    public LaboratoryMutationId? Tracked { get; private set; }

    public bool NeedsSpecimen(LaboratoryMutationId id, DragonEssenceVault vault)
    {
        ArgumentNullException.ThrowIfNull(vault);
        return !stabilized.Contains(id) && vault.Count(LaboratoryCatalog.Get(id).Stabilizer) == 0;
    }

    // A lead lapses after this many hunts that drew its Wyrm without securing the specimen.
    public const int LeadHuntLimit = 3;

    public int LeadMisses { get; private set; }

    public int LeadHuntsLeft => Tracked is null ? 0 : LeadHuntLimit - LeadMisses;

    public bool Track(LaboratoryMutationId id, DragonEssenceVault vault)
    {
        if (!NeedsSpecimen(id, vault)) return false;
        if (Tracked != id) LeadMisses = 0;
        Tracked = id;
        return true;
    }

    public void Untrack()
    {
        Tracked = null;
        LeadMisses = 0;
    }

    // Called once per hunt in which the lead steered the Wyrm, after its Essences are stored.
    // Returns the mutation whose lead just lapsed; re-tracking it starts a fresh count.
    public LaboratoryMutationId? RecordLeadHunt(DragonEssenceVault vault)
    {
        if (Tracked is not { } id) return null;
        if (!NeedsSpecimen(id, vault))
        {
            Untrack();
            return null;
        }
        if (++LeadMisses < LeadHuntLimit) return null;
        Untrack();
        return id;
    }

    public DragonId? LeadWyrm(DragonEssenceVault vault) =>
        Tracked is { } id && NeedsSpecimen(id, vault) ? LaboratoryCatalog.Get(id).SpecimenWyrm : null;

    public bool ReconcileLead(DragonEssenceVault vault)
    {
        if (Tracked is not { } id || NeedsSpecimen(id, vault)) return false;
        Untrack();
        return true;
    }

    public void RecordFieldTest(LaboratoryMutationId? applied, int reactions)
    {
        if (applied is null) return;
        FieldTests++;
        FieldReactions += Math.Max(0, reactions);
    }

    public LaboratorySave ToSave() => new(SaveVersion,
        observations.Order().Select(id => id.ToString()).ToArray(),
        stabilized.Order().Select(id => id.ToString()).ToArray(),
        EquippedMutations.Select(id => (LaboratoryMutationId?)id).FirstOrDefault()?.ToString(), FieldTests, FieldReactions, Tracked?.ToString(),
        slotted.OrderBy(pair => pair.Key).Select(pair => $"{pair.Key}:{pair.Value}").ToArray(), LeadMisses);

    public void Restore(LaboratorySave? save)
    {
        observations.Clear();
        stabilized.Clear();
        slotted.Clear();
        FieldTests = 0;
        FieldReactions = 0;
        Untrack();
        if (save is null) return;
        foreach (var name in save.Observations ?? []) if (Enum.TryParse<LaboratoryObservationId>(name, out var id) && Enum.IsDefined(id)) observations.Add(id);
        foreach (var name in save.Mutations ?? []) if (Enum.TryParse<LaboratoryMutationId>(name, out var id) && Enum.IsDefined(id)) stabilized.Add(id);
        if (save.Slots is { } slots) foreach (var entry in slots) RestoreSlot(entry);
        else if (Enum.TryParse<LaboratoryMutationId>(save.Equipped, out var equipped) && stabilized.Contains(equipped)) slotted[LaboratoryCatalog.Get(equipped).Socket] = equipped;
        FieldTests = Math.Max(0, save.FieldTests);
        FieldReactions = Math.Max(0, save.FieldReactions);
        if (Enum.TryParse<LaboratoryMutationId>(save.Tracked, out var tracked) && Enum.IsDefined(tracked) && !stabilized.Contains(tracked))
        {
            Tracked = tracked;
            LeadMisses = Math.Clamp(save.LeadMisses, 0, LeadHuntLimit - 1);
        }
    }

    // Tampered or outdated slots are dropped rather than trusted: unknown ids, unstabilized recipes,
    // incompatible sockets, duplicates and anything over the socket limit.
    private void RestoreSlot(string? entry)
    {
        var parts = entry?.Split(':');
        if (parts is not { Length: 2 }) return;
        if (!Enum.TryParse<ArcaneMutationSocketId>(parts[0], out var socket) || !Enum.IsDefined(socket)) return;
        if (!Enum.TryParse<LaboratoryMutationId>(parts[1], out var id) || !stabilized.Contains(id)) return;
        var mutation = LaboratoryCatalog.Get(id);
        if (slotted.ContainsKey(socket) || slotted.ContainsValue(id) || !mutation.ValidationFor(socket).IsValid) return;
        if (slotted.Values.Any(other => LaboratoryCatalog.Get(other).Foundation == mutation.Foundation)) return;
        if (slotted.Count >= LaboratoryCatalog.MaxEquippedMutations) return;
        slotted[socket] = id;
    }
}