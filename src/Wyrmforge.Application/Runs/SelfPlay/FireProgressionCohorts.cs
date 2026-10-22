using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Signature;
using Wyrmforge.Domain.Spells;

namespace Wyrmforge.Application.Runs.SelfPlay;

/// <summary>
/// Explicit Fire-only cohorts for acceptance diagnostics. They are not player unlocks,
/// nor do they change the existing cross-school Balance Lab baseline.
/// </summary>
public sealed record FireProgressionCohort(
    string Name,
    int CoreLevel,
    SelfPlayBuildDefinition Build,
    IReadOnlyCollection<FireballMutationId> EquippedMutations,
    IReadOnlyCollection<MutationAmplifierAssignment> Amplifiers);

public static class FireProgressionCohorts
{
    public static IReadOnlyList<FireProgressionCohort> All { get; } =
    [
        Create("Fire • Fresh Fireball", 1),
        Create("Fire • Mid Detonation", 3, "fire-conflagration", [FireballMutationId.Detonation]),
        Create("Fire • Crown of Ash", 5, "fire-spread-crown", [FireballMutationId.Detonation],
            [new("fire-spread-crown", "FireBolt", "Detonation")]),
        Create("Fire • Heart of Furnace", 5, "fire-ember-altar", [FireballMutationId.ScorchedEarth],
            [new("fire-ember-altar", "FireBolt", "ScorchedEarth")]),
    ];

    private static FireProgressionCohort Create(string name, int coreLevel, string? goal = null,
        IReadOnlyCollection<FireballMutationId>? equipped = null, IReadOnlyCollection<MutationAmplifierAssignment>? amplifiers = null)
    {
        var selection = new PassiveTreeSelection();
        selection.SetActiveSchool(PassiveSchool.Fire);
        if (goal is not null)
        {
            var route = PassiveTreePlanner.Plan(selection, goal)
                ?? throw new InvalidOperationException($"No legal Fire progression route to {goal}.");
            if (!selection.SelectPath(route.NodeIds))
                throw new InvalidOperationException($"Fire progression route to {goal} exceeds the Arcane budget.");
        }

        var mutations = equipped ?? [];
        var sockets = amplifiers ?? [];
        var descriptors = mutations.Select(MutationAmplifierCatalog.ForFireball).OfType<MutationEffectDescriptor>().ToArray();
        var validator = MutationAmplifierCatalog.CreateSockets();
        foreach (var binding in sockets)
        {
            var descriptor = descriptors.SingleOrDefault(x => x.SpellId == binding.SpellId && x.MutationId == binding.MutationId);
            if (descriptor is null || !validator.Assign(binding.NodeId, descriptor, selection.Selected, descriptors))
                throw new InvalidOperationException($"Illegal Fire progression amplifier {binding.NodeId} in {name}.");
        }

        if (coreLevel is < 1 or > FireballCoreCatalog.MaximumLevel || mutations.Count > coreLevel)
            throw new InvalidOperationException($"Illegal Fireball core level or mutation equipment in {name}.");

        var build = new SelfPlayBuildDefinition(name, SelfPlayBuildCohort.FullBuild, SpellSchool.Fire,
            selection.Selected, goal is null ? [] : [goal], selection.SpentPoints);
        return new FireProgressionCohort(name, coreLevel, build, mutations, sockets);
    }
}
