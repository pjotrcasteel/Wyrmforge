using Wyrmforge.Application.Runs.Resonance;
using Wyrmforge.Domain.Combat.Dragons;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private readonly DragonAttractionState dragonAttractionState = new();
    private readonly DragonSignState dragonSignState = new();
    private RunResonanceState? resonanceState;
    private DragonId? attractedDragon;

    public IReadOnlyList<RunResonanceEntry> Resonance => resonanceState?.Calculate(build, completedRouteNodes) ?? Array.Empty<RunResonanceEntry>();
    public IReadOnlyList<DragonAttractionEntry> DragonAttraction => dragonAttractionState.Calculate(Resonance);
    public IReadOnlyList<DragonSign> DragonSigns => dragonSignState.Calculate(DragonAttraction, mapState.CompletedNodes.Count, attractedDragon);
    public DragonId? AttractedDragon => attractedDragon;

    internal void InitializeResonance(IReadOnlySet<string> selectedNodes) => resonanceState = new RunResonanceState(selectedNodes);

    private void ResolveDragonAttraction()
    {
        if (attractedDragon is not null) return;
        attractedDragon = dragonAttractionState.Roll(Resonance, randomSource);
        huntRoute = DragonHuntRoute.For(attractedDragon.Value);
    }
}
