using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum AshSlingerPhase
{
    Reposition,
    Windup,
    Recover,
}

public enum AshSlingerEvent
{
    None,
    WindupStarted,
    Released,
    Interrupted,
}

/// <summary>
/// Ash Slinger ember lob (encounter brief §3): hold a back-line distance, swing for 0.65s while the landing spot is already
/// marked on the ground, release one slow arcing ember, then stand briefly exposed. The landing spot is locked at windup,
/// like Enter the Gungeon's grenade kin, so moving is always the answer; bursting the slinger mid-swing interrupts it.
/// </summary>
public sealed class AshSlingerBehaviorState(int strafeSign = 1)
{
    public const double InitialCooldownSeconds = 2.2;
    public const double WindupSeconds = 0.65;
    public const double RecoverSeconds = 0.5;
    public const double CooldownSeconds = 3.6;
    public const double MinimumRange = 175;
    public const double MaximumRange = 330;
    public const double ThrowRange = 360;
    public const double InterruptHealthFraction = 0.3;
    public const double FlightSeconds = 0.6;
    public const double ImpactRadius = 34;
    public const double Damage = 14;
    public const double ArcHeight = 46;

    public int StrafeSign { get; } = strafeSign >= 0 ? 1 : -1;

    public AshSlingerPhase Phase { get; private set; } = AshSlingerPhase.Reposition;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D Target { get; private set; } = Vector2D.Zero;

    private double windupHealth;

    public bool IsCommitted => Phase == AshSlingerPhase.Windup;

    public double WindupProgress => Phase == AshSlingerPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    public AshSlingerEvent Tick(double delta, Vector2D position, Vector2D target, double health, double maxHealth, bool mayCommit = true)
    {
        switch (Phase)
        {
            case AshSlingerPhase.Windup:
                if (windupHealth - health >= maxHealth * InterruptHealthFraction)
                {
                    // A real burst staggers the swing: the ember is dropped and the slinger is briefly open.
                    CooldownRemaining = CooldownSeconds * 0.5;
                    Enter(AshSlingerPhase.Recover, RecoverSeconds);
                    return AshSlingerEvent.Interrupted;
                }
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return AshSlingerEvent.None;
                Enter(AshSlingerPhase.Recover, RecoverSeconds);
                return AshSlingerEvent.Released;
            case AshSlingerPhase.Recover:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(AshSlingerPhase.Reposition, 0);
                return AshSlingerEvent.None;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > ThrowRange) return AshSlingerEvent.None;
        Target = target;
        windupHealth = health;
        CooldownRemaining = CooldownSeconds;
        Enter(AshSlingerPhase.Windup, WindupSeconds);
        return AshSlingerEvent.WindupStarted;
    }

    /// <summary>
    /// Movement intent while repositioning: back-pedal when crowded, close in when out of range, otherwise strafe sideways.
    /// Returns a direction and a speed multiplier; the slinger never advances into the hunter's face.
    /// </summary>
    public (Vector2D Direction, double SpeedMultiplier) Movement(Vector2D position, Vector2D target)
    {
        if (Phase != AshSlingerPhase.Reposition) return (Vector2D.Zero, 0);
        var distance = Vector2D.Distance(position, target);
        var toward = Vector2D.DirectionTo(position, target);
        if (distance < MinimumRange) return (toward * -1, 0.95);
        if (distance > MaximumRange) return (toward, 1);
        return (Vector2D.Rotate(toward, StrafeSign * Math.PI / 2), 0.45);
    }

    private void Enter(AshSlingerPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
