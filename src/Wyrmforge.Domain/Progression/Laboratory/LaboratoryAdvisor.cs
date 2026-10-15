using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Domain.Progression.Laboratory;

public enum LaboratoryPromptKind { Stabilize, Experiment, Equip, UnlockSocket, HuntSpecimen }

public sealed record LaboratoryPrompt(LaboratoryPromptKind Kind, LaboratoryMutationId Mutation, string Text);

// The single most useful next research step, shown after a hunt so the hunt feeds the Laboratory.
public static class LaboratoryAdvisor
{
    public static LaboratoryPrompt? Next(LaboratoryState laboratory, DragonEssenceVault vault, IReadOnlySet<string> arcaneNodes)
    {
        ArgumentNullException.ThrowIfNull(laboratory);
        ArgumentNullException.ThrowIfNull(vault);
        ArgumentNullException.ThrowIfNull(arcaneNodes);
        var mutations = Ordered(laboratory);

        foreach (var mutation in mutations)
            if (laboratory.Status(mutation.Id, vault) == MutationResearchStatus.ReadyToStabilize)
                return new(LaboratoryPromptKind.Stabilize, mutation.Id, $"Every condition is understood. Stabilize {mutation.Name} with 1 {mutation.Specimen.Name}.");

        foreach (var mutation in mutations)
        {
            var experiment = LaboratoryCatalog.ExperimentsFor(mutation.Id)
                .Where(candidate => candidate.Outcome != LaboratoryExperimentOutcome.Incompatibility)
                .FirstOrDefault(candidate => laboratory.Availability(candidate.Id, vault) == ExperimentAvailability.Ready);
            if (experiment is not null && !laboratory.Stabilized.Contains(mutation.Id))
                return new(LaboratoryPromptKind.Experiment, mutation.Id, $"New research for {mutation.Name}: {experiment.Name}.");
        }

        var unequipped = laboratory.Equipped is null
            ? mutations.Where(candidate => laboratory.Stabilized.Contains(candidate.Id)).ToArray()
            : [];
        if (unequipped.FirstOrDefault(candidate => LaboratoryState.SocketUnlocked(candidate.Socket, arcaneNodes)) is { } equippable)
            return new(LaboratoryPromptKind.Equip, equippable.Id, $"Equip {equippable.Name} for your next hunt.");
        if (unequipped.FirstOrDefault() is { } locked)
        {
            var socket = LaboratoryCatalog.Get(locked.Socket);
            return new(LaboratoryPromptKind.UnlockSocket, locked.Id, $"Allocate {socket.NodeName} on the {socket.Route} to equip {locked.Name}.");
        }

        foreach (var mutation in mutations.Where(candidate => laboratory.NeedsSpecimen(candidate.Id, vault)))
        {
            var wyrm = DragonCatalog.Get(mutation.SpecimenWyrm).Name;
            return laboratory.Tracked == mutation.Id
                ? new(LaboratoryPromptKind.HuntSpecimen, mutation.Id, $"{wyrm} answers your next hunt. Defeat it and secure a {mutation.Specimen.Name}.")
                : new(LaboratoryPromptKind.HuntSpecimen, mutation.Id, $"{mutation.Name} needs a {mutation.Specimen.Name}. Track {wyrm} in the Laboratory.");
        }

        return null;
    }

    // The pinned lead comes first, then catalog order, so the advice never jumps between recipes at random.
    private static IReadOnlyList<LaboratoryMutationDefinition> Ordered(LaboratoryState laboratory) =>
        LaboratoryCatalog.Mutations.OrderBy(mutation => mutation.Id == laboratory.Tracked ? 0 : 1).ToArray();
}
