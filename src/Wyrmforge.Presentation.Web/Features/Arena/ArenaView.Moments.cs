using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Rewards;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Domain.Combat.Enemies;
using Wyrmforge.Presentation.Web.Features.LevelUp;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;

namespace Wyrmforge.Presentation.Web.Features.Arena;

public partial class ArenaView
{
    private RunMoment? runMoment;
    private long runMomentVersion;
    private bool disposed;
    private bool trailTransition;

    // Compact and low on screen: an elite is named without covering the fight (brief §7, no big boss bar).
    private void ShowEliteSighted(EliteAffixDefinition elite) =>
        ShowRunMoment(new RunMoment("ELITE", elite.Title, elite.Detail, RunMomentTone.Danger, Compact: true));

    private void ShowEliteDefeated(EliteDefeat defeat) =>
        ShowRunMoment(new RunMoment("ELITE SLAIN", EliteAffixCatalog.Get(defeat.Affix).Title, $"+{defeat.ExperienceAwarded} XP", RunMomentTone.Rare, Compact: true));

    private void ShowReliquarySighted() =>
        ShowRunMoment(new RunMoment("THE RELIQUARY", "It has walked these grounds for longer than the monastery stood", "Break its wards to wound it • avoid the gilt seals", RunMomentTone.Legendary));

    private void ShowReliquaryShift() =>
        ShowRunMoment(new RunMoment("THE RITUAL DEEPENS", "The Reliquary", "Wider seals • more corruption", RunMomentTone.Danger, Compact: true));

    private void ShowReliquaryDefeated(ReliquaryDefeat defeat) =>
        ShowRunMoment(new RunMoment("RELIQUARY SLAIN", "The rites are broken", $"+{defeat.ExperienceAwarded} XP • recorded in the Codex", RunMomentTone.Legendary));

    private void ShowBellWardenArrived() => ShowRunMoment(simulation?.BellRoadKind == EnemyKind.BellOfWinter
        ? new RunMoment("THE BELL OF WINTER", "Its toll walls the road to Rimeclaw", "Run the open lanes • leave the marked shards • the scars stay", RunMomentTone.Legendary)
        : new RunMoment("THE BELL WARDEN", "It guards the last road to the lair", "Step out of the crater • outrun the ring • it tolls in lines", RunMomentTone.Legendary));

    private void ShowWinterBellRimed() =>
        ShowRunMoment(new RunMoment("DEEP WINTER", "The Bell of Winter rimes over", "Strike now • then more rings, more scars", RunMomentTone.Danger, Compact: true));

    private void ShowBellCracked() =>
        ShowRunMoment(new RunMoment("THE BELL CRACKS", "The Bell Warden", "The toll splits three ways", RunMomentTone.Danger, Compact: true));

    private void ShowBellWardenSlain(BellWardenDefeat defeat) =>
        ShowRunMoment(new RunMoment(simulation?.BellRoadKind == EnemyKind.BellOfWinter ? "THE BELL OF WINTER FALLS SILENT" : "THE BELL FALLS SILENT",
            simulation?.BellRoadKind == EnemyKind.BellOfWinter ? "The thaw opens Rimeclaw's road" : "The road to the lair is open", $"+{defeat.ExperienceAwarded} XP • recorded in the Codex", RunMomentTone.Legendary));

    private void ShowReliquaryWithdrawn() =>
        ShowRunMoment(new RunMoment("THE RELIQUARY WITHDRAWS", "It will not be found here again", "The trail is clear.", RunMomentTone.Standard, Compact: true));

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

    private void ShowTrailTransition() => trailTransition = true;

    private void ContinueAfterTrail() => trailTransition = false;

    private void ShowChoiceMoment(LevelChoice choice)
    {
        if (choice.Kind == LevelChoiceKind.Evolution) return; // The evolution ceremony owns the confirmation beat.

        if (choice.Kind == LevelChoiceKind.Synergy)
        {
            ShowRunMoment(new RunMoment("SYNERGY AWAKENED", choice.Name, choice.Description, RunMomentTone.Legendary));
            return;
        }

        if (choice.Kind == LevelChoiceKind.SpellUpgrade && choice.CurrentRank + 1 == choice.MaxRank) return;
        var tone = choice.Kind == LevelChoiceKind.NewSpell || choice.Rarity is RewardRarity.Rare or RewardRarity.Legendary
            ? RunMomentTone.Rare : RunMomentTone.Standard;
        ShowRunMoment(new RunMoment(string.Empty, $"{choice.Icon} {choice.Name}", LevelChoicePresentation.Delta(choice), tone, Compact: true));
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
