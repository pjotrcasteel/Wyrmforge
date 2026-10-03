using System.Diagnostics;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Progression.DragonEssences;

namespace Wyrmforge.Presentation.Web.Features.Arena;

public partial class ArenaView : IAsyncDisposable
{
    private ElementReference canvas;
    private RunSimulation? simulation;
    private IJSObjectReference? arenaModule;
    private DotNetObjectReference<ArenaView>? dotNetReference;
    private bool gameOverSent;

    [Inject]
    public RunSimulationFactory SimulationFactory { get; set; } = null!;

    [Inject]
    public IJSRuntime JavaScript { get; set; } = null!;

    [Parameter, EditorRequired]
    public IReadOnlySet<string> SelectedNodes { get; set; } = new HashSet<string>();

    [Parameter]
    public DragonEssenceId? RunOffering { get; set; }

    [Parameter]
    public EventCallback<RunSummary> OnGameOver { get; set; }

    private IReadOnlyList<LevelChoice> CurrentChoices => simulation?.PendingChoices ?? Array.Empty<LevelChoice>();

    private IReadOnlyList<DragonEssenceDefinition> CurrentEssenceChoices => simulation?.PendingDragonEssenceChoices ?? Array.Empty<DragonEssenceDefinition>();

    private IReadOnlyList<DragonEssenceDefinition> CurrentEssences => simulation?.SelectedDragonEssences ?? Array.Empty<DragonEssenceDefinition>();

    private RunOfferingDefinition? CurrentOffering => RunOffering is { } offering ? RunOfferingCatalog.Get(offering) : null;

    private bool PendingPushOrExtract => simulation?.PendingPushOrExtract == true;

    private bool CanPushDeeper => simulation?.CanPushDeeper == true;

    private bool DepthTrialActive => simulation?.DepthTrialActive == true;

    private int DepthTrialKills => simulation?.DepthTrialKills ?? 0;

    private int DepthTrialKillsRequired => simulation?.DepthTrialKillsRequired ?? 0;

    private int CurrentDepth => simulation?.Depth ?? 1;

    private double CurrentScoreMultiplier => simulation?.ScoreMultiplier ?? 1;

    private int CurrentLevel => simulation?.Level ?? 1;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        simulation = SimulationFactory.Create(new HashSet<string>(SelectedNodes), RunOffering);
        arenaModule = await JavaScript.InvokeAsync<IJSObjectReference>("import", CancellationToken.None, "./js/arena.js");
        dotNetReference = DotNetObjectReference.Create(this);
        await arenaModule.InvokeVoidAsync("initializeArena", CancellationToken.None, canvas, dotNetReference);
    }

    [JSInvokable]
    public async Task<RunRenderSnapshot> Frame(double delta, double width, double height, double movementX, double movementY)
    {
        var frameStarted = Stopwatch.GetTimestamp();
        var current = simulation ?? throw new InvalidOperationException("Arena simulation has not been initialized.");
        var hadChoices = current.PendingChoices.Count > 0;
        var hadEssenceChoices = current.PendingDragonEssenceChoices.Count > 0;
        var hadDepthDecision = current.PendingPushOrExtract;
        var previousTrialKills = current.DepthTrialKills;
        var snapshot = current.Tick(delta, new MovementInput(movementX, movementY), width, height);
        var simulationMilliseconds = Stopwatch.GetElapsedTime(frameStarted).TotalMilliseconds;
        var hasChoices = current.PendingChoices.Count > 0;
        var hasEssenceChoices = current.PendingDragonEssenceChoices.Count > 0;
        var hasDepthDecision = current.PendingPushOrExtract;
        if (hadChoices != hasChoices || hadEssenceChoices != hasEssenceChoices || hadDepthDecision != hasDepthDecision || previousTrialKills != current.DepthTrialKills)
        {
            await InvokeAsync(StateHasChanged);
        }

        if (snapshot.Ended && !gameOverSent)
        {
            gameOverSent = true;
            await OnGameOver.InvokeAsync(current.CreateSummary());
        }

        return snapshot with { SimulationMilliseconds = simulationMilliseconds };
    }

    private async Task ChooseAsync(string id)
    {
        if (simulation?.ApplyChoice(id) == true) await InvokeAsync(StateHasChanged);
    }

    private async Task ChooseEssenceAsync(DragonEssenceId id)
    {
        if (simulation?.ApplyDragonEssence(id) == true) await InvokeAsync(StateHasChanged);
    }

    private async Task PushDeeperAsync()
    {
        if (simulation?.PushDeeper() == true) await InvokeAsync(StateHasChanged);
    }

    private async Task StartExtractionAsync()
    {
        if (simulation?.StartExtraction() == true) await InvokeAsync(StateHasChanged);
    }

    private async Task AbandonRunAsync()
    {
        if (simulation is null || gameOverSent) return;
        gameOverSent = true;
        await OnGameOver.InvokeAsync(simulation.AbandonRun());
    }

    public async ValueTask DisposeAsync()
    {
        if (arenaModule is not null)
        {
            await arenaModule.InvokeVoidAsync("disposeArena", CancellationToken.None, canvas);
            await arenaModule.DisposeAsync();
        }
        dotNetReference?.Dispose();
        GC.SuppressFinalize(this);
    }
}
