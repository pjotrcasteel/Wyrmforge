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
        var previousMaxHealth = player.MaxHealth;
        modifiers = RunUpgradeModifiers.Create(build.RunUpgrades);
        player.MaxHealth = passiveProfile.MaxHealth + modifiers.MaxHealthBonus + relicModifiers.MaxHealthBonus + dragonEssenceModifiers.MaxHealthBonus;
        if (choice.Id == $"rune:{RunUpgradeId.Vitality}") player.Health = Math.Min(player.MaxHealth, player.Health + player.MaxHealth - previousMaxHealth);
    }

    private void CompleteLevelUp()
    {
        experience -= experienceToNext;
        level++;
        experienceToNext = ExperienceCurve.RequiredForLevel(level);
        TryLevelUp();
    }
}
