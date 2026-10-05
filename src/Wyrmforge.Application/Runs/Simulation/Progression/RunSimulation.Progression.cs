using Wyrmforge.Application.Runs.LevelUp;
using Wyrmforge.Domain.Progression.Experience;
using Wyrmforge.Domain.Progression.RunUpgrades;

namespace Wyrmforge.Application.Runs.Simulation;

public sealed partial class RunSimulation
{
    private void GainExperience(int amount)
    {
        experience += amount;
        TryLevelUp();
    }

    private void TryLevelUp()
    {
        if (pendingChoices.Count > 0 || experience < experienceToNext) return;
        pendingChoices = pendingAttunements.Count > 0 ? levelChoiceService.Roll(build, pendingAttunements.Dequeue()) : levelChoiceService.Roll(build);
        if (pendingChoices.Count == 0) CompleteLevelUp();
    }

    private void ApplyChoiceEffects(LevelChoice choice)
    {
        if (choice.Kind != LevelChoiceKind.Rune) return;
        RefreshBuildModifiers(choice.Id == $"rune:{RunUpgradeId.Vitality}");
    }

    private void CompleteLevelUp()
    {
        experience -= experienceToNext;
        level++;
        experienceToNext = ExperienceCurve.RequiredForLevel(level);
        TryLevelUp();
    }
}
