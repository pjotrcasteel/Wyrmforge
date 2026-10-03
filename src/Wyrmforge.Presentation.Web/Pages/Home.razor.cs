using System.Globalization;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home
{
    private const string BestScoreKey = "wyrmforge.bestScore";
    private readonly PassiveTreeSelection selection = new();
    private RunSummary? summary;
    private int bestScore;
    private int runNumber;
    private bool runActive;

    [Inject]
    public IJSRuntime JavaScript { get; set; } = null!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;

        bestScore = await TryGetBestScoreAsync();
        StateHasChanged();
    }

    private void StartRun()
    {
        summary = null;
        runNumber++;
        runActive = true;
    }

    private async Task HandleGameOverAsync(RunSummary value)
    {
        summary = value;
        if (value.Score <= bestScore) return;

        bestScore = value.Score;
        await TrySetBestScoreAsync(bestScore);
    }

    private void ReturnToForge()
    {
        summary = null;
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
