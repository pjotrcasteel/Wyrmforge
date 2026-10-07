using Wyrmforge.Application.Abstractions.Randomness;
using Wyrmforge.Domain.Combat.Enemies;

namespace Wyrmforge.Application.Runs.Simulation;

public static class EnemyEncounterComposition
{
    private static readonly IReadOnlyDictionary<EnemyEncounterPattern, EnemyCompositionProfile> Profiles =
        new Dictionary<EnemyEncounterPattern, EnemyCompositionProfile>
        {
            [EnemyEncounterPattern.Swarm] = new(10, 0.55, new Dictionary<EnemyRole, double>
            {
                [EnemyRole.Pressure] = 1,
            }, MinimumBatchSize: 3, MaximumBatchSize: 5),
            [EnemyEncounterPattern.StalkerPressure] = new(10, 0.9, new Dictionary<EnemyRole, double>
            {
                [EnemyRole.Pressure] = 0.6,
                [EnemyRole.Ambusher] = 1.4,
            }, new Dictionary<EnemyRole, int>
            {
                [EnemyRole.Ambusher] = 2,
            }, MinimumBatchSize: 1, MaximumBatchSize: 2),
            [EnemyEncounterPattern.Mixed] = new(12, 0.75, new Dictionary<EnemyRole, double>
            {
                [EnemyRole.Pressure] = 1,
                [EnemyRole.Ambusher] = 0.7,
            }, new Dictionary<EnemyRole, int>
            {
                [EnemyRole.Ambusher] = 1,
            }, MinimumBatchSize: 2, MaximumBatchSize: 3),
        };

    public static EnemyCompositionPlan CreatePlan(EnemyEncounterPattern pattern, int depth, IRandomSource randomSource, double threatBudgetMultiplier = 1)
    {
        var profile = GetProfile(pattern);
        var budget = Math.Max(1, (int)Math.Round(profile.BaseThreatBudget * Math.Max(0.25, threatBudgetMultiplier)));
        var plan = new List<EnemyKind>();
        var spent = 0;

        foreach (var role in Enum.GetValues<EnemyRole>())
        {
            for (var count = 0; count < profile.MinimumFor(role); count++)
            {
                var required = EligibleEnemies(profile, depth, budget - spent).Where(definition => definition.Role == role).ToArray();
                if (required.Length == 0) break;
                var selected = required[randomSource.Next(required.Length)];
                plan.Add(selected.Kind);
                spent += selected.ThreatCost;
            }
        }

        while (true)
        {
            var eligible = EligibleEnemies(profile, depth, budget - spent).ToArray();
            if (eligible.Length == 0) break;
            var selected = SelectWeighted(eligible, profile, randomSource);
            plan.Add(selected.Kind);
            spent += selected.ThreatCost;
        }

        return new EnemyCompositionPlan(plan, spent);
    }

    public static EnemyCompositionProfile GetProfile(EnemyEncounterPattern pattern) => Profiles[pattern];

    public static double GetSpawnIntervalMultiplier(EnemyEncounterPattern pattern) => GetProfile(pattern).SpawnIntervalMultiplier;

    public static int GetSpawnBatchSize(EnemyEncounterPattern pattern, IRandomSource randomSource)
    {
        var profile = GetProfile(pattern);
        if (profile.MaximumBatchSize <= profile.MinimumBatchSize) return profile.MinimumBatchSize;
        return profile.MinimumBatchSize + randomSource.Next(profile.MaximumBatchSize - profile.MinimumBatchSize + 1);
    }

    public static int GetActiveEnemyCap(int depth) => 22 + Math.Max(0, depth - 1) * 10;

    public static EnemyEncounterPattern SelectNext(EnemyEncounterPattern previous, int alternativeIndex)
    {
        if (alternativeIndex is < 0 or > 1) throw new ArgumentOutOfRangeException(nameof(alternativeIndex));
        return (EnemyEncounterPattern)(((int)previous + 1 + alternativeIndex) % 3);
    }

    private static IEnumerable<EnemyDefinition> EligibleEnemies(EnemyCompositionProfile profile, int depth, int remainingBudget) =>
        EnemyCatalog.All.Where(definition => definition.MinimumDepth <= depth && definition.ThreatCost <= remainingBudget && profile.WeightFor(definition.Role) > 0);

    private static EnemyDefinition SelectWeighted(IReadOnlyList<EnemyDefinition> eligible, EnemyCompositionProfile profile, IRandomSource randomSource)
    {
        var totalWeight = eligible.Sum(definition => profile.WeightFor(definition.Role));
        var roll = randomSource.NextDouble() * totalWeight;
        foreach (var definition in eligible)
        {
            roll -= profile.WeightFor(definition.Role);
            if (roll < 0) return definition;
        }
        return eligible[^1];
    }
}
