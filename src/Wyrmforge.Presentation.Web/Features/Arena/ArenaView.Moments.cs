using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Presentation.Web.Features.Arena;

public partial class ArenaView
{
    private RunMoment? runMoment;
    private long runMomentVersion;
    private bool disposed;

    private void ShowRunMoment(RunMoment value)
    {
        runMoment = value;
        var version = ++runMomentVersion;
        _ = ClearRunMomentAsync(version);
    }

    private async Task ClearRunMomentAsync(long version)
    {
        await Task.Delay(TimeSpan.FromSeconds(1.8));
        if (disposed || version != runMomentVersion) return;
        runMoment = null;
        await InvokeAsync(StateHasChanged);
    }

    private void ShowChoiceMoment(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.Evolution)
        {
            ShowRunMoment(new RunMoment("SPELL EVOLVED", choice.Name, choice.Description, RunMomentTone.Legendary));
            return;
        }

        if (choice.Kind == LevelChoiceKind.Synergy)
        {
            ShowRunMoment(new RunMoment("SYNERGY AWAKENED", choice.Name, choice.Description, RunMomentTone.Legendary));
            return;
        }

        if (choice.Kind == LevelChoiceKind.NewSpell)
        {
            ShowRunMoment(new RunMoment("SPELL BOUND", choice.Name, "A new spell has entered this run.", RunMomentTone.Rare));
            return;
        }

        if (choice.Kind == LevelChoiceKind.SpellUpgrade && choice.CurrentRank + 1 == choice.MaxRank) return;

        if (choice.Kind == LevelChoiceKind.Rune && choice.Rarity is RewardRarity.Rare or RewardRarity.Legendary)
        {
            ShowRunMoment(new RunMoment("RARE RUNE", choice.Name, choice.Description, RunMomentTone.Rare));
        }
    }

    private void ShowEssenceMoment(DragonEssenceDefinition essence) =>
        ShowRunMoment(new RunMoment("ESSENCE STOLEN", essence.Name, "Unsecured — hold the evacuation circle to carry it to Refuge.", RunMomentTone.Danger));

    private void ShowRelicMoment(RelicDefinition relic) =>
        ShowRunMoment(new RunMoment("RELIC CLAIMED", relic.Name, "It remains yours for the rest of this run.", relic.Rarity == RelicRarity.Rare ? RunMomentTone.Rare : RunMomentTone.Standard));

    private void ShowMapMoment(WyrmrealmMapNode node)
    {
        if (node.Rarity != WyrmrealmNodeRarity.Rare) return;
        ShowRunMoment(new RunMoment("RARE TRAIL ENTERED", node.Name, "Higher pressure • doubled route score • relic cache", RunMomentTone.Legendary));
    }

    private void ShowCheckpointMoment(RunCheckpointActionId action)
    {
        if (action == RunCheckpointActionId.MendWounds)
        {
            ShowRunMoment(new RunMoment("REFUGE RESTORATION", "Vitality restored", "This Refuge can mend you only once per visit.", RunMomentTone.Success));
            return;
        }

        if (action == RunCheckpointActionId.Descend)
        {
            ShowRunMoment(new RunMoment($"DESCENDING • DEPTH {CurrentDepth}", "The realm tightens around you", "Secured Essence stays safe. Everything gained from here is at risk.", RunMomentTone.Danger));
        }
    }

    private void ShowEssenceSecuredMoment() =>
        ShowRunMoment(new RunMoment("EVACUATION COMPLETE", "Essence secured", "This haul now survives a deeper defeat.", RunMomentTone.Success));
}
