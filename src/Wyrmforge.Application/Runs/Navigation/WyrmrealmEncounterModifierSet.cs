namespace Wyrmforge.Application.Runs.Navigation;

public sealed class WyrmrealmEncounterModifierSet
{
    private readonly IReadOnlyDictionary<WyrmrealmHazardKind, double> hazardIntervals;

    private WyrmrealmEncounterModifierSet(double spawnIntervalMultiplier, double enemyHealthMultiplier, double enemySpeedMultiplier, double threatBudgetMultiplier,
        double recoveryMultiplier, IReadOnlyDictionary<WyrmrealmHazardKind, double> hazardIntervals)
    {
        SpawnIntervalMultiplier = spawnIntervalMultiplier;
        EnemyHealthMultiplier = enemyHealthMultiplier;
        EnemySpeedMultiplier = enemySpeedMultiplier;
        ThreatBudgetMultiplier = threatBudgetMultiplier;
        RecoveryMultiplier = recoveryMultiplier;
        this.hazardIntervals = hazardIntervals;
    }

    public static WyrmrealmEncounterModifierSet Empty { get; } = new(1, 1, 1, 1, 1, new Dictionary<WyrmrealmHazardKind, double>());

    public double SpawnIntervalMultiplier { get; }
    public double EnemyHealthMultiplier { get; }
    public double EnemySpeedMultiplier { get; }
    public double ThreatBudgetMultiplier { get; }
    public double RecoveryMultiplier { get; }

    public static WyrmrealmEncounterModifierSet Aggregate(IEnumerable<WyrmrealmEncounterModifier> modifiers)
    {
        var spawnInterval = 1d;
        var enemyHealth = 1d;
        var enemySpeed = 1d;
        var threatBudget = 1d;
        var recovery = 1d;
        var hazards = new Dictionary<WyrmrealmHazardKind, double>();

        foreach (var modifier in modifiers)
        {
            spawnInterval *= modifier.SpawnIntervalMultiplier;
            enemyHealth *= modifier.EnemyHealthMultiplier;
            enemySpeed *= modifier.EnemySpeedMultiplier;
            threatBudget *= modifier.ThreatBudgetMultiplier;
            recovery *= modifier.RecoveryMultiplier;
            if (modifier.HazardKind is not { } hazard) continue;
            hazards[hazard] = hazards.GetValueOrDefault(hazard, 1) * modifier.HazardIntervalMultiplier;
        }

        return new WyrmrealmEncounterModifierSet(spawnInterval, enemyHealth, enemySpeed, threatBudget, recovery, hazards);
    }

    public bool TryGetHazardInterval(WyrmrealmHazardKind kind, out double intervalMultiplier) => hazardIntervals.TryGetValue(kind, out intervalMultiplier);
}
