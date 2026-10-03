import { describe, expect, it } from 'vitest';
import { applyLevelChoice, choicePresentationKind, describeChoiceDelta, describeChoiceRank, rollLevelChoices, type LevelChoice } from './levelChoices';
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

  it('distinguishes new spells from spell upgrades in presentation', () => {
    const newSpell: LevelChoice = { id: 'spell:fire-bolt', kind: 'spell', sourceId: 'fire-bolt', name: 'Fire Bolt', description: '', icon: '🔥', currentRank: 0, maxRank: 3, badge: 'NEW SPELL' };
    const spellUpgrade: LevelChoice = { ...newSpell, currentRank: 2, badge: 'SPELL UPGRADE' };
    expect(choicePresentationKind(newSpell)).toBe('new-spell');
    expect(choicePresentationKind(spellUpgrade)).toBe('spell-upgrade');
    expect(describeChoiceRank(newSpell)).toBe('RANK I');
    expect(describeChoiceRank(spellUpgrade)).toBe('II → III');
  });

  it('shows concrete before and after information for upgrades', () => {
    const rune: LevelChoice = { id: 'upgrade:potency', kind: 'upgrade', sourceId: 'potency', name: 'Potency', description: '', icon: '✦', currentRank: 1, maxRank: 5, badge: 'RUNE' };
    const spell: LevelChoice = { id: 'spell:chain-lightning', kind: 'spell', sourceId: 'chain-lightning', name: 'Chain Lightning', description: '', icon: '⚡', currentRank: 1, maxRank: 3, badge: 'SPELL UPGRADE' };
    expect(describeChoiceDelta(rune)).toBe('Spell damage +18% → +36%');
    expect(describeChoiceDelta(spell)).toContain('2 → 3 base jumps');
  });
});
