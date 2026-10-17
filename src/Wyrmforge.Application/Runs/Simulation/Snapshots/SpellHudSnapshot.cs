namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record SpellHudSnapshot(string Icon, string Name, int Rank, string? EvolutionIcon = null, string? EvolutionName = null)
{
    public bool IsActive { get; init; } = true;

    /// <summary>A contextual auto-cast beside the primary: it has no rank and fires only when its trigger is met.</summary>
    public bool Contextual { get; init; }
}
