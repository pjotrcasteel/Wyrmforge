using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Domain.Progression.GreatHunt;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Spells;
using Wyrmforge.Domain.Spells.Evolutions;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private bool developmentHunt;
    private bool developmentInvulnerable;

    internal void StartDevelopmentHunt(DevelopmentHuntSetup setup)
    {
        setup.Validate();
        if (setup.Ascendant && !AscendantRiteCatalog.IsAvailable(setup.Wyrm))
            throw new ArgumentException("This Ascendant has no implemented encounter.", nameof(setup));

        developmentHunt = true;
        developmentInvulnerable = setup.Invulnerable;
        while (depthState.Depth < 2) depthState.PushDeeper();
        mapState = CreateSeededMapState(depthState.Depth);
        EnsurePlayerPosition(setup.Width, setup.Height);

        // A repeatable, evolved boss-ready spell; no Forge grants or saved progression.
        var spell = SpellCatalog.Get(setup.Spell);
        while (build.Spells[setup.Spell] < spell.MaxRank) build.Spells.LearnOrUpgrade(setup.Spell);
        var evolution = SpellEvolutionCatalog.All.First(choice => choice.Spell == setup.Spell && !choice.RequiresForgeUnlock && !choice.RequiresMasteryUnlock);
        build.Evolutions.Select(evolution.Id, build.Spells);
        RefreshBuildModifiers(true);
        RefreshBuildHud();

        attractedDragon = setup.Wyrm;
        SpawnDragon(DragonCatalog.Get(setup.Wyrm), setup.Width, setup.Height);
        if (setup.Phase == 2 && dragon is { } activeDragon) activeDragon.Health = activeDragon.MaxHealth * 0.5;
    }
}
