using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string BestScoreKey = "wyrmforge.bestScore";
    private const string EssenceVaultKey = "wyrmforge.essenceVault";
    private readonly PassiveTreeSelection selection = new();
    private readonly DragonEssenceVault essenceVault = new();
    private RunSummary? summary;
    private DragonEssenceId? selectedOffering;
    private DragonEssenceId? activeOffering;
    private int bestScore;
    private int runNumber;
    private bool runActive;

    [Inject]
    public IJSRuntime JavaScript { get; set; } = null!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;

        bestScore = await TryGetBestScoreAsync();
        await TryLoadEssenceVaultAsync();
        StateHasChanged();
    }

    private void SelectOffering(DragonEssenceId id) => selectedOffering = selectedOffering == id ? null : id;

    private async Task StartRunAsync()
    {
        summary = null;
        activeOffering = null;
        if (selectedOffering is { } offering && essenceVault.Consume(offering))
        {
            activeOffering = offering;
            await TrySetEssenceVaultAsync();
        }
        selectedOffering = null;
        runNumber++;
        runActive = true;
    }

    private async Task HandleGameOverAsync(RunSummary value)
    {
        summary = value;
        if (value.Outcome == RunOutcome.Extracted && value.EssenceIds.Count > 0)
        {
            foreach (var essenceId in value.EssenceIds) essenceVault.Store(essenceId);
            await TrySetEssenceVaultAsync();
        }

        if (value.Score <= bestScore) return;
        bestScore = value.Score;
        await TrySetBestScoreAsync(bestScore);
    }

    private void ReturnToForge()
    {
        summary = null;
        activeOffering = null;
        runActive = false;
    }

    private async Task<int> TryGetBestScoreAsync()
    {
        try
        {
            var storedValue = await JavaScript.InvokeAsync<string?>("localStorage.getItem", CancellationToken.None, BestScoreKey);
            return int.TryParse(storedValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) ? value : 0;
        }
        catch (JSException)
        {
            return 0;
        }
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
            foreach (var storedEssence in storedEssences)
            {
                if (Enum.TryParse<DragonEssenceId>(storedEssence, out var essenceId)) essenceIds.Add(essenceId);
            }
            essenceVault.Restore(essenceIds);
        }
        catch (JSException)
        {
            // Vault persistence is optional. Browser restrictions must never break gameplay.
        }
        catch (JsonException)
        {
            // Invalid old browser data is ignored rather than preventing the game from starting.
        }
    }

    private async Task TrySetEssenceVaultAsync()
    {
        try
        {
            var storedEssences = essenceVault.SecuredEssences.Select(essence => essence.ToString()).ToArray();
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, EssenceVaultKey, JsonSerializer.Serialize(storedEssences));
        }
        catch (JSException)
        {
            // Vault persistence is optional. Browser restrictions must never break gameplay.
        }
    }

    private async Task TrySetBestScoreAsync(int value)
    {
        try
        {
            await JavaScript.InvokeVoidAsync("localStorage.setItem", CancellationToken.None, BestScoreKey, value.ToString(CultureInfo.InvariantCulture));
        }
        catch (JSException)
        {
            // Score persistence is optional. Browser restrictions must never break gameplay.
        }
    }
}
