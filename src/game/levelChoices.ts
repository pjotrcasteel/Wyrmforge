import { applyRunUpgrade, getRunUpgrade, runUpgrades, type RunUpgradeId, type RunUpgradeLevels } from './runUpgrades';
import { getSpell, learnOrUpgradeSpell, learnedSpellCount, spells, type SpellId, type SpellLevels } from './spells';
import { getSynergy, isSynergyAvailable, synergies, type SynergyId } from './synergies';

export type LevelChoiceKind = 'upgrade' | 'spell' | 'synergy';

export interface LevelChoice {
  readonly id: string;
  readonly kind: LevelChoiceKind;
  readonly sourceId: RunUpgradeId | SpellId | SynergyId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly currentRank: number;
  readonly maxRank: number;
  readonly badge: string;
}

export function rollLevelChoices(
  upgradeLevels: RunUpgradeLevels,
  spellLevels: SpellLevels,
  selectedSynergies: ReadonlySet<SynergyId>,
  count = 3,
  random: () => number = Math.random,
): readonly LevelChoice[] {
  const pool = createChoicePool(upgradeLevels, spellLevels, selectedSynergies);
  const choices: LevelChoice[] = [];

  const availableSynergies = pool.filter((choice) => choice.kind === 'synergy');
  if (availableSynergies.length > 0) {
    const synergy = takeRandom(availableSynergies, random);
    if (synergy) choices.push(synergy);
  } else if (learnedSpellCount(spellLevels) < 2) {
    const unlearnedSpells = pool.filter((choice) => choice.kind === 'spell' && choice.currentRank === 0);
    const spell = takeRandom(unlearnedSpells, random);
    if (spell) choices.push(spell);
  }

  const used = new Set(choices.map((choice) => choice.id));
  const remainder = pool.filter((choice) => !used.has(choice.id));
  while (remainder.length > 0 && choices.length < count) {
    const choice = takeRandom(remainder, random);
    if (choice) choices.push(choice);
  }

  return choices;
}

export function applyLevelChoice(
  choice: LevelChoice,
  upgradeLevels: RunUpgradeLevels,
  spellLevels: SpellLevels,
  selectedSynergies: Set<SynergyId>,
): boolean {
  if (choice.kind === 'upgrade') return applyRunUpgrade(upgradeLevels, choice.sourceId as RunUpgradeId);
  if (choice.kind === 'spell') return learnOrUpgradeSpell(spellLevels, choice.sourceId as SpellId);

  const synergyId = choice.sourceId as SynergyId;
  const synergy = getSynergy(synergyId);
  if (!isSynergyAvailable(synergy, spellLevels, selectedSynergies)) return false;
  selectedSynergies.add(synergyId);
  return true;
}

function createChoicePool(
  upgradeLevels: RunUpgradeLevels,
  spellLevels: SpellLevels,
  selectedSynergies: ReadonlySet<SynergyId>,
): LevelChoice[] {
  const upgradeChoices = runUpgrades
    .filter((upgrade) => upgradeLevels[upgrade.id] < upgrade.maxRank)
    .map((upgrade) => ({
      id: `upgrade:${upgrade.id}`,
      kind: 'upgrade' as const,
      sourceId: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      icon: upgrade.icon,
      currentRank: upgradeLevels[upgrade.id],
      maxRank: upgrade.maxRank,
      badge: 'RUNE',
    }));

  const spellChoices = spells
    .filter((spell) => spellLevels[spell.id] < spell.maxRank)
    .map((spell) => ({
      id: `spell:${spell.id}`,
      kind: 'spell' as const,
      sourceId: spell.id,
      name: spell.name,
      description: spell.description,
      icon: spell.icon,
      currentRank: spellLevels[spell.id],
      maxRank: spell.maxRank,
      badge: spellLevels[spell.id] === 0 ? 'NEW SPELL' : 'SPELL RANK',
    }));

  const synergyChoices = synergies
    .filter((synergy) => isSynergyAvailable(synergy, spellLevels, selectedSynergies))
    .map((synergy) => ({
      id: `synergy:${synergy.id}`,
      kind: 'synergy' as const,
      sourceId: synergy.id,
      name: synergy.name,
      description: synergy.description,
      icon: synergy.icon,
      currentRank: 0,
      maxRank: 1,
      badge: 'SYNERGY DISCOVERED',
    }));

  return [...upgradeChoices, ...spellChoices, ...synergyChoices];
}

function takeRandom<T>(items: T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items.splice(index, 1)[0];
}

export function describeChoiceRank(choice: LevelChoice): string {
  if (choice.kind === 'synergy') return choice.badge;
  if (choice.kind === 'spell' && choice.currentRank === 0) return choice.badge;
  return `${choice.badge} ${choice.currentRank + 1} / ${choice.maxRank}`;
}

export function choiceDefinition(choice: LevelChoice): string {
  if (choice.kind === 'upgrade') return getRunUpgrade(choice.sourceId as RunUpgradeId).name;
  if (choice.kind === 'spell') return getSpell(choice.sourceId as SpellId).name;
  return getSynergy(choice.sourceId as SynergyId).name;
}
