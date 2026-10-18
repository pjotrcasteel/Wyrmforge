using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Domain.Combat.Enemies;

public sealed class EnemyState(int id, Vector2D position, double radius, double health, double speed, EnemyKind kind = EnemyKind.Hollow) : ICombatTarget
{
    public int Id { get; } = id;

    public Vector2D Position { get; set; } = position;

    /// <summary>
    /// Elites stand a head taller than their kin (Diablo's champions): the body, and so the drawn sprite, grows by
    /// <see cref="EliteSizeScale"/>. Hit area and silhouette always match.
    /// </summary>
    public const double EliteSizeScale = 1.25;

    public double Radius => IsElite ? radius * EliteSizeScale : radius;

    public double Health { get; set; } = health;

    public double MaxHealth { get; } = health;

    public double Speed { get; } = speed;

    public EnemyKind Kind { get; } = kind;

    // Odd and even ids circle or strafe to opposite sides, so a pair of hounds or slingers pinches rather than stacks.
    public MireHoundBehaviorState? MireHound { get; } = kind == EnemyKind.MireHound ? new MireHoundBehaviorState(id % 2 == 0 ? 1 : -1) : null;

    public AshSlingerBehaviorState? AshSlinger { get; } = kind == EnemyKind.AshSlinger ? new AshSlingerBehaviorState(id % 2 == 0 ? 1 : -1) : null;

    public AshPriestBehaviorState? AshPriest { get; } = kind == EnemyKind.AshPriest ? new AshPriestBehaviorState(id) : null;

    public DrownedWraithBehaviorState? DrownedWraith { get; } = kind == EnemyKind.DrownedWraith ? new DrownedWraithBehaviorState(id) : null;

    public ReliquaryBehaviorState? Reliquary { get; } = kind == EnemyKind.Reliquary ? new ReliquaryBehaviorState() : null;

    public BellWardenBehaviorState? BellWarden { get; } = kind == EnemyKind.BellWarden ? new BellWardenBehaviorState() : null;

    public ReliquaryWardState? Ward { get; } = kind == EnemyKind.ReliquaryWard ? new ReliquaryWardState() : null;

    public FrostlingPacklingBehaviorState? Packling { get; } = kind == EnemyKind.FrostlingPackling ? new FrostlingPacklingBehaviorState(id) : null;

    public ShardcasterBehaviorState? Shardcaster { get; } = kind == EnemyKind.Shardcaster ? new ShardcasterBehaviorState(id % 2 == 0 ? 1 : -1) : null;

    public WhitefangStalkerBehaviorState? Whitefang { get; } = kind == EnemyKind.WhitefangStalker ? new WhitefangStalkerBehaviorState(id % 2 == 0 ? 1 : -1) : null;

    public CairnSentinelBehaviorState? Sentinel { get; } = kind == EnemyKind.CairnSentinel ? new CairnSentinelBehaviorState() : null;

    public HoarfrostCantorBehaviorState? Cantor { get; } = kind == EnemyKind.HoarfrostCantor ? new HoarfrostCantorBehaviorState() : null;

    public MirrorWispBehaviorState? Wisp { get; } = kind == EnemyKind.MirrorWisp ? new MirrorWispBehaviorState(id % 2 == 0 ? 1 : -1) : null;

    public MirrorDoubleState? Reflection { get; } = kind == EnemyKind.MirrorDouble ? new MirrorDoubleState() : null;

    public PenitentBehaviorState? Penitent { get; } = kind == EnemyKind.Penitent ? new PenitentBehaviorState(new Vector2D(1, 0)) : null;

    /// <summary>Roster step 5 elite power; <see cref="EliteAffix.None"/> for an ordinary enemy.</summary>
    public EliteAffix Elite
    {
        get => elite;
        init
        {
            elite = value;
            if (MireHound is { } hound) hound.Thornrunner = value == EliteAffix.Thornrunner;
            if (Penitent is { } penitent) penitent.Oathshield = value == EliteAffix.Oathshield;
            if (Whitefang is { } stalker) stalker.Twinleap = value == EliteAffix.Twinfang;
        }
    }

    private readonly EliteAffix elite;

    public bool IsElite => elite != EliteAffix.None;

    /// <summary>Raised by an Ash Priest: already paid out its experience once, so its second death drops none.</summary>
    public bool Revived { get; init; }

    /// <summary>Hoarfrost Cantor's Rime Hymn: frost armour that soaks damage before health. Zero when bare.</summary>
    public double RimeArmor { get; set; }

    public double RimeArmorRemaining { get; set; }

    /// <summary>Morale break after the pack's priest falls: the enemy flees for a bounded time, then re-engages.</summary>
    public double RoutedRemaining { get; set; }

    public CombatStatusCollection Statuses { get; } = new();
}
