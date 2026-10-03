import { describe, expect, it } from 'vitest';
import { applyLevelChoice, rollLevelChoices } from './levelChoices';
import { createRunUpgradeLevels } from './runUpgrades';
import { createSpellLevels } from './spells';
import type { SynergyId } from './synergies';

describe('level choices', () => {
  it('guarantees a new spell while only the starter spell is known', () => {
    const choices = rollLevelChoices(createRunUpgradeLevels(), createSpellLevels(), new Set<SynergyId>(), 3, () => 0);
    expect(choices).toHaveLength(3);
    expect(choices.some((choice) => choice.kind === 'spell' && choice.currentRank === 0)).toBe(true);
  });

  it('surfaces a synergy once its spell requirements are learned', () => {
    const spells = createSpellLevels();
    spells['fire-bolt'] = 1;
    spells['frost-shard'] = 1;
    const choices = rollLevelChoices(createRunUpgradeLevels(), spells, new Set<SynergyId>(), 3, () => 0);
    expect(choices[0]?.id).toBe('synergy:frostfire');
  });

  it('applies spell and synergy choices only when valid', () => {
    const upgrades = createRunUpgradeLevels();
    const spells = createSpellLevels();
    const selected = new Set<SynergyId>();
    const newSpell = rollLevelChoices(upgrades, spells, selected, 3, () => 0).find((choice) => choice.kind === 'spell' && choice.currentRank === 0);
    expect(newSpell).toBeDefined();
    expect(applyLevelChoice(newSpell!, upgrades, spells, selected)).toBe(true);

    spells['fire-bolt'] = 1;
    spells['frost-shard'] = 1;
    const synergy = rollLevelChoices(upgrades, spells, selected, 3, () => 0).find((choice) => choice.id === 'synergy:frostfire');
    expect(synergy).toBeDefined();
    expect(applyLevelChoice(synergy!, upgrades, spells, selected)).toBe(true);
    expect(selected.has('frostfire')).toBe(true);
    expect(applyLevelChoice(synergy!, upgrades, spells, selected)).toBe(false);
  });
});
