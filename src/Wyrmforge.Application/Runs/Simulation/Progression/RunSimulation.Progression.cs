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
        experience += amount;
        TryLevelUp();
    }

    private void TryLevelUp()
    {
        if (pendingChoices.Count > 0 || experience < experienceToNext) return;
        pendingChoices = pendingAttunements.Count > 0
            ? levelChoiceService.Roll(build, pendingAttunements.Dequeue(), Resonance)
            : levelChoiceService.Roll(build, Resonance);
        if (pendingChoices.Count == 0) CompleteLevelUp();
    }

    private void ApplyChoiceEffects(LevelChoice choice)
    {
        var healMaximumHealthIncrease = choice.Kind == LevelChoiceKind.Rune && choice.Id == $"rune:{RunUpgradeId.Vitality}";
        RefreshBuildModifiers(healMaximumHealthIncrease
            || choice.Kind is LevelChoiceKind.NewSpell or LevelChoiceKind.SpellUpgrade or LevelChoiceKind.Evolution or LevelChoiceKind.Synergy);
    }

    private void CompleteLevelUp()
    {
        experience -= experienceToNext;
        level++;
        experienceToNext = ExperienceCurve.RequiredForLevel(level);
        TryLevelUp();
    }
}
