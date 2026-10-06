using System.Diagnostics;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using Wyrmforge.Application.Runs.Checkpoint;
using Wyrmforge.Application.Runs.EndRun;
using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Application.Runs.Navigation;
using Wyrmforge.Application.Runs.Offerings;
using Wyrmforge.Application.Runs.RealmInfluence;
using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Application.Runs.Simulation;
using Wyrmforge.Application.Runs.Simulation.Snapshots;
using Wyrmforge.Domain.Progression.DragonEssences;
using Wyrmforge.Domain.Progression.Relics;

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
    [Parameter] public int? RunSeed { get; set; }
    [Parameter] public EventCallback<RunSummary> OnGameOver { get; set; }

    private IReadOnlyList<LevelChoice> CurrentChoices => simulation?.PendingChoices ?? Array.Empty<LevelChoice>();
    private IReadOnlyList<DragonEssenceDefinition> CurrentEssenceChoices => simulation?.PendingDragonEssenceChoices ?? Array.Empty<DragonEssenceDefinition>();
    private IReadOnlyList<RelicDefinition> CurrentRelicChoices => simulation?.PendingRelicChoices ?? Array.Empty<RelicDefinition>();
    private IReadOnlyList<DragonEssenceDefinition> CurrentEssences => simulation?.SelectedDragonEssences ?? Array.Empty<DragonEssenceDefinition>();
    private IReadOnlyList<RelicDefinition> CurrentRelics => simulation?.EquippedRelics ?? Array.Empty<RelicDefinition>();
    private IReadOnlyList<RelicDefinition> OwnedRelics => simulation?.OwnedRelics ?? Array.Empty<RelicDefinition>();
    private IReadOnlyList<WyrmrealmMapNode> MapNodes => simulation?.MapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<WyrmrealmMapNode> AvailableMapNodes => simulation?.AvailableMapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<WyrmrealmMapNode> CompletedMapNodes => simulation?.CompletedMapNodes ?? Array.Empty<WyrmrealmMapNode>();
    private IReadOnlyList<RunResonanceEntry> CurrentResonance => simulation?.Resonance ?? Array.Empty<RunResonanceEntry>();
    private IReadOnlyList<DragonSign> CurrentDragonSigns => simulation?.DragonSigns ?? Array.Empty<DragonSign>();
    private IReadOnlyList<RealmInfluenceCue> CurrentRealmInfluences => simulation?.RealmInfluences ?? Array.Empty<RealmInfluenceCue>();
    private IReadOnlyList<RunCheckpointActionState> CurrentCheckpointActions => simulation?.CheckpointActions ?? Array.Empty<RunCheckpointActionState>();
    private WyrmrealmMapNode? CurrentMapNode => simulation?.CurrentMapNode;
    private RunOfferingDefinition? CurrentOffering => RunOffering is { } offering ? RunOfferingCatalog.Get(offering) : null;
    private bool PendingMapChoice => simulation?.PendingMapChoice == true;
    private bool AtRefuge => simulation?.AtCheckpoint == true;
    private bool EvacuationActive => simulation?.EvacuationActive == true;
    private bool MapCombatActive => CurrentMapNode?.Type == WyrmrealmNodeType.Combat && !PendingMapChoice;
    private double EvacuationRemainingSeconds => simulation?.EvacuationRemainingSeconds ?? 0;
    private double CurrentHealth => simulation?.Health ?? 0;
    private double CurrentMaxHealth => simulation?.MaxHealth ?? 1;
    private int CurrentMapNodeKills => simulation?.CurrentMapNodeKills ?? 0;
    private int CurrentMapNodeKillsRequired => simulation?.CurrentMapNodeKillsRequired ?? WyrmrealmMapState.KillsPerCombatNode;
    private int CurrentDepth => simulation?.Depth ?? 1;
    private int CheckpointVisit => simulation?.CheckpointVisit ?? 0;
    private int RelicSlots => simulation?.RelicSlots ?? 0;
    private double CurrentScoreMultiplier => simulation?.ScoreMultiplier ?? 1;
    private int CurrentLevel => simulation?.Level ?? 1;

    protected override void OnInitialized() => simulation = SimulationFactory.Create(new HashSet<string>(SelectedNodes), RunOffering, RunSeed);

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (!firstRender) return;
        arenaModule = await JavaScript.InvokeAsync<IJSObjectReference>("import", CancellationToken.None, "./js/arena-performance.js");
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
        var hadRelicChoices = current.PendingRelicChoices.Count > 0;
        var wasAtCheckpoint = current.AtCheckpoint;
        var hadMapChoice = current.PendingMapChoice;
        var previousMapCompleted = current.CompletedMapNodes.Count;
        var previousMapKills = current.CurrentMapNodeKills;
        var previousEvacuation = current.EvacuationActive;
        var previousEvacuationSecond = (int)Math.Ceiling(current.EvacuationRemainingSeconds);
        var snapshot = current.Tick(delta, new MovementInput(movementX, movementY), width, height);
        var simulationMilliseconds = Stopwatch.GetElapsedTime(frameStarted).TotalMilliseconds;
        var stateChanged = hadChoices != current.PendingChoices.Count > 0
            || hadEssenceChoices != current.PendingDragonEssenceChoices.Count > 0
            || hadRelicChoices != current.PendingRelicChoices.Count > 0
            || wasAtCheckpoint != current.AtCheckpoint
            || hadMapChoice != current.PendingMapChoice
            || previousMapCompleted != current.CompletedMapNodes.Count
            || previousMapKills != current.CurrentMapNodeKills
            || previousEvacuation != current.EvacuationActive
            || current.EvacuationActive && previousEvacuationSecond != (int)Math.Ceiling(current.EvacuationRemainingSeconds);
        if (stateChanged) await InvokeAsync(StateHasChanged);

        if (snapshot.Ended && !gameOverSent)
        {
            gameOverSent = true;
            await OnGameOver.InvokeAsync(current.CreateEvaluationSummary());
        }
        return snapshot with { SimulationMilliseconds = simulationMilliseconds };
    }

    private async Task ChooseAsync(string id) { if (simulation?.ApplyChoice(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task ChooseEssenceAsync(DragonEssenceId id) { if (simulation?.ApplyDragonEssence(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task ChooseRelicAsync(RelicId id) { if (simulation?.ApplyRelicChoice(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task ChooseMapNodeAsync(string id) { if (simulation?.ChooseMapNode(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task UseCheckpointActionAsync(RunCheckpointActionId id) { if (simulation?.UseCheckpointAction(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task EquipRelicAsync(RelicId id) { if (simulation?.EquipRelic(id) == true) await InvokeAsync(StateHasChanged); }
    private async Task UnequipRelicAsync(RelicId id) { if (simulation?.UnequipRelic(id) == true) await InvokeAsync(StateHasChanged); }

    private async Task AbandonRunAsync()
    {
        if (simulation is null || gameOverSent) return;
        gameOverSent = true;
        simulation.AbandonRun();
        await OnGameOver.InvokeAsync(simulation.CreateEvaluationSummary());
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