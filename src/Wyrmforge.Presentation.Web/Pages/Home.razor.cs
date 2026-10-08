using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Domain.Progression.Codex;
using Wyrmforge.Domain.Combat.Dragons;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Forge;
using Wyrmforge.Domain.Progression.GreatHunt;
using Wyrmforge.Domain.Progression.PassiveTree;
using Wyrmforge.Domain.Progression.Onboarding;
using Wyrmforge.Domain.Progression.SpellMastery;
using Wyrmforge.Domain.Spells.Evolutions;
using Wyrmforge.Domain.Spells.Synergies;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string FirstHuntKey = "wyrmforge.firstHunt.v1";
    private const string ArcaneBuildKey = "wyrmforge.arcaneBuild.v1";
    private const string BestScoreKey = "wyrmforge.bestScore";
    private const string EssenceVaultKey = "wyrmforge.essenceVault";
    private const string ArcaneCodexKey = "wyrmforge.arcaneCodex";
    private const string ForgeProgressionKey = "wyrmforge.forgeProgression";
    private const string ForgeMasteryKey = "wyrmforge.forgeMastery";
    private const string SpellMasteryKey = "wyrmforge.spellMastery.v1";
    private const string GreatHuntKey = "wyrmforge.greatHunt.v1";
    private readonly PassiveTreeSelection selection = new(1);
    private readonly FirstHuntProgress firstHunt = new();
    private readonly DragonEssenceVault essenceVault = new();
    private readonly ArcaneCodex arcaneCodex = new();
    private readonly ForgeProgressionState forgeProgression = new();
    private readonly SpellMasteryState spellMastery = new();
    private readonly GreatHuntState greatHunt = new();
    private IReadOnlyList<Wyrmforge.Domain.Combat.Dragons.DragonId> advancedOaths = [];
    private IReadOnlyList<DragonId> newlyConqueredAscendants = [];
    private IReadOnlyList<Wyrmforge.Domain.Combat.Dragons.DragonId> newlySealedOaths = [];
    private IReadOnlyList<SpellEvolutionId> newlyUnlockedLineages = [];
    private IReadOnlyList<Wyrmforge.Domain.Spells.SpellId> advancedSpellIds = [];
    private int lastCreditedRunNumber = -1;
    private RunSummary? summary;
    private DragonEssenceId? selectedOffering;
    private DragonEssenceId? activeOffering;
    private int? activeRunSeed;
    private int bestScore;
    private int runNumber;
    private bool runActive;
    private bool tutorialCinematic;
    private bool unlockCinematic;
    private bool leaderboardOpen;
    private bool ForgeAvailable => firstHunt.AtlasUnlocked && (essenceVault.TotalCount > 0 || forgeProgression.Discovered.Count > 0);
    private bool playtestFeedbackOpen;

    private void OpenPlaytestFeedback() => playtestFeedbackOpen = true;
    private void ClosePlaytestFeedback() => playtestFeedbackOpen = false;
    private DragonId? selectedAscendant;
    private DragonId? activeAscendant;

    [Inject] public IJSRuntime JavaScript { get; set; } = null!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        bestScore = await TryGetBestScoreAsync();
        await TryLoadEssenceVaultAsync();
        await TryLoadForgeProgressionAsync();
        await TryLoadForgeMasteryAsync();
        await TryLoadSpellMasteryAsync();
        await TryLoadGreatHuntAsync();
        var restoredOathHistory = greatHunt.ReconcileForgeHistory(forgeProgression);
        restoredOathHistory |= greatHunt.ReconcileMasteryHistory(spellMastery);
        if (restoredOathHistory) await TrySetGreatHuntAsync();
        if (forgeProgression.Discover(ForgeDiscoveryContext.FromEssences(essenceVault.SecuredEssences)).Count > 0) await TrySetForgeProgressionAsync();
        await TryLoadArcaneCodexAsync();
        await LoadFirstHuntAsync();
        await LoadArcaneBuildAsync();
        StateHasChanged();
    }

    private void SelectOffering(DragonEssenceId id)
    {
        if (essenceVault.Count(id) <= 0 || !RunOfferingCatalog.CanOffer(id, forgeProgression)) return;
        selectedOffering = selectedOffering == id ? null : id;
    }

    private async Task ForgeMasteryAsync(ForgeMasteryId id)
    {
        var cost = ForgeMasteryCatalog.Get(id).Cost;
        if (!forgeProgression.Forge(id, essenceVault)) return;
        if (selectedOffering == cost && essenceVault.Count(cost) == 0) selectedOffering = null;
        await TrySetEssenceVaultAsync();
        await TrySetForgeMasteryAsync();
    }

    private void SelectAscendant(DragonId? selected) =>
        selectedAscendant = selected is { } wyrm && AscendantRiteCatalog.IsAvailable(wyrm) && greatHunt.IsSealed(wyrm, spellMastery) ? selected : null;

    private async Task StartRunAsync()
    {
        newlyUnlockedLineages = [];
        advancedSpellIds = [];
        advancedOaths = [];
        newlySealedOaths = [];
        newlyConqueredAscendants = [];
        activeAscendant = selectedAscendant is { } wyrm && greatHunt.IsSealed(wyrm, spellMastery) ? wyrm : null;
        summary = null;
        activeOffering = null;
        activeRunSeed = null;
        if (selectedOffering is { } offering && forgeProgression.UnlocksOffering(offering) && essenceVault.Consume(offering))
        {
            activeOffering = offering;
            await TrySetEssenceVaultAsync();
        }
        selectedOffering = null;
        await SaveArcaneBuildAsync();
        runNumber++;
        runActive = true;
        await TryRecordPlaytestStartAsync();
    }

    private async Task HandleGameOverAsync(RunSummary value)
    {
        if (lastCreditedRunNumber == runNumber) return;
        lastCreditedRunNumber = runNumber;
        var previouslyConquered = AscendantRiteCatalog.All.Where(rite => greatHunt.Get(rite.Wyrm).AscendantDefeated).Select(rite => rite.Wyrm).ToHashSet();
        var oldSeals = GreatHuntCatalog.All.Where(oath => greatHunt.IsSealed(oath.Wyrm, spellMastery)).Select(oath => oath.Wyrm).ToHashSet();
        var mastery = spellMastery.RecordRun(new MasteryRunEvidence(
            value.CompletedRouteNodes,
            value.Depth,
            value.Outcome == RunOutcome.Abandoned,
            value.WyrmMasteryFeats.ToHashSet(),
            value.SpellLoadout.Select(spell => new MasteryRunSpell(spell.Id, spell.Rank)).ToArray()));
        newlyUnlockedLineages = mastery.NewlyUnlocked;
        advancedSpellIds = mastery.Progressed;
        if (mastery.Progressed.Count > 0) await TrySetSpellMasteryAsync();
        advancedOaths = greatHunt.RecordRun(new GreatHuntRunEvidence(value.CompletedRouteNodes, value.Outcome == RunOutcome.Abandoned,
            value.DragonIds.ToHashSet(), value.DeepEvolvedWyrmDuels.ToHashSet(), value.EssenceIds)
        { AscendantVictories = value.AscendantDragonIds.ToHashSet() });
        newlyConqueredAscendants = AscendantRiteCatalog.All.Where(rite => !previouslyConquered.Contains(rite.Wyrm) && greatHunt.Get(rite.Wyrm).AscendantDefeated)
            .Select(rite => rite.Wyrm).ToArray();
        newlySealedOaths = GreatHuntCatalog.All.Where(oath => !oldSeals.Contains(oath.Wyrm) && greatHunt.IsSealed(oath.Wyrm, spellMastery))
            .Select(oath => oath.Wyrm).ToArray();
        if (advancedOaths.Count > 0 || newlySealedOaths.Count > 0) await TrySetGreatHuntAsync();
        var tutorialEnded = firstHunt.TutorialRun && value.Outcome != RunOutcome.Abandoned;
        var chapterAdvanced = firstHunt.CompletedRuns == 1 && value.Outcome != RunOutcome.Abandoned;
        if (tutorialEnded || chapterAdvanced)
        {
            firstHunt.CompleteRun(false);
            if (chapterAdvanced) selection.GrantPoints(1);
            await PersistFirstHuntAsync();
            await SaveArcaneBuildAsync();
        }
        summary = tutorialEnded ? null : value;
        if (chapterAdvanced) leaderboardOpen = true;
        await TryRecordPlaytestFinishAsync(value);
        if (tutorialEnded)
        {
            tutorialCinematic = true;
            _ = CompleteFirstHuntCinematicAsync();
        }
        var codexChanged = false;
        foreach (var synergyId in value.SynergyIds) codexChanged |= arcaneCodex.Discover(synergyId);
        if (codexChanged) await TrySetArcaneCodexAsync();

        if (value.EssenceIds.Count > 0)
        {
            foreach (var essenceId in value.EssenceIds) essenceVault.Store(essenceId);
            await TrySetEssenceVaultAsync();
            if (forgeProgression.Discover(ForgeDiscoveryContext.FromEssences(value.EssenceIds)).Count > 0) await TrySetForgeProgressionAsync();
        }
        if (value.Score <= bestScore) return;
        bestScore = value.Score;
        await TrySetBestScoreAsync(bestScore);
    }

    private async Task ReplayRunAsync()
    {
        if (summary is null) return;
        activeRunSeed = summary.Seed;
        summary = null;
        newlyUnlockedLineages = [];
        advancedSpellIds = [];
        advancedOaths = [];
        newlySealedOaths = [];
        newlyConqueredAscendants = [];
        runNumber++;
        runActive = true;
        await TryRecordPlaytestStartAsync();
    }

    private async Task CompleteFirstHuntCinematicAsync()
    {
        await InvokeAsync(StateHasChanged);
        await Task.Delay(2850);
        tutorialCinematic = false;
        runActive = false;
        unlockCinematic = true;
        await InvokeAsync(StateHasChanged);
    }

    private void DismissUnlocks() => unlockCinematic = false;
    private void OpenLeaderboard() => leaderboardOpen = true;
    private void CloseLeaderboard() => leaderboardOpen = false;

    private void ReturnToForge()
    {
        summary = null;
        activeOffering = null;
        activeRunSeed = null;
        activeAscendant = null;
        runActive = false;
    }

    private async Task LoadFirstHuntAsync()
    {
        try
        {
            var saved = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, FirstHuntKey);
            if (int.TryParse(saved, out var count)) { firstHunt.Restore(count); return; }
            var previousPlaytest = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, "wyrmforge.playtest.v1");
            var previousRuns = false;
            if (!string.IsNullOrEmpty(previousPlaytest))
            {
                using var document = JsonDocument.Parse(previousPlaytest);
                previousRuns = document.RootElement.TryGetProperty("started", out var started) && started.TryGetInt32(out var count) && count > 0;
            }
            if (bestScore > 0 || previousRuns || essenceVault.TotalCount > 0 || spellMastery.UnlockedCount > 0 || forgeProgression.Discovered.Count > 0)
            {
                firstHunt.MigrateExperiencedPlayer();
                selection.RestoreBudget(PassiveTreeCatalog.TotalPoints);
                await PersistFirstHuntAsync();
            }
        }
        catch (JSException) { }
    }

    private async Task PersistFirstHuntAsync()
    {
        try { await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, FirstHuntKey, firstHunt.CompletedRuns.ToString(CultureInfo.InvariantCulture)); }
        catch (JSException) { }
    }

    private async Task LoadArcaneBuildAsync()
    {
        try
        {
            var saved = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, ArcaneBuildKey);
            if (string.IsNullOrWhiteSpace(saved)) return;
            var state = JsonSerializer.Deserialize<ArcaneBuildSave>(saved);
            if (state is null) return;
            selection.RestoreBudget(state.Budget);
            selection.RestoreNodes(state.Nodes ?? []);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task SaveArcaneBuildAsync()
    {
        try
        {
            var state = new ArcaneBuildSave(selection.PointBudget, selection.Selected.ToArray());
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, ArcaneBuildKey, JsonSerializer.Serialize(state));
        }
        catch (JSException) { }
    }

    private sealed record ArcaneBuildSave(int Budget, string[] Nodes);

    private async Task TryRecordPlaytestStartAsync()
    {
        try { await JavaScript.InvokeVoidAsync("wyrmforgePlaytest.startRun", CancellationToken.None, activeAscendant.HasValue); }
        catch (JSException) { /* Playtesting must never prevent starting a run. */ }
    }

    private async Task TryRecordPlaytestFinishAsync(RunSummary run)
    {
        try
        {
            await JavaScript.InvokeVoidAsync("wyrmforgePlaytest.finishRun", CancellationToken.None, new
            {
                outcome = run.Outcome.ToString(), seed = run.Seed, score = run.Score, seconds = run.Seconds,
                depth = run.Depth, level = run.Level, kills = run.Kills, trailsCompleted = run.CompletedRouteNodes,
                rareTrails = run.RareRouteNodes, wyrmsDefeated = run.DragonsSlain, essencesSecured = run.DragonEssences,
                ascendantVictories = run.AscendantDragonIds.Count,
                spellEvolutions = run.SpellLoadout.Where(spell => spell.Evolution.HasValue).Select(spell => spell.Evolution!.Value.ToString()).ToArray(),
            });
        }
        catch (JSException) { /* Diagnostics must never block progression or rewards. */ }
    }

    private async Task<int> TryGetBestScoreAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, BestScoreKey);
            return int.TryParse(storedValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) ? value : 0;
        }
        catch (JSException) { return 0; }
    }

    private async Task TryLoadEssenceVaultAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, EssenceVaultKey);
            if (string.IsNullOrWhiteSpace(storedValue)) return;
            var storedEssences = JsonSerializer.Deserialize<string[]>(storedValue);
            if (storedEssences is null) return;
            var essenceIds = new List<DragonEssenceId>();
            foreach (var storedEssence in storedEssences) if (Enum.TryParse<DragonEssenceId>(storedEssence, out var essenceId)) essenceIds.Add(essenceId);
            essenceVault.Restore(essenceIds);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TryLoadForgeProgressionAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, ForgeProgressionKey);
            if (string.IsNullOrWhiteSpace(storedValue)) return;
            var storedDiscoveries = JsonSerializer.Deserialize<string[]>(storedValue);
            if (storedDiscoveries is null) return;
            var discoveryIds = new List<ForgeDiscoveryId>();
            foreach (var storedDiscovery in storedDiscoveries) if (Enum.TryParse<ForgeDiscoveryId>(storedDiscovery, out var discoveryId)) discoveryIds.Add(discoveryId);
            forgeProgression.Restore(discoveryIds);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TryLoadForgeMasteryAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, ForgeMasteryKey);
            if (string.IsNullOrWhiteSpace(storedValue)) return;
            var storedMasteries = JsonSerializer.Deserialize<string[]>(storedValue);
            if (storedMasteries is null) return;
            var masteryIds = new List<ForgeMasteryId>();
            foreach (var storedMastery in storedMasteries) if (Enum.TryParse<ForgeMasteryId>(storedMastery, out var masteryId)) masteryIds.Add(masteryId);
            forgeProgression.RestoreMasteries(masteryIds);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TryLoadSpellMasteryAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, SpellMasteryKey);
            if (string.IsNullOrWhiteSpace(stored)) return;
            var saved = JsonSerializer.Deserialize<SpellMasteryEntry[]>(stored);
            if (saved is not null) spellMastery.Restore(saved);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TrySetSpellMasteryAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, SpellMasteryKey,
                JsonSerializer.Serialize(spellMastery.Snapshot()));
        }
        catch (JSException) { }
    }

    private async Task TryLoadGreatHuntAsync()
    {
        try
        {
            var stored = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, GreatHuntKey);
            if (string.IsNullOrWhiteSpace(stored)) return;
            var saved = JsonSerializer.Deserialize<GreatHuntEntry[]>(stored);
            if (saved is not null) greatHunt.Restore(saved);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TrySetGreatHuntAsync()
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, GreatHuntKey,
                JsonSerializer.Serialize(greatHunt.Snapshot()));
        }
        catch (JSException) { }
    }

    private async Task TryLoadArcaneCodexAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, ArcaneCodexKey);
            if (string.IsNullOrWhiteSpace(storedValue)) return;
            var storedDiscoveries = JsonSerializer.Deserialize<string[]>(storedValue);
            if (storedDiscoveries is null) return;
            var synergyIds = new List<SynergyId>();
            foreach (var storedDiscovery in storedDiscoveries) if (Enum.TryParse<SynergyId>(storedDiscovery, out var synergyId)) synergyIds.Add(synergyId);
            arcaneCodex.Restore(synergyIds);
        }
        catch (JSException) { }
        catch (JsonException) { }
    }

    private async Task TrySetEssenceVaultAsync()
    {
        try
        {
            var storedEssences = essenceVault.SecuredEssences.Select(essence => essence.ToString()).ToArray();
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, EssenceVaultKey, JsonSerializer.Serialize(storedEssences));
        }
        catch (JSException) { }
    }

    private async Task TrySetForgeProgressionAsync()
    {
        try
        {
            var discoveries = forgeProgression.Discovered.Select(discovery => discovery.ToString()).ToArray();
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, ForgeProgressionKey, JsonSerializer.Serialize(discoveries));
        }
        catch (JSException) { }
    }

    private async Task TrySetForgeMasteryAsync()
    {
        try
        {
            var masteries = forgeProgression.Forged.Select(mastery => mastery.ToString()).ToArray();
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, ForgeMasteryKey, JsonSerializer.Serialize(masteries));
        }
        catch (JSException) { }
    }

    private async Task TrySetArcaneCodexAsync()
    {
        try
        {
            var storedDiscoveries = SynergyCatalog.All.Where(synergy => arcaneCodex.Contains(synergy.Id)).Select(synergy => synergy.Id.ToString()).ToArray();
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, ArcaneCodexKey, JsonSerializer.Serialize(storedDiscoveries));
        }
        catch (JSException) { }
    }

    private async Task TrySetBestScoreAsync(int value)
    {
        try { await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, BestScoreKey, value.ToString(CultureInfo.InvariantCulture)); }
        catch (JSException) { }
    }
}
