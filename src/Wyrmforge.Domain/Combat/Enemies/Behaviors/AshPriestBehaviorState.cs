using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum AshPriestPhase
{
    Shepherd,
    Heal,
    Revive,
    Recover,
}

public enum AshPriestEvent
{
    None,
    HealStarted,
    ReviveStarted,
    HealCompleted,
    ReviveCompleted,
    Interrupted,
}

/// <summary>
/// Ash Priest support contract (encounter brief §3): stay behind the pack, heal one wounded ally with a 0.9s cast, or raise
/// nearby fallen Ashlings with a 1.5s ritual. Both casts lock their target at cast start, are visible for their whole length,
/// and break on a real burst (20% of the priest's health) - the Diablo shaman lesson: the healer is the priority target, and
/// reaching it is rewarded. The encounter, not the priest, owns the revive budget so no squad can raise more than two.
/// </summary>
public sealed class AshPriestBehaviorState(int seed = 0)
{
    public const double InitialCooldownSeconds = 2.5;
    public const double HealCastSeconds = 0.9;
    public const double ReviveCastSeconds = 1.5;
    public const double RecoverSeconds = 0.7;
    public const double MinimumHealCooldownSeconds = 9;
    public const double HealCooldownSpreadSeconds = 4;
    public const double ReviveCooldownSeconds = 12;
    public const double HealRange = 230;
    public const double ReviveRange = 200;
    public const double HealFraction = 0.45;
    public const double WoundedFraction = 0.7;
    public const double InterruptHealthFraction = 0.2;
    public const double MinimumRange = 230;
    public const double MaximumRange = 340;
    public const double RevivedHealthFraction = 0.5;

    public AshPriestPhase Phase { get; private set; } = AshPriestPhase.Shepherd;

    public double PhaseRemaining { get; private set; }

    public double HealCooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public double ReviveCooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public int HealTargetId { get; private set; } = -1;

    public Vector2D CastPoint { get; private set; } = Vector2D.Zero;

    public int CastsCompleted { get; private set; }

    private double castHealth;

    // 9-13s, deterministic per priest and per cast so two priests never pulse in lockstep.
    public double NextHealCooldown => MinimumHealCooldownSeconds + (((seed * 7) + (CastsCompleted * 3)) % 5) * (HealCooldownSpreadSeconds / 4);

    public bool IsCasting => Phase is AshPriestPhase.Heal or AshPriestPhase.Revive;

    public double CastProgress => Phase switch
    {
        AshPriestPhase.Heal => Math.Clamp(1 - PhaseRemaining / HealCastSeconds, 0, 1),
        AshPriestPhase.Revive => Math.Clamp(1 - PhaseRemaining / ReviveCastSeconds, 0, 1),
        _ => 0,
    };

    /// <summary>
    /// Advances the priest. <paramref name="healTarget"/> is the most wounded ally in range (or null) and
    /// <paramref name="reviveSite"/> the nearest eligible remains while the encounter still has revive budget (or null).
    /// Revival takes precedence: it is the encounter-changing play the brief wants legible.
    /// </summary>
    public AshPriestEvent Tick(double delta, double health, double maxHealth, (int Id, Vector2D Position)? healTarget, Vector2D? reviveSite)
    {
        if (IsCasting)
        {
            if (castHealth - health >= maxHealth * InterruptHealthFraction)
            {
                if (Phase == AshPriestPhase.Heal) HealCooldownRemaining = NextHealCooldown * 0.5;
                else ReviveCooldownRemaining = ReviveCooldownSeconds * 0.5;
                Enter(AshPriestPhase.Recover, RecoverSeconds);
                return AshPriestEvent.Interrupted;
            }
            PhaseRemaining -= delta;
            if (PhaseRemaining > 0) return AshPriestEvent.None;
            var completed = Phase == AshPriestPhase.Heal ? AshPriestEvent.HealCompleted : AshPriestEvent.ReviveCompleted;
            if (Phase == AshPriestPhase.Heal) HealCooldownRemaining = NextHealCooldown;
            CastsCompleted++;
            Enter(AshPriestPhase.Recover, RecoverSeconds);
            return completed;
        }
        if (Phase == AshPriestPhase.Recover)
        {
            PhaseRemaining -= delta;
            if (PhaseRemaining <= 0) Enter(AshPriestPhase.Shepherd, 0);
            return AshPriestEvent.None;
        }

        HealCooldownRemaining = Math.Max(0, HealCooldownRemaining - delta);
        ReviveCooldownRemaining = Math.Max(0, ReviveCooldownRemaining - delta);
        if (ReviveCooldownRemaining <= 0 && reviveSite is { } site)
        {
            CastPoint = site;
            castHealth = health;
            ReviveCooldownRemaining = ReviveCooldownSeconds;
            Enter(AshPriestPhase.Revive, ReviveCastSeconds);
            return AshPriestEvent.ReviveStarted;
        }
        if (HealCooldownRemaining <= 0 && healTarget is { } ally)
        {
            HealTargetId = ally.Id;
            CastPoint = ally.Position;
            castHealth = health;
            HealCooldownRemaining = NextHealCooldown;
            Enter(AshPriestPhase.Heal, HealCastSeconds);
            return AshPriestEvent.HealStarted;
        }
        return AshPriestEvent.None;
    }

    /// <summary>Keeps to the back line: retreat when the hunter closes, drift back toward the pack otherwise.</summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D hunter, Vector2D? packCenter)
    {
        if (Phase != AshPriestPhase.Shepherd) return (Vector2D.Zero, 0);
        var distance = Vector2D.Distance(position, hunter);
        var toward = Vector2D.DirectionTo(position, hunter);
        if (distance < MinimumRange) return (toward * -1, 1);
        if (distance > MaximumRange) return (toward, 0.9);
        if (packCenter is { } pack)
        {
            // Stand behind the pack's centre, on the far side from the hunter.
            var behind = pack + Vector2D.DirectionTo(hunter, pack) * 60;
            if (Vector2D.Distance(position, behind) > 24) return (Vector2D.DirectionTo(position, behind), 0.7);
        }
        return (Vector2D.Zero, 0);
    }

    private void Enter(AshPriestPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
