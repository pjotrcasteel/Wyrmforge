using Wyrmforge.Application.Runs.Development;
using Wyrmforge.Application.Runs.Navigation;
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
        adaptiveAshfangEnabled = setup.AdaptiveAgents;
        developmentInvulnerable = setup.Invulnerable;
        while (depthState.Depth < 2) depthState.PushDeeper();
        mapState = CreateSeededMapState(depthState.Depth);
        EnsurePlayerPosition(setup.Width, setup.Height);
        if (setup.Environment)
            arenaEnvironment = ArenaEnvironmentState.Create(mapState.Seed, mapState.Nodes.First(node => node.Type == WyrmrealmNodeType.Dragon), regionSchool: DragonCatalog.Get(setup.Wyrm).School);

        // A repeatable, evolved boss-ready spell; no Forge grants or saved progression.
        var spell = SpellCatalog.Get(setup.Spell);
        while (build.Spells[setup.Spell] < (setup.BossReadySpell ? spell.MaxRank : 1)) build.Spells.LearnOrUpgrade(setup.Spell);
        build.Spells.TryFocus(setup.Spell);
        var evolution = SpellEvolutionCatalog.All.First(choice => choice.Spell == setup.Spell && !choice.RequiresForgeUnlock && !choice.RequiresMasteryUnlock);
        if (setup.BossReadySpell) build.Evolutions.Select(evolution.Id, build.Spells);
        RefreshBuildModifiers(true);
        RefreshBuildHud();

        if (!setup.Casting)
            foreach (var spellId in spellCooldowns.Keys) spellCooldowns[spellId] = double.PositiveInfinity;

        attractedDragon = setup.Wyrm;
        SpawnDragon(DragonCatalog.Get(setup.Wyrm), setup.Width, setup.Height);
        if (setup.Phase == 2 && dragon is { } activeDragon) activeDragon.Health = activeDragon.MaxHealth * 0.5;
    }
}
