namespace Wyrmforge.Application.Runs.Simulation;

/// <summary>Authoritative world scale and the fixed combat arena size, independent of the phone viewport.</summary>
public static class ArenaMetricEnvelope
{
    /// <summary>One metre is one 32-pixel block face; world units equal CSS pixels at 1x camera zoom.</summary>
    public const double UnitsPerMeter = 32;

    /// <summary>Tunable (owner, 1 November 2026): compact combat arena of roughly 32 x 60 m.</summary>
    public const double CombatWidthMeters = 32;
    public const double CombatLengthMeters = 60;

    public const double CombatWidth = CombatWidthMeters * UnitsPerMeter;
    public const double CombatHeight = CombatLengthMeters * UnitsPerMeter;
}
