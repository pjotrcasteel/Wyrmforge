namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record SpellHudSnapshot(string Icon, string Name, int Rank, string? EvolutionIcon = null, string? EvolutionName = null);
