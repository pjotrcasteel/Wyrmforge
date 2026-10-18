using Wyrmforge.Domain.Combat.Geometry;

namespace Wyrmforge.Domain.Combat.Enemies;

public enum CairnPhase
{
    March,
    Brace,
    Recover,
}

public enum CairnEvent
{
    None,
    BraceStarted,
    Stamped,
}

/// <summary>
/// Cairn Sentinel (Frost roster 05). Not a recoloured Penitent: the Penitent guards an ally and bashes a short arc. The
/// Sentinel marches on the hunter, then plants into a Frost Brace — its frozen tower shield faces the hunter and soaks most
/// of a frontal hit, and nothing shoves it. The brace ends in an Avalanche Step: a wave of shock rolls out through the
/// ground across the same front arc, and only its rolling edge hurts and chills. Afterwards the Sentinel stands exposed.
/// The Sentinel owns the space in front of it; counterplay (concept sheet) is to flank it — beside or behind it, neither
/// the shield nor the wave reaches — not to trade into the wall, and to hit it while it recovers. Hades' Exalted shields and Dark Souls' greatshield
/// knights are the reference.
/// </summary>
public sealed class CairnSentinelBehaviorState
{
    public const double BraceRange = 160;
    public const double HoldDistance = 70;
    public const double InitialCooldownSeconds = 1.4;
    public const double CooldownSeconds = 4;
    public const double BraceSeconds = 1.1;
    public const double RecoverSeconds = 1.1;
    public const double BraceHalfAngleRadians = Math.PI / 3;
    public const double BracedFrontMultiplier = 0.3;
    public const double ExposedMultiplier = 1.25;
    public const double RingRadius = 170;
    public const double RingSeconds = 0.7;
    public const double RingThickness = 22;
    public const double RingDamage = 9;
    public const int RingChill = 2;

    public CairnPhase Phase { get; private set; } = CairnPhase.March;

    public double PhaseRemaining { get; private set; }

    public double CooldownRemaining { get; private set; } = InitialCooldownSeconds;

    public Vector2D Facing { get; private set; } = new(1, 0);

    public bool IsCommitted => Phase == CairnPhase.Brace;

    /// <summary>Braced Sentinels cannot be shoved: the stance is the point.</summary>
    public bool IsBraced => Phase == CairnPhase.Brace;

    public double BraceProgress => Phase == CairnPhase.Brace ? Math.Clamp(1 - PhaseRemaining / BraceSeconds, 0, 1) : 0;

    public CairnEvent Tick(double delta, Vector2D position, Vector2D target, bool mayCommit = true)
    {
        if (Phase == CairnPhase.March)
        {
            var toward = Vector2D.DirectionTo(position, target);
            if (toward != Vector2D.Zero) Facing = toward;
            CooldownRemaining = Math.Max(0, CooldownRemaining - delta);
            if (CooldownRemaining > 0 || !mayCommit || Vector2D.Distance(position, target) > BraceRange) return CairnEvent.None;
            CooldownRemaining = CooldownSeconds;
            Enter(CairnPhase.Brace, BraceSeconds);
            return CairnEvent.BraceStarted;
        }

        PhaseRemaining -= delta;
        if (PhaseRemaining > 0) return CairnEvent.None;
        if (Phase == CairnPhase.Brace)
        {
            Enter(CairnPhase.Recover, RecoverSeconds);
            return CairnEvent.Stamped;
        }
        Enter(CairnPhase.March, 0);
        return CairnEvent.None;
    }

    /// <summary>
    /// Damage taken from a source: a braced shield soaks hits from its front arc (the facing locked when it planted), while
    /// flank and rear hits land in full; a recovering Sentinel takes extra.
    /// </summary>
    public double DamageMultiplier(Vector2D position, Vector2D source)
    {
        if (Phase == CairnPhase.Recover) return ExposedMultiplier;
        if (Phase != CairnPhase.Brace) return 1;
        return InFront(position, Facing, source) ? BracedFrontMultiplier : 1;
    }

    /// <summary>Whether a point lies in the Sentinel's front arc. The brace and the Avalanche Step share this one arc.</summary>
    public static bool InFront(Vector2D position, Vector2D facing, Vector2D point)
    {
        var toPoint = Vector2D.DirectionTo(position, point);
        if (toPoint == Vector2D.Zero) return true;
        return toPoint.X * facing.X + toPoint.Y * facing.Y >= Math.Cos(BraceHalfAngleRadians);
    }

    /// <summary>Marching speed multiplier: close the gap, then hold a short distance instead of grinding into contact.</summary>
    public double MarchMultiplier(Vector2D position, Vector2D target) =>
        Phase != CairnPhase.March || Vector2D.Distance(position, target) <= HoldDistance ? 0 : 1;

    private void Enter(CairnPhase phase, double seconds)
    {
        Phase = phase;
        PhaseRemaining = seconds;
    }
}
