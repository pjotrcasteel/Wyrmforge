namespace Wyrmforge.Application.Runs.Telemetry;

/// <summary>
/// What crowd control actually bought this hunt (amendment §9), measured as enemy-seconds denied: every second an enemy is frozen
/// counts fully, a chilled second counts by how much it was slowed. Split by who was denied, so "Frost slows things far away" and
/// "Frost stops the thing about to hit me" can be told apart. The level-up pulse freezes everything for every school, so seconds
/// inside its window are kept apart as <see cref="PulseSecondsDenied"/> and never credited to the build.
/// </summary>
public sealed record ControlTelemetry(
    double EnemySecondsPresent,
    double EnemySecondsDenied,
    double ThreatSecondsPresent,
    double ThreatSecondsDenied,
    double EliteSecondsPresent,
    double EliteSecondsDenied,
    double WyrmSecondsPresent,
    double WyrmSecondsDenied,
    int Kills,
    int KillsWhileControlled,
    double PulseSecondsDenied = 0)
{
    public static ControlTelemetry Empty { get; } = new(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

    public double EnemyShare => Share(EnemySecondsDenied, EnemySecondsPresent);
    public double ThreatShare => Share(ThreatSecondsDenied, ThreatSecondsPresent);
    public double EliteShare => Share(EliteSecondsDenied, EliteSecondsPresent);
    public double WyrmShare => Share(WyrmSecondsDenied, WyrmSecondsPresent);
    public double ControlledKillShare => Kills == 0 ? 0 : KillsWhileControlled / (double)Kills;

    private static double Share(double denied, double present) => present <= 0 ? 0 : denied / present;
}

public sealed class ControlLedger
{
    /// <summary>Close enough to land a hit within about a second: the enemies a hunter actually needs stopped.</summary>
    public const double ThreatRadius = 160;

    private double enemyPresent, enemyDenied, threatPresent, threatDenied, elitePresent, eliteDenied, wyrmPresent, wyrmDenied;
    private double pulseDenied, pulseRemaining;
    private int kills, controlledKills;

    /// <summary>The level-up pulse just froze the field; denial in the next <paramref name="seconds"/> belongs to it, not the build.</summary>
    public void BeginPulse(double seconds) => pulseRemaining = Math.Max(pulseRemaining, seconds);

    public void Advance(double delta) => pulseRemaining = Math.Max(0, pulseRemaining - Math.Max(0, delta));

    public void ObserveEnemy(double delta, double timeScale, double distanceToHunter, bool eliteOrUnique)
    {
        if (delta <= 0) return;
        var denied = delta * (1 - Math.Clamp(timeScale, 0, 1));
        if (pulseRemaining > 0)
        {
            pulseDenied += denied;
            denied = 0;
        }
        enemyPresent += delta;
        enemyDenied += denied;
        if (distanceToHunter <= ThreatRadius)
        {
            threatPresent += delta;
            threatDenied += denied;
        }
        if (eliteOrUnique)
        {
            elitePresent += delta;
            eliteDenied += denied;
        }
    }

    public void ObserveWyrm(double delta, double timeScale)
    {
        if (delta <= 0) return;
        wyrmPresent += delta;
        var denied = delta * (1 - Math.Clamp(timeScale, 0, 1));
        if (pulseRemaining > 0) pulseDenied += denied;
        else wyrmDenied += denied;
    }

    public void Kill(bool controlled)
    {
        kills++;
        if (controlled && pulseRemaining <= 0) controlledKills++;
    }

    public ControlTelemetry Snapshot() => new(enemyPresent, enemyDenied, threatPresent, threatDenied, elitePresent, eliteDenied, wyrmPresent, wyrmDenied, kills, controlledKills, pulseDenied);
}