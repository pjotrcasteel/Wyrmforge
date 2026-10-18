using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.Loadouts;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Nexus;

// Where a researchable node's recipe stands, in the order the player walks it (amendment §3, §11 step 2).
public enum NexusResearchStage { NeedsMaterial, Experimenting, ReadyToStabilize, Discovered, Equipped }

public enum NexusActionKind { None, TrackMaterial, HuntMaterial, RunExperiment, Stabilize, AllocateNode, Equip }

public sealed record NexusAction(NexusActionKind Kind, string Text, LaboratoryExperimentId? Experiment = null);

// A required material with an owned/needed count and where it is found (Monster Hunter-style sourcing).
public sealed record NexusMaterialNeed(DragonEssenceDefinition Material, int Owned, int Needed, DragonId Source, string SourceName, bool Tracked, int TrackedHuntsLeft)
{
    public bool Met => Owned >= Needed;
}

public sealed record NexusExperimentStep(LaboratoryExperimentDefinition Experiment, ExperimentAvailability Availability)
{
    public bool Known => Availability == ExperimentAvailability.AlreadyRecorded;
}

public sealed record NexusResearch(
    LaboratoryMutationDefinition Mutation,
    NexusResearchStage Stage,
    NexusMaterialNeed? Material,
    IReadOnlyList<NexusExperimentStep> Experiments,
    int ConditionsKnown,
    int ConditionsNeeded,
    NexusAction Next,
    IReadOnlyList<string> LoadoutReferences);

// A Web node's mutation socket: what it accepts, what it holds and which discovered recipes could go in it.
public sealed record NexusSocket(
    ArcaneMutationSocketDefinition Definition,
    bool Unlocked,
    LaboratoryMutationId? Holder,
    IReadOnlyList<LaboratoryMutationId> Equippable);

public sealed record NexusNode(string NodeId, NexusSocket? Socket, IReadOnlyList<NexusResearch> Research)
{
    public bool HasResearch => Research.Count > 0;
}

public sealed record NexusSuggestion(string NodeId, LaboratoryMutationId Mutation, LaboratoryPromptKind Kind, string Text);

// The Arcane Nexus boundary: one read model joining the Web (passive selection), research (LaboratoryState),
// materials (DragonEssenceVault) and loadouts. It only reads; every change still goes through the owning state.
public static class ArcaneNexus
{
    public static NexusNode Node(string nodeId, LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes, HuntLoadoutBook? loadouts = null)
    {
        ArgumentNullException.ThrowIfNull(nodeId);
        ArgumentNullException.ThrowIfNull(laboratory);
        ArgumentNullException.ThrowIfNull(vault);
        ArgumentNullException.ThrowIfNull(arcaneNodes);

        var socket = LaboratoryCatalog.Sockets.FirstOrDefault(candidate => candidate.NodeId == nodeId);
        if (socket is null) return new(nodeId, null, []);
        var research = LaboratoryCatalog.Mutations
            .Where(mutation => mutation.Socket == socket.Id)
            .Select(mutation => Research(mutation, laboratory, vault, arcaneNodes, loadouts))
            .ToArray();
        return new(nodeId, Socket(socket, laboratory, arcaneNodes), research);
    }

    public static bool IsResearchNode(string nodeId) =>
        LaboratoryCatalog.Sockets.Any(socket => socket.NodeId == nodeId && LaboratoryCatalog.Mutations.Any(mutation => mutation.Socket == socket.Id));

    // The most advanced stage among the node's recipes, used to badge the node on the Web.
    public static NexusResearchStage? Mark(string nodeId, LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes)
    {
        var node = Node(nodeId, laboratory, vault, arcaneNodes);
        return node.HasResearch ? node.Research.Max(research => research.Stage) : null;
    }

    // The single next research step (shared with the post-hunt prompt), pointed at the Web node that hosts it.
    public static NexusSuggestion? Suggest(LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes)
    {
        if (LaboratoryAdvisor.Next(laboratory, vault, arcaneNodes) is not { } prompt) return null;
        var mutation = LaboratoryCatalog.Get(prompt.Mutation);
        return new(LaboratoryCatalog.Get(mutation.Socket).NodeId, prompt.Mutation, prompt.Kind, prompt.Text);
    }

    // Names of saved loadouts that slot this recipe, so a discovery visibly connects to hunt preparation.
    public static IReadOnlyList<string> LoadoutsUsing(LaboratoryMutationId id, HuntLoadoutBook? loadouts)
    {
        if (loadouts is null) return [];
        var names = new List<string>();
        for (var index = 0; index < HuntLoadoutBook.SlotCount; index++)
            if (loadouts[index] is { } loadout && loadout.Slots.Values.Contains(id)) names.Add(loadout.Name);
        return names;
    }

    private static NexusSocket Socket(ArcaneMutationSocketDefinition socket, LaboratoryState laboratory, IReadOnlySet<string> arcaneNodes)
    {
        var holder = laboratory.Slotted.TryGetValue(socket.Id, out var held) ? held : (LaboratoryMutationId?)null;
        var equippable = LaboratoryCatalog.Mutations
            .Where(mutation => laboratory.Stabilized.Contains(mutation.Id) && mutation.CompatibleSockets.Contains(socket.Id))
            .Select(mutation => mutation.Id)
            .ToArray();
        return new(socket, LaboratoryState.SocketUnlocked(socket.Id, arcaneNodes), holder, equippable);
    }

    public static NexusResearch Research(LaboratoryMutationDefinition mutation, LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes, HuntLoadoutBook? loadouts)
    {
        var experiments = LaboratoryCatalog.ExperimentsFor(mutation.Id)
            .Select(experiment => new NexusExperimentStep(experiment, laboratory.Availability(experiment.Id, vault)))
            .ToArray();
        var known = mutation.RequiresObservations.Count(laboratory.HasObserved);
        var status = laboratory.Status(mutation.Id, vault);
        var tracked = laboratory.Tracked == mutation.Id;
        var wyrm = DragonCatalog.Get(mutation.SpecimenWyrm).Name;
        var material = status == MutationResearchStatus.Stabilized ? null : new NexusMaterialNeed(mutation.Specimen, vault.Count(mutation.Stabilizer), 1,
            mutation.SpecimenWyrm, wyrm, tracked, tracked ? laboratory.LeadHuntsLeft : 0);
        // Dead-end experiments stay runnable as optional knowledge; the guided step follows the main line first.
        var ready = experiments.FirstOrDefault(step => step.Availability == ExperimentAvailability.Ready && step.Experiment.Outcome != LaboratoryExperimentOutcome.Incompatibility)
            ?? experiments.FirstOrDefault(step => step.Availability == ExperimentAvailability.Ready);
        var socket = LaboratoryCatalog.Get(mutation.Socket);

        var (stage, next) = (laboratory.IsEquipped(mutation.Id), status) switch
        {
            (true, _) => (NexusResearchStage.Equipped,
                new NexusAction(NexusActionKind.None, $"Equipped. It wakes whenever {SpellCatalog.Get(mutation.Foundation).Name} is your primary.")),
            (false, MutationResearchStatus.Stabilized) => (NexusResearchStage.Discovered,
                LaboratoryState.SocketUnlocked(mutation.Socket, arcaneNodes)
                    ? new NexusAction(NexusActionKind.Equip, $"Equip {mutation.Name} in the {socket.Name}.")
                    : new NexusAction(NexusActionKind.AllocateNode, $"Allocate {socket.NodeName} to open its socket, then equip {mutation.Name}.")),
            (false, MutationResearchStatus.ReadyToStabilize) => (NexusResearchStage.ReadyToStabilize,
                new NexusAction(NexusActionKind.Stabilize, $"Every condition is understood. Stabilize with 1 {mutation.Specimen.Name}.")),
            _ when ready is not null => (NexusResearchStage.Experimenting,
                new NexusAction(NexusActionKind.RunExperiment, ready.Experiment.Name, ready.Experiment.Id)),
            _ => (NexusResearchStage.NeedsMaterial, tracked
                ? new NexusAction(NexusActionKind.HuntMaterial, $"{wyrm} answers your next hunt. Secure a {mutation.Specimen.Name}.")
                : new NexusAction(NexusActionKind.TrackMaterial, $"Needs a {mutation.Specimen.Name} from {wyrm}. Track it to meet {wyrm} on your next hunt.")),
        };

        return new(mutation, stage, material, experiments, known, mutation.RequiresObservations.Count, next, LoadoutsUsing(mutation.Id, loadouts));
    }
}
