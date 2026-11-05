namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    /// <summary>Debug and automation only (opt-in by URL in the web client): refill the hunter's health without touching any other rule.</summary>
    public void DebugRestoreHealth() => player.Health = player.MaxHealth;
}
