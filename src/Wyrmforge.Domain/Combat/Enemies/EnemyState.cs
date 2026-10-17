using Wyrmforge.Domain.Combat.Geometry;
using Wyrmforge.Domain.Combat.Statuses;
using Wyrmforge.Domain.Combat.Targets;

namespace Wyrmforge.Domain.Combat.Enemies;

public sealed class EnemyState(int id, Vector2D position, double radius, double health, double speed, EnemyKind kind = EnemyKind.Hollow) : ICombatTarget
{
    public int Id { get; } = id;

    public Vector2D Position { get; set; } = position;

    public double Radius { get; } = radius;

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
        }
    }

    private readonly EliteAffix elite;

    public bool IsElite => elite != EliteAffix.None;

    /// <summary>Raised by an Ash Priest: already paid out its experience once, so its second death drops none.</summary>
    public bool Revived { get; init; }

    /// <summary>Morale break after the pack's priest falls: the enemy flees for a bounded time, then re-engages.</summary>
    public double RoutedRemaining { get; set; }

    public CombatStatusCollection Statuses { get; } = new();
}
