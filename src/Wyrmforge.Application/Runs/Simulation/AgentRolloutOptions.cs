namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Explicit per-run opt-in. Absence preserves legacy behavior; no persistent save schema changes.</summary>
public sealed record AgentRolloutOptions(bool Enemies = false, bool AdaptiveAshfang = false);
