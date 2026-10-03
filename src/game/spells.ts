export type SpellId = 'arcane-orb' | 'fire-bolt' | 'frost-shard' | 'chain-lightning';
export type SpellSchool = 'arcane' | 'fire' | 'frost' | 'storm';

export interface SpellDefinition {
  readonly id: SpellId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly school: SpellSchool;
  readonly maxRank: number;
}

export type SpellLevels = Record<SpellId, number>;

export const spells: readonly SpellDefinition[] = [
  { id: 'arcane-orb', name: 'Arcane Orb', description: 'Reliable arcane bolt. Higher ranks hit harder and cast faster.', icon: '◈', school: 'arcane', maxRank: 3 },
  { id: 'fire-bolt', name: 'Fire Bolt', description: 'Heavy, slower bolt. Rank III adds an impact blast.', icon: '🔥', school: 'fire', maxRank: 3 },
  { id: 'frost-shard', name: 'Frost Shard', description: 'Fast shard that freezes enemies briefly on hit.', icon: '❄', school: 'frost', maxRank: 3 },
  { id: 'chain-lightning', name: 'Chain Lightning', description: 'Instant lightning that jumps between multiple enemies.', icon: '⚡', school: 'storm', maxRank: 3 },
];

export function createSpellLevels(): SpellLevels {
  return {
    'arcane-orb': 1,
    'fire-bolt': 0,
    'frost-shard': 0,
    'chain-lightning': 0,
  };
}

export function getSpell(id: SpellId): SpellDefinition {
  const spell = spells.find((candidate) => candidate.id === id);
  if (!spell) throw new Error(`Unknown spell: ${id}`);
  return spell;
}

export function learnOrUpgradeSpell(levels: SpellLevels, id: SpellId): boolean {
  const spell = getSpell(id);
  if (levels[id] >= spell.maxRank) return false;
  levels[id]++;
  return true;
}

export function learnedSpellCount(levels: SpellLevels): number {
  return spells.filter((spell) => levels[spell.id] > 0).length;
}
