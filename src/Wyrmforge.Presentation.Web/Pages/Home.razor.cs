using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Domain.Progression.PassiveTree;

namespace Wyrmforge.Presentation.Web.Pages;

public partial class Home : IAsyncDisposable
{
    private readonly PassiveTreeSelection selection = new();
    private IJSObjectReference? storageModule;
    private RunSummary? summary;
    private int bestScore;
    private int runNumber;
    private bool runActive;

    [Inject]
    public IJSRuntime JavaScript { get; set; } = null!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        storageModule = await JavaScript.InvokeAsync<IJSObjectReference>("import", CancellationToken.None, "./js/storage.js");
        bestScore = await storageModule.InvokeAsync<int>("getBestScore", CancellationToken.None);
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
        if (storageModule is not null) await storageModule.InvokeVoidAsync("setBestScore", CancellationToken.None, bestScore);
    }

    private void ReturnToForge()
    {
        summary = null;
        runActive = false;
    }

    public async ValueTask DisposeAsync()
    {
        if (storageModule is not null) await storageModule.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
