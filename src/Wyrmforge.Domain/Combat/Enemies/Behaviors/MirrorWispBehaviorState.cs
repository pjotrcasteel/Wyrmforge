using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum WispPhase
{
    /// <summary>Veiled: drifts at the edge of the fight, half out of the world. Most of a hit passes through it.</summary>
    Drift,
    /// <summary>Glass Step: its destination shimmers while it fades from where it stands.</summary>
    Shimmer,
    /// <summary>Materialised beside the hunter, drawing back for the Shiver Cut.</summary>
    Windup,
    Cut,
    /// <summary>After the strike it hangs solid and open.</summary>
    Exposed,
}

public enum WispEvent
{
    None,
    ShimmerStarted,
    Stepped,
    CutReleased,
}

/// <summary>
/// Mirror Wisp (Frost roster 06). Not a recoloured Drowned Wraith: the wraith surfaces from water it was hiding under; the
/// Wisp is always visible but never quite <em>there</em>. Veiled, most damage passes through it. Its Glass Step shimmers on
/// a reflective surface — a black ice patch when one is near, otherwise a spot beside the hunter — then it steps through,
/// leaving a Reflection Double where it stood: a false image that drifts after the hunter and swallows the next shot aimed
/// at it. Materialised, it draws back for a short Shiver Cut arc and then hangs solid and exposed. Counterplay (concept
/// sheet): do not chase the first apparition; punish the real Wisp after it commits to a visible strike. The Hollow Knight
/// Shade and Hades' Megaera's afterimages are the reference.
/// </summary>
public sealed class MirrorWispBehaviorState(int side = 1)
{
    public const double InitialCooldownSeconds = 2.4;
    public const double CooldownSeconds = 4.2;
    public const double ShimmerSeconds = 0.55;
    public const double WindupSeconds = 0.45;
    public const double CutSeconds = 0.15;
    public const double ExposedSeconds = 0.9;
    public const double DriftDistance = 230;
    public const double DriftAngleRadians = 0.3;
    public const double StepRange = 380;
    public const double StepDistance = 56;
    public const double StepAngleRadians = 1.75;
    public const double MirrorReach = 320;
    public const double MirrorMinimumDistance = 60;
    public const double CutRange = 74;
    public const double CutHalfAngleRadians = 0.87;
    public const double CutDamage = 8;
    public const int CutChill = 1;
    public const double VeiledMultiplier = 0.5;
    public const double ExposedMultiplier = 1.4;
    public const double DoubleSeconds = 3.5;
    public const double DoubleSpeedMultiplier = 0.6;

    public int Side { get; } = side >= 0 ? 1 : -1;

    public WispPhase Phase { get; private set; } = WispPhase.Drift;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D Destination { get; private set; } = Vector2D.Zero;

    /// <summary>Locked when the windup begins: the cut sweeps where the hunter was, not where it went.</summary>
    public Vector2D CutDirection { get; private set; } = new(1, 0);

    public bool IsCommitted => Phase is WispPhase.Shimmer or WispPhase.Windup or WispPhase.Cut;

    public bool IsVeiled => Phase is WispPhase.Drift or WispPhase.Shimmer;

    public double ShimmerProgress => Phase == WispPhase.Shimmer ? Math.Clamp(1 - PhaseRemaining / ShimmerSeconds, 0, 1) : 0;

    public double WindupProgress => Phase == WispPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    /// <summary>Veiled, half a hit passes through; after the visible strike it is solid and takes extra.</summary>
    public double DamageMultiplier => Phase switch
    {
        WispPhase.Drift or WispPhase.Shimmer => VeiledMultiplier,
        WispPhase.Cut or WispPhase.Exposed => ExposedMultiplier,
        _ => 1,
    };

    /// <param name="mirror">A reflective surface (black ice) to step onto, if one is within reach of the hunter.</param>
    public WispEvent Tick(double delta, Vector2D position, Vector2D hunter, Vector2D? mirror, bool mayCommit = true)
    {
        switch (Phase)
        {
            case WispPhase.Shimmer:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return WispEvent.None;
                var aim = Vector2D.DirectionTo(Destination, hunter);
                if (aim != Vector2D.Zero) CutDirection = aim;
                Enter(WispPhase.Windup, WindupSeconds);
                return WispEvent.Stepped;
            case WispPhase.Windup:
                PhaseRemaining -= delta;
                if (PhaseRemaining > 0) return WispEvent.None;
                Enter(WispPhase.Cut, CutSeconds);
                return WispEvent.CutReleased;
            case WispPhase.Cut:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(WispPhase.Exposed, ExposedSeconds);
                return WispEvent.None;
            case WispPhase.Exposed:
                PhaseRemaining -= delta;
                if (PhaseRemaining <= 0) Enter(WispPhase.Drift, 0);
                return WispEvent.None;
        }

        CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
        if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, hunter) > StepRange) return WispEvent.None;
        CooldownRemaining = CooldownSeconds;
        Destination = mirror ?? StepPoint(position, hunter);
        Enter(WispPhase.Shimmer, ShimmerSeconds);
        return WispEvent.ShimmerStarted;
    }

    /// <summary>The simulation keeps the step out of walls; the shimmer is drawn where the Wisp will really arrive.</summary>
    public void Settle(Vector2D destination)
    {
        if (Phase == WispPhase.Shimmer) Destination = destination;
    }

    /// <summary>With no mirror near, it steps out beside the hunter, swung round from where it stood.</summary>
    public Vector2D StepPoint(Vector2D position, Vector2D hunter)
    {
        var from = Vector2D.DirectionTo(hunter, position);
        if (from == Vector2D.Zero) from = new Vector2D(1, 0);
        return hunter + Vector2D.Rotate(from, Side * StepAngleRadians) * StepDistance;
    }

    /// <summary>Where the veiled Wisp drifts: a slow orbit at the edge of the fight.</summary>
    public Vector2D DriftPoint(Vector2D position, Vector2D hunter)
    {
        var from = Vector2D.DirectionTo(hunter, position);
        if (from == Vector2D.Zero) from = new Vector2D(Side, 0);
        return hunter + Vector2D.Rotate(from, Side * DriftAngleRadians) * DriftDistance;
    }

    /// <summary>Whether the hunter is inside the Shiver Cut's short arc.</summary>
    public bool CutHits(Vector2D position, Vector2D hunter, double hunterRadius)
    {
        var distance = Vector2D.Distance(position, hunter);
        if (distance > CutRange + hunterRadius) return false;
        if (distance <= hunterRadius) return true;
        var to = Vector2D.DirectionTo(position, hunter);
        return to.X * CutDirection.X + to.Y * CutDirection.Y >= Math.Cos(CutHalfAngleRadians);
    }

    private void Enter(WispPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}

/// <summary>A Mirror Wisp's Reflection Double: a false image that drifts after the hunter, then breaks like glass.</summary>
public sealed class MirrorDoubleState
{
    public double Remaining { get; set; } = MirrorWispBehaviorState.DoubleSeconds;
}
