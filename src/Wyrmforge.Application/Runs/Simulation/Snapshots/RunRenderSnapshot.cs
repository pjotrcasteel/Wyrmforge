namespace Wyrmforge.Application.Runs.Simulation.Snapshots;

public sealed record RunRenderSnapshot(
    PlayerRenderSnapshot Player,
    ExtractionRenderSnapshot? Extraction,
    IReadOnlyList<EnemyRenderSnapshot> Enemies,
    DragonRenderSnapshot? Dragon,
    DragonBreathRenderSnapshot? DragonBreath,
    IReadOnlyList<SplashPulseRenderSnapshot> SplashPulses,
    IReadOnlyList<ElementalImpactRenderSnapshot> ElementalImpacts,
    IReadOnlyList<DeathBurstRenderSnapshot> DeathBursts,
    IReadOnlyList<EssenceBurstRenderSnapshot> EssenceBursts,
    IReadOnlyList<EssenceBoltRenderSnapshot> EssenceBolts,
    IReadOnlyList<ProjectileRenderSnapshot> Projectiles,
    IReadOnlyList<LightningRenderSnapshot> Lightning,
    RunHudSnapshot Hud,
    bool Paused,
    bool Ended,
    double SimulationMilliseconds = 0);
