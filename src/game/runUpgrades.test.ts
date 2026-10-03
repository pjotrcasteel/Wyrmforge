import { describe, expect, it } from 'vitest';
import { applyRunUpgrade, createRunUpgradeLevels, experienceRequiredForLevel, getRunModifiers, rollRunUpgradeChoices } from './runUpgrades';

describe('run upgrades', () => {
  it('increases XP requirements as the run level rises', () => {
    expect(experienceRequiredForLevel(1)).toBe(5);
    expect(experienceRequiredForLevel(2)).toBe(8);
    expect(experienceRequiredForLevel(5)).toBe(17);
  });

  it('applies upgrades only up to their maximum rank', () => {
    const levels = createRunUpgradeLevels();
    expect(applyRunUpgrade(levels, 'multicast')).toBe(true);
    expect(applyRunUpgrade(levels, 'multicast')).toBe(true);
    expect(applyRunUpgrade(levels, 'multicast')).toBe(false);
    expect(levels.multicast).toBe(2);
  });

  it('rolls unique upgrade choices and excludes maxed upgrades', () => {
    const levels = createRunUpgradeLevels();
    levels.multicast = 2;
    const choices = rollRunUpgradeChoices(levels, 3, () => 0);
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.upgrade.id)).size).toBe(3);
    expect(choices.some((choice) => choice.upgrade.id === 'multicast')).toBe(false);
  });

  it('converts upgrade ranks into combat modifiers', () => {
    const levels = createRunUpgradeLevels();
    levels.potency = 2;
    levels.fleetfoot = 1;
    levels['chain-spark'] = 2;
    const modifiers = getRunModifiers(levels);
    expect(modifiers.damageMultiplier).toBeCloseTo(1.36);
    expect(modifiers.moveSpeedMultiplier).toBeCloseTo(1.1);
    expect(modifiers.bonusChains).toBe(2);
  });
});
