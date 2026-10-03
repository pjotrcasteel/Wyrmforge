import { describe, expect, it } from 'vitest';
import { createSpellLevels, learnOrUpgradeSpell, learnedSpellCount } from './spells';

describe('spells', () => {
  it('starts with Arcane Orb as the only learned spell', () => {
    const levels = createSpellLevels();
    expect(levels['arcane-orb']).toBe(1);
    expect(learnedSpellCount(levels)).toBe(1);
  });

  it('learns and ranks spells up to their cap', () => {
    const levels = createSpellLevels();
    expect(learnOrUpgradeSpell(levels, 'fire-bolt')).toBe(true);
    expect(learnOrUpgradeSpell(levels, 'fire-bolt')).toBe(true);
    expect(learnOrUpgradeSpell(levels, 'fire-bolt')).toBe(true);
    expect(learnOrUpgradeSpell(levels, 'fire-bolt')).toBe(false);
    expect(levels['fire-bolt']).toBe(3);
  });
});
