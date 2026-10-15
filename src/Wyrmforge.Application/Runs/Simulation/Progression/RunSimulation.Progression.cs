using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.Experience;
using Wyrmforge.Domain.Progression.RunUpgrades;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void UpdateExperienceShards(double delta)
    {
        var collected = experienceShards.Update(delta, player.Position);
        if (collected <= 0) return;
        RegisterExperiencePickup(collected);
        GainExperience(collected);
    }

    private void CollectLooseExperienceShards()
    {
        var collected = experienceShards.CollectAll();
        if (collected > 0) GainExperience(collected);
    }

    private void GainExperience(int amount)
    {
        experienceEarned += amount;
        experience += amount;
        TryLevelUp();
    }

    private void TryLevelUp()
    {
        if (pendingChoices.Count > 0) return;
        if (pendingAttunements.TryDequeue(out var school))
        {
            PendingRewardSchool = school;
            pendingChoices = levelChoiceService.RollForProgression(build, level + 1, trailReward: true, school, Resonance);
            return;
        }
        PendingRewardSchool = null;
        if (experience < experienceToNext) return;
        pendingChoices = levelChoiceService.RollForProgression(build, level + 1, trailReward: false,
            CurrentRoute?.Reward.AttunementSchool, Resonance);
        if (pendingChoices.Count == 0) CompleteLevelUp();
    }

    private void ApplyChoiceEffects(LevelChoice choice)
    {
        var healMaximumHealthIncrease = choice.Id is "rune:Vitality" or "refine:Vitality";
        RefreshBuildModifiers(healMaximumHealthIncrease
            || choice.Kind is LevelChoiceKind.Refinement or LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade
                or LevelChoiceKind.Evolution or LevelChoiceKind.Synergy);
    }

    private void CompleteLevelUp()
    {
        experience -= experienceToNext;
        level++;
        experienceToNext = ExperienceCurve.RequiredForLevel(level);
        TryLevelUp();
    }
}
