using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Progression;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.Laboratory;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Application.World;
using Wyrmforge.Domain.World;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed class RunSimulationFactory(IRandomSource seedSource)
{
    // Developer-only entry point: no persisted progress, no oath unlock, and no modification to normal run creation.
    public RunSimulation CreateDevelopmentHunt(IReadOnlySet<string> selectedNodes, DevelopmentHuntSetup setup)
    {
        ArgumentNullException.ThrowIfNull(setup);
        var simulation = Create(selectedNodes, seed: setup.Seed, ascendantWyrm: setup.Ascendant ? setup.Wyrm : null);
        simulation.StartDevelopmentHunt(setup);
        return simulation;
    }

    public RunSimulation Create(IReadOnlySet<string> selectedNodes, DragonEssenceId? offering = null, int? seed = null, ForgeProgressionState? progression = null, SpellMasteryState? masteries = null, bool ascendantAshfang = false, DragonId? ascendantWyrm = null, bool firstHunt = false, LaboratoryMutationId? preparedMutation = null, DragonId? researchLead = null, IReadOnlyCollection<LaboratoryMutationId>? preparedMutations = null, bool contextualSpell = false, RegionId? region = null)
    {
        var runSeed = seed ?? seedSource.Next(int.MaxValue);
        var randomSource = new SeededRandomSource(runSeed);
        var content = progression is null ? RunContentProfile.All : RunContentProfile.From(progression, masteries);
        var levelChoiceService = new LevelChoiceService(randomSource, content.Spells, content.Evolutions);
        var simulation = new RunSimulation(selectedNodes, levelChoiceService, randomSource, offering);
        simulation.InitializeRunSeed(runSeed);
        simulation.EnableAscendantRite(ascendantWyrm ?? (ascendantAshfang ? DragonId.Ashfang : null));
        simulation.EnterRegion(region is { } regionId ? RegionCatalog.Get(regionId) : RegionCatalog.Starting);
        simulation.EnableFirstHunt(firstHunt);
        simulation.InitializeContentProfile(content);
        simulation.InitializeResonance(selectedNodes);
        var prepared = new List<LaboratoryMutationId>();
        if (preparedMutation is { } single) prepared.Add(single);
        if (preparedMutations is not null) prepared.AddRange(preparedMutations);
        simulation.PrepareLaboratoryMutations(prepared);
        simulation.EnableResearchLead(researchLead);
        // The first hunt teaches one spell; the contextual slot waits for the hunter's first milestone.
        simulation.PrepareContextualSpell(contextualSpell && !firstHunt);
        return simulation;
    }
}
