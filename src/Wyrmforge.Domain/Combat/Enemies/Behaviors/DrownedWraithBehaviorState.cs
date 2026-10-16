using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum DrownedWraithPhase
{
    /// <summary>Under the water: not a combat target and harmless, shown only as a drifting ripple.</summary>
    Submerged,
    /// <summary>Fixed ripple ring where it will rise. Still untargetable; this is the 0.8s ambush tell.</summary>
    Emerging,
    /// <summary>Materialized and targetable, the claw direction already locked.</summary>
    Windup,
    /// <summary>Lingers after the strike: slow, solid and open to punishment.</summary>
    Exposed,
    /// <summary>Sinking back into the water, still targetable until it is gone.</summary>
    Fading,
}

public enum DrownedWraithEvent
{
    None,
    EmergeStarted,
    Materialized,
    Struck,
    Submerged,
}

/// <summary>
/// Drowned Wraith ambush loop (encounter brief §3: "Ground water ripples → materialize → strike"; never damaging while invisible
/// and never rising on the hunter). It drifts under the water to an ambush ring around the hunter, marks its exact rising spot
/// for 0.8s, materializes, telegraphs one frontal claw, then stays exposed before fading to reposition. Like a Hades Wretched
/// Sneak or a Monster Hunter Jyuratodus, the tell is the threat and the recovery is the opening.
/// </summary>
public sealed class DrownedWraithBehaviorState(int id = 0)
{
    public const double FirstDriftSeconds = 1.1;
    public const double DriftSeconds = 2.1;
    public const double EmergeSeconds = 0.8;
    public const double WindupSeconds = 0.4;
    public const double ExposedSeconds = 1.5;
    public const double FadeSeconds = 0.45;
    public const double AbortedDriftSeconds = 0.6;
    /// <summary>
    /// After this long underwater the wraith rises wherever it is (never on the hunter), even when the committed-threat cap is full
    /// or a kiting hunter keeps leaving its ambush ring, so it can never hold a slot or stall a clear.
    /// </summary>
    public const double ForceEmergeSeconds = 6;
    /// <summary>The ring sits inside the claw's reach: standing still after the ripple gets you hit, moving does not.</summary>
    public const double AmbushRadius = 50;
    public const double MinimumEmergeDistance = 34;
    public const double EmergeRange = 72;
    public const double StrikeReach = 60;
    /// <summary>Same frontal wedge as the Penitent bash so the two arcs read alike; must match the drawn telegraph.</summary>
    public const double StrikeHalfAngleRadians = Math.PI / 3;
    public const double StrikeDamage = 14;
    public const double DriftSpeedMultiplier = 1.5;
    public const double ExposedSpeedMultiplier = 0.55;
    private const double AmbushTurnRadians = 0.55;

    public int OrbitSign { get; } = id % 2 == 0 ? 1 : -1;

    public DrownedWraithPhase Phase { get; private set; } = DrownedWraithPhase.Submerged;

    public double PhaseRemaining { get; private set; } = FirstDriftSeconds + id % 3 * 0.35;

    public double SubmergedSeconds { get; private set; }

    public Vector2D Facing { get; private set; } = new(1, 0);

    public bool IsSubmerged => Phase is DrownedWraithPhase.Submerged or DrownedWraithPhase.Emerging;

    /// <summary>The ripple and the claw windup both count against the encounter's concurrent committed-threat cap.</summary>
    public bool IsCommitted => Phase is DrownedWraithPhase.Emerging or DrownedWraithPhase.Windup;

    public double EmergeProgress => Phase == DrownedWraithPhase.Emerging ? Math.Clamp(1 - PhaseRemaining / EmergeSeconds, 0, 1) : 0;

    public double WindupProgress => Phase == DrownedWraithPhase.Windup ? Math.Clamp(1 - PhaseRemaining / WindupSeconds, 0, 1) : 0;

    /// <summary>Body opacity for presentation: rising out of the water, solid, then sinking.</summary>
    public double Opacity => Phase switch
    {
        DrownedWraithPhase.Windup => 0.55 + 0.45 * WindupProgress,
        DrownedWraithPhase.Fading => 0.25 + 0.75 * Math.Clamp(PhaseRemaining / FadeSeconds, 0, 1),
        DrownedWraithPhase.Exposed => 1,
        _ => 0,
    };

    public DrownedWraithEvent Tick(double delta, Vector2D position, Vector2D target, bool mayCommit = true)
    {
        if (Phase == DrownedWraithPhase.Submerged)
        {
            SubmergedSeconds += delta;
            PhaseRemaining = Math.Max(0, PhaseRemaining - delta);
            var distance = Vector2D.Distance(position, target);
            var forced = SubmergedSeconds >= ForceEmergeSeconds;
            if (PhaseRemaining > 0 || distance < MinimumEmergeDistance || (distance > EmergeRange && !forced)) return DrownedWraithEvent.None;
            if (!mayCommit && !forced) return DrownedWraithEvent.None;
            Enter(DrownedWraithPhase.Emerging, EmergeSeconds);
            return DrownedWraithEvent.EmergeStarted;
        }

        PhaseRemaining -= delta;
        if (PhaseRemaining > 0) return DrownedWraithEvent.None;
        switch (Phase)
        {
            case DrownedWraithPhase.Emerging:
                // The hunter is standing in the ripple: sink and pick another spot rather than rise inside them.
                if (Vector2D.Distance(position, target) < MinimumEmergeDistance * 0.5)
                {
                    Enter(DrownedWraithPhase.Submerged, AbortedDriftSeconds);
                    return DrownedWraithEvent.None;
                }
                Facing = Vector2D.DirectionTo(position, target) is var aim && aim != Vector2D.Zero ? aim : new Vector2D(OrbitSign, 0);
                SubmergedSeconds = 0;
                Enter(DrownedWraithPhase.Windup, WindupSeconds);
                return DrownedWraithEvent.Materialized;
            case DrownedWraithPhase.Windup:
                Enter(DrownedWraithPhase.Exposed, ExposedSeconds);
                return DrownedWraithEvent.Struck;
            case DrownedWraithPhase.Exposed:
                Enter(DrownedWraithPhase.Fading, FadeSeconds);
                return DrownedWraithEvent.None;
            default:
                Enter(DrownedWraithPhase.Submerged, DriftSeconds);
                return DrownedWraithEvent.Submerged;
        }
    }

    /// <summary>True when the locked claw wedge reaches a target of the given radius.</summary>
    public bool StrikeHits(Vector2D position, Vector2D target, double targetRadius)
    {
        var offset = target - position;
        var distance = offset.Length;
        if (distance > StrikeReach + targetRadius) return false;
        if (distance <= targetRadius) return true;
        var cosine = (offset.X * Facing.X + offset.Y * Facing.Y) / distance;
        return cosine >= Math.Cos(StrikeHalfAngleRadians);
    }

    /// <summary>Where the submerged wraith glides to: a point on the ambush ring, turned to this wraith's side of the hunter.</summary>
    public Vector2D AmbushPoint(Vector2D position, Vector2D target)
    {
        var offset = position - target;
        var around = offset.Length < 1 ? new Vector2D(OrbitSign, 0) : offset.Normalized();
        return target + Vector2D.Rotate(around, OrbitSign * AmbushTurnRadians) * AmbushRadius;
    }

    private void Enter(DrownedWraithPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
