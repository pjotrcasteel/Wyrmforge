using Wyrmforge.Application.Runs.Resonance;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private RunResonanceState? resonanceState;

    public IReadOnlyList<RunResonanceEntry> Resonance => resonanceState?.Calculate(build, mapState.CompletedNodes) ?? Array.Empty<RunResonanceEntry>();

    internal void InitializeResonance(IReadOnlySet<string> selectedNodes) => resonanceState = new RunResonanceState(selectedNodes);
}
