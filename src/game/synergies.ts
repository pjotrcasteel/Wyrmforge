import type { SpellId, SpellLevels } from './spells';

export type SynergyId = 'frostfire' | 'stormglass' | 'arcane-conduit';

export interface SynergyDefinition {
  readonly id: SynergyId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly requires: readonly SpellId[];
}

export const synergies: readonly SynergyDefinition[] = [
  {
    id: 'frostfire',
    name: 'Frostfire',
    description: 'Fire Bolt shatters frozen enemies for ×2 damage and a larger blast.',
    icon: '🔥❄',
    requires: ['fire-bolt', 'frost-shard'],
  },
  {
    id: 'stormglass',
    name: 'Stormglass',
    description: 'Chain Lightning striking frozen enemies deals +50% damage and gains 2 extra jumps.',
    icon: '⚡❄',
    requires: ['chain-lightning', 'frost-shard'],
  },
  {
    id: 'arcane-conduit',
    name: 'Arcane Conduit',
    description: 'Every 4th Arcane Orb hit discharges a smaller Chain Lightning from the target.',
    icon: '◈⚡',
    requires: ['arcane-orb', 'chain-lightning'],
  },
];

export function getSynergy(id: SynergyId): SynergyDefinition {
  const synergy = synergies.find((candidate) => candidate.id === id);
  if (!synergy) throw new Error(`Unknown synergy: ${id}`);
  return synergy;
}

export function isSynergyAvailable(synergy: SynergyDefinition, spellLevels: SpellLevels, selected: ReadonlySet<SynergyId>): boolean {
  return !selected.has(synergy.id) && synergy.requires.every((spellId) => spellLevels[spellId] > 0);
}
