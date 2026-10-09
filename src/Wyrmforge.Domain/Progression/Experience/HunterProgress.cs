namespace Wyrmforge.Domain.Progression.Experience;

public sealed record HunterLevelReward(int Level, int AtlasPoints, int RelicCaches);
public sealed record HunterExperienceGain(int Experience, int FromLevel, int ToLevel, int AtlasPoints, int RelicCaches);

/// <summary>Permanent progression. The same collected XP powers the temporary hunt and this account track.</summary>
public sealed class HunterProgress
{
    public const int MaxLevel = 24;
    public long TotalExperience { get; private set; }
    public int Level
    {
        get
        {
            var level = 1;
            while (level < MaxLevel && TotalExperience >= TotalForLevel(level + 1)) level++;
            return level;
        }
    }

    public int AtlasBudget => Level;
    public bool AtCap => Level == MaxLevel;
    public int ExperienceInLevel => AtCap ? 0 : (int)(TotalExperience - TotalForLevel(Level));
    public int ExperienceToNext => RequiredForLevel(Level);
    public int EarnedCaches => Enumerable.Range(2, Level - 1).Sum(level => RewardForLevel(level).RelicCaches);
    public string NextReward => AtCap ? "Atlas complete" : RewardLabel(RewardForLevel(Level + 1));

    public string NextRewardForBudget(int pointBudget)
    {
        var next = Enumerable.Range(Level + 1, MaxLevel - Level).Select(RewardForLevel)
            .FirstOrDefault(reward => reward.Level > pointBudget || reward.RelicCaches > 0);
        if (next is null) return "All current level rewards earned";
        var reward = next.Level > pointBudget ? RewardLabel(next) : "relic cache";
        return $"Hunter {next.Level}: {reward}";
    }

    public static int RequiredForLevel(int level) => 40 + Math.Clamp(level - 1, 0, MaxLevel - 1) * 5;
    public static long TotalForLevel(int level)
    {
        var completed = Math.Clamp(level - 1, 0, MaxLevel - 1);
        return completed * 40L + completed * (completed - 1L) * 5 / 2;
    }

    // Add future level-specific unlocks here; XP and reward persistence remain the same.
    public static HunterLevelReward RewardForLevel(int level) => new(level, level is >= 2 and <= MaxLevel ? 1 : 0,
        level is 5 or 10 or 15 or 20 ? 1 : 0);
    public static string RewardLabel(HunterLevelReward reward) => reward.RelicCaches > 0 ? "1 Arcane point + relic cache" : "1 Arcane point";

    public HunterExperienceGain AddExperience(int amount)
    {
        var previous = Level;
        var earned = Math.Clamp(amount, 0, 1_000_000);
        TotalExperience = Math.Min(TotalExperience + earned, 1_000_000_000L);
        var rewards = Enumerable.Range(previous + 1, Level - previous).Select(RewardForLevel).ToArray();
        return new(earned, previous, Level, rewards.Sum(reward => reward.AtlasPoints), rewards.Sum(reward => reward.RelicCaches));
    }

    public void Restore(long? experience) => TotalExperience = Math.Clamp(experience ?? 0, 0, 1_000_000_000L);
}
