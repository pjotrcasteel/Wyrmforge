using System.Diagnostics;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Application.Runs.Resonance;
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

    [Inject] public RunSimulationFactory SimulationFactory { get; set; } = null!;
    [Inject] public IJSRuntime JavaScript { get; set; } = null!;
    [Parameter, EditorRequired] public IReadOnlySet<string> SelectedNodes { get; set; } = new HashSet<string>();
    [Parameter] public DragonEssenceId? RunOffering { get; set; }
    [Parameter] public EventCallback<RunSummary> OnGameOver { get; set; }

    private IReadOnlyList<LevelChoice> CurrentChoices => simulation?.PendingChoices ?? Array.Empty<LevelChoice>();
    private IReadOnlyList<DragonEssenceDefinition> CurrentEssenceChoices => simulation?.PendingDragonEssenceChoices ?? Array.Empty<DragonEssenceDefinition>();
    private IReadOnlyList<DragonEssenceDefinition> CurrentEssences => simulation?.SelectedDragonEssences ?? Array.Empty<DragonEssenceDefinition>();
    private IReadOnlyList<WyrmrealmMapNode> MapNodes => simulation?.MapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<WyrmrealmMapNode> AvailableMapNodes => simulation?.AvailableMapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<WyrmrealmMapNode> CompletedMapNodes => simulation?.CompletedMapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<RunResonanceEntry> CurrentResonance => simulation?.Resonance ?? Array.Empty<RunResonanceEntry>();
    private IReadOnlyList<DragonSign> CurrentDragonSigns => simulation?.DragonSigns ?? Array.Empty<DragonSign>();
    private WyrmrealmMapNode? CurrentMapNode => simulation?.CurrentMapNode;
    private RunOfferingDefinition? CurrentOffering => RunOffering is { } offering ? RunOfferingCatalog.Get(offering) : null;
    private bool PendingMapChoice => simulation?.PendingMapChoice == true;
    private bool PendingCheckpointDecision => simulation?.PendingCheckpointDecision == true;
    private bool CanPushDeeper => simulation?.CanPushDeeper == true;
    private bool DepthTrialActive => simulation?.DepthTrialActive == true;
    private bool EvacuationActive => simulation?.EvacuationActive == true;
    private bool MapCombatActive => CurrentMapNode?.Type == WyrmrealmNodeType.Combat && !PendingMapChoice;
    private double EvacuationRemainingSeconds => simulation?.EvacuationRemainingSeconds ?? 0;
    private int CurrentMapNodeKills => simulation?.CurrentMapNodeKills ?? 0;
    private int CurrentMapNodeKillsRequired => simulation?.CurrentMapNodeKillsRequired ?? WyrmrealmMapState.KillsPerCombatNode;
    private int DepthTrialKills => simulation?.DepthTrialKills ?? 0;
    private int DepthTrialKillsRequired => simulation?.DepthTrialKillsRequired ?? 0;
    private int CurrentDepth => simulation?.Depth ?? 1;
    private double CurrentScoreMultiplier => simulation?.ScoreMultiplier ?? 1;
    private int CurrentLevel => simulation?.Level ?? 1;

    protected override void OnInitialized()
    {
        simulation = SimulationFactory.Create(new HashSet<string>(SelectedNodes), RunOffering);
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
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
        var hadDepthDecision = current.PendingCheckpointDecision;
        var hadMapChoice = current.PendingMapChoice;
        var previousMapCompleted = current.CompletedMapNodes.Count;
        var previousMapKills = current.CurrentMapNodeKills;
        var previousTrialKills = current.DepthTrialKills;
        var previousEvacuation = current.EvacuationActive;
        var previousEvacuationSecond = (int)Math.Ceiling(current.EvacuationRemainingSeconds);
        var snapshot = current.Tick(delta, new MovementInput(movementX, movementY), width, height);
        var simulationMilliseconds = Stopwatch.GetElapsedTime(frameStarted).TotalMilliseconds;
        var stateChanged = hadChoices != current.PendingChoices.Count > 0
            || hadEssenceChoices != current.PendingDragonEssenceChoices.Count > 0
            || hadDepthDecision != current.PendingCheckpointDecision
            || hadMapChoice != current.PendingMapChoice
            || previousMapCompleted != current.CompletedMapNodes.Count
            || previousMapKills != current.CurrentMapNodeKills
            || previousTrialKills != current.DepthTrialKills
            || previousEvacuation != current.EvacuationActive
            || current.EvacuationActive && previousEvacuationSecond != (int)Math.Ceiling(current.EvacuationRemainingSeconds);
        if (stateChanged) await InvokeAsync(StateHasChanged);

        if (snapshot.Ended && !gameOverSent)
        {
            gameOverSent = true;
            await OnGameOver.InvokeAsync(current.CreateSummary());
        }
        return snapshot with { SimulationMilliseconds = simulationMilliseconds };
    }

    private async Task ChooseAsync(string id) { if (simulation?.ApplyChoice(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task ChooseEssenceAsync(DragonEssenceId id) { if (simulation?.ApplyDragonEssence(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task ChooseMapNodeAsync(string id) { if (simulation?.ChooseMapNode(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task PushDeeperAsync() { if (simulation?.PushDeeper() == true) await InvokeAsync(StateHasChanged); }
    private async Task LeaveRealmAsync() { if (simulation?.LeaveRealm() == true) await InvokeAsync(StateHasChanged); }

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
