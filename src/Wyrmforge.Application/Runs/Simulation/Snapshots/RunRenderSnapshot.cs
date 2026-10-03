namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record RunRenderSnapshot(
    PlayerRenderSnapshot Player,
    IReadOnlyList<EnemyRenderSnapshot> Enemies,
    DragonRenderSnapshot? Dragon,
    DragonBreathRenderSnapshot? DragonBreath,
    IReadOnlyList<ProjectileRenderSnapshot> Projectiles,
    IReadOnlyList<LightningRenderSnapshot> Lightning,
    RunHudSnapshot Hud,
    bool Paused,
    bool Ended);
