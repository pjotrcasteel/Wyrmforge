using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Laboratory;

public enum ExperimentAvailability { Ready, AlreadyRecorded, MissingSample, MissingObservation }

public enum MutationResearchStatus { MissingObservations, MissingStabilizer, ReadyToStabilize, Stabilized }

public enum MutationEquipResult { Equipped, NotStabilized, SocketLocked }

public sealed record LaboratoryExperimentResult(LaboratoryExperimentDefinition Experiment, bool Novel, bool Rejected)
{
    public string Message => Rejected ? "Not possible yet." : Novel ? Experiment.Finding : "Already recorded. Repeating it teaches nothing new.";
}

public sealed record LaboratorySave(int Version, string[] Observations, string[] Mutations, string? Equipped, int FieldTests, int FieldReactions);

// Persistent research knowledge and the one equipped mutation. Experiments are deterministic and
// idempotent: a novel experiment always records its specific observation, a repeated one never farms
// progress, and no experiment consumes a specimen. Only stabilization spends one, with explicit consent.
public sealed class LaboratoryState
{
    public const int SaveVersion = 1;

    private readonly HashSet<LaboratoryObservationId> observations = [];
    private readonly HashSet<LaboratoryMutationId> stabilized = [];

    public IReadOnlySet<LaboratoryObservationId> Observations => new HashSet<LaboratoryObservationId>(observations);
    public IReadOnlySet<LaboratoryMutationId> Stabilized => new HashSet<LaboratoryMutationId>(stabilized);
    public LaboratoryMutationId? Equipped { get; private set; }
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
        return stabilized.Add(id);
    }

    public static bool SocketUnlocked(ArcaneMutationSocketId socket, IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        return arcaneNodes.Contains(LaboratoryCatalog.Get(socket).NodeId);
    }

    public MutationEquipResult Equip(LaboratoryMutationId id, IReadOnlySet<string> arcaneNodes)
    {
        if (!stabilized.Contains(id)) return MutationEquipResult.NotStabilized;
        if (!SocketUnlocked(LaboratoryCatalog.Get(id).Socket, arcaneNodes)) return MutationEquipResult.SocketLocked;
        Equipped = id;
        return MutationEquipResult.Equipped;
    }

    public void Unequip() => Equipped = null;

    // Called whenever the Arcane Web changes. An invalid socket safely unequips the mutation;
    // the stabilized recipe itself is never removed.
    public string? ReconcileSocket(IReadOnlySet<string> arcaneNodes)
    {
        if (Equipped is not { } id) return null;
        var mutation = LaboratoryCatalog.Get(id);
        if (SocketUnlocked(mutation.Socket, arcaneNodes)) return null;
        Equipped = null;
        var socket = LaboratoryCatalog.Get(mutation.Socket);
        return $"{mutation.Name} was unequipped: the {socket.Name} needs {socket.NodeName} on the {socket.Route}. The recipe is kept.";
    }

    public LaboratoryMutationId? PreparedFor(IReadOnlySet<string> arcaneNodes) =>
        Equipped is { } id && SocketUnlocked(LaboratoryCatalog.Get(id).Socket, arcaneNodes) ? id : null;

    public void RecordFieldTest(LaboratoryMutationId? applied, int reactions)
    {
        if (applied is null) return;
        FieldTests++;
        FieldReactions += Math.Max(0, reactions);
    }

    public LaboratorySave ToSave() => new(SaveVersion,
        observations.Order().Select(id => id.ToString()).ToArray(),
        stabilized.Order().Select(id => id.ToString()).ToArray(),
        Equipped?.ToString(), FieldTests, FieldReactions);

    public void Restore(LaboratorySave? save)
    {
        observations.Clear();
        stabilized.Clear();
        Equipped = null;
        FieldTests = 0;
        FieldReactions = 0;
        if (save is null) return;
        foreach (var name in save.Observations ?? []) if (Enum.TryParse<LaboratoryObservationId>(name, out var id) && Enum.IsDefined(id)) observations.Add(id);
        foreach (var name in save.Mutations ?? []) if (Enum.TryParse<LaboratoryMutationId>(name, out var id) && Enum.IsDefined(id)) stabilized.Add(id);
        if (Enum.TryParse<LaboratoryMutationId>(save.Equipped, out var equipped) && stabilized.Contains(equipped)) Equipped = equipped;
        FieldTests = Math.Max(0, save.FieldTests);
        FieldReactions = Math.Max(0, save.FieldReactions);
    }
}
