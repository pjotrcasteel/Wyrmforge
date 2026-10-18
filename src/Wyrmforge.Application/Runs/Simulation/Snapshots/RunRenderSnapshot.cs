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
    DragonHuntRenderSnapshot? Hunt = null,
    IReadOnlyList<DragonHuntHazardRenderSnapshot>? HuntHazards = null,
    double SimulationMilliseconds = 0,
    IReadOnlyList<ExperienceShardRenderSnapshot>? ExperienceShards = null,
    IReadOnlyList<ExperiencePickupRenderSnapshot>? ExperiencePickups = null)
{
    public SplashPulseRenderSnapshot? PowerBurst { get; init; }
    public TrailRenderSnapshot? Trail { get; init; }
    public ArenaEnvironmentRenderSnapshot? Environment { get; init; }
    public ArenaExitRenderSnapshot? Exit { get; init; }
    public ArenaWorldRenderSnapshot? World { get; init; }
    public CastMotionRenderSnapshot? CastMotion { get; init; }
    public IReadOnlyList<HostileProjectileRenderSnapshot> HostileProjectiles { get; init; } = [];

    /// <summary>Fallen Ashlings an Ash Priest can still raise; Life runs 1→0 until the remains crumble.</summary>
    public IReadOnlyList<AshRemainsRenderSnapshot> AshRemains { get; init; } = [];

    public IReadOnlyList<WraithRippleRenderSnapshot> WraithRipples { get; init; } = [];

    public ReliquaryRenderSnapshot? Reliquary { get; init; }

    public IReadOnlyList<ReliquaryFieldRenderSnapshot> ReliquaryFields { get; init; } = [];

    public BellWardenRenderSnapshot? BellWarden { get; init; }

    public IReadOnlyList<BellShockwaveRenderSnapshot> BellShockwaves { get; init; } = [];

    public WardPulseRenderSnapshot? WardPulse { get; init; }

    public IReadOnlyList<IceLanceRenderSnapshot> IceLances { get; init; } = [];

    public IReadOnlyList<SplinterBloomRenderSnapshot> SplinterBlooms { get; init; } = [];

    public IReadOnlyList<BlackIceRenderSnapshot> BlackIce { get; init; } = [];
}
