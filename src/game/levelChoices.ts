import { applyRunUpgrade, getRunUpgrade, runUpgrades, type RunUpgradeId, type RunUpgradeLevels } from './runUpgrades';
import { getSpell, learnOrUpgradeSpell, learnedSpellCount, spells, type SpellId, type SpellLevels } from './spells';
import { getSynergy, isSynergyAvailable, synergies, type SynergyId } from './synergies';

export type LevelChoiceKind = 'upgrade' | 'spell' | 'synergy';
export type ChoicePresentationKind = 'rune' | 'new-spell' | 'spell-upgrade' | 'synergy';

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

export function choicePresentationKind(choice: LevelChoice): ChoicePresentationKind {
  if (choice.kind === 'upgrade') return 'rune';
  if (choice.kind === 'synergy') return 'synergy';
  return choice.currentRank === 0 ? 'new-spell' : 'spell-upgrade';
}

export function choiceBadge(choice: LevelChoice): string {
  const kind = choicePresentationKind(choice);
  if (kind === 'rune') return 'RUNE';
  if (kind === 'new-spell') return 'NEW SPELL';
  if (kind === 'spell-upgrade') return 'SPELL UPGRADE';
  return 'SYNERGY';
}

export function choiceAction(choice: LevelChoice): string {
  const kind = choicePresentationKind(choice);
  if (kind === 'rune') return 'STRENGTHEN';
  if (kind === 'new-spell') return 'LEARN';
  if (kind === 'spell-upgrade') return 'UPGRADE';
  return 'DISCOVER';
}

export function describeChoiceRank(choice: LevelChoice): string {
  const kind = choicePresentationKind(choice);
  if (kind === 'synergy') return 'NEW INTERACTION';
  if (kind === 'new-spell') return 'RANK I';
  if (choice.currentRank === 0) return `RANK I / ${roman(choice.maxRank)}`;
  return `${roman(choice.currentRank)} → ${roman(choice.currentRank + 1)}`;
}

export function describeChoiceDelta(choice: LevelChoice): string {
  if (choice.kind === 'upgrade') return describeRuneDelta(choice.sourceId as RunUpgradeId, choice.currentRank);
  if (choice.kind === 'spell') return describeSpellDelta(choice.sourceId as SpellId, choice.currentRank);
  const synergy = getSynergy(choice.sourceId as SynergyId);
  return synergy.requires.map((id) => getSpell(id).name).join(' + ');
}

export function choiceFooter(choice: LevelChoice): string {
  const kind = choicePresentationKind(choice);
  if (kind === 'rune') return 'STRENGTHENS THIS RUN';
  if (kind === 'new-spell') return 'ADDS A NEW SPELL';
  if (kind === 'spell-upgrade') return 'IMPROVES AN EXISTING SPELL';
  return 'CHANGES HOW SPELLS INTERACT';
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
      badge: spellLevels[spell.id] === 0 ? 'NEW SPELL' : 'SPELL UPGRADE',
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
      badge: 'SYNERGY',
    }));

  return [...upgradeChoices, ...spellChoices, ...synergyChoices];
}

function describeRuneDelta(id: RunUpgradeId, currentRank: number): string {
  const nextRank = currentRank + 1;
  if (id === 'potency') return `Spell damage +${currentRank * 18}% → +${nextRank * 18}%`;
  if (id === 'quickening') return `Cast rate ×${(1 + currentRank * 0.12).toFixed(2)} → ×${(1 + nextRank * 0.12).toFixed(2)}`;
  if (id === 'vitality') return `Max health +${currentRank * 18} → +${nextRank * 18} • heal 18`;
  if (id === 'fleetfoot') return `Move speed +${currentRank * 10}% → +${nextRank * 10}%`;
  if (id === 'multicast') return `Extra projectiles +${currentRank} → +${nextRank} • projectile damage ×0.90`;
  if (id === 'frost-touch') {
    const hits = 7 - nextRank;
    const duration = 0.65 + nextRank * 0.2;
    return currentRank === 0 ? `Adds freeze every ${hits} hits • ${duration.toFixed(2)}s` : `Freeze every ${7 - currentRank} → ${hits} hits • ${duration.toFixed(2)}s`;
  }
  if (id === 'chain-spark') return `Bonus chains +${currentRank} → +${nextRank}`;
  return currentRank === 0 ? 'Echo every 7 casts at 55% damage' : 'Echo every 7 → 5 casts • 55% → 80% damage';
}

function describeSpellDelta(id: SpellId, currentRank: number): string {
  const nextRank = currentRank + 1;
  if (id === 'arcane-orb') {
    const currentDamage = currentRank === 0 ? 0 : Math.round(18 * (1 + (currentRank - 1) * 0.28));
    const nextDamage = Math.round(18 * (1 + (nextRank - 1) * 0.28));
    return currentRank === 0 ? `${nextDamage} damage • 0.65s base cooldown` : `${currentDamage} → ${nextDamage} damage • casts faster`;
  }
  if (id === 'fire-bolt') {
    const currentDamage = currentRank === 0 ? 0 : Math.round(30 * (1 + (currentRank - 1) * 0.3));
    const nextDamage = Math.round(30 * (1 + (nextRank - 1) * 0.3));
    const blast = nextRank === 3 ? ' • unlocks impact blast' : '';
    return currentRank === 0 ? `${nextDamage} damage • heavy projectile` : `${currentDamage} → ${nextDamage} damage${blast}`;
  }
  if (id === 'frost-shard') {
    const currentDamage = currentRank === 0 ? 0 : Math.round(12 * (1 + (currentRank - 1) * 0.25));
    const nextDamage = Math.round(12 * (1 + (nextRank - 1) * 0.25));
    const currentFreeze = currentRank === 0 ? 0 : 0.35 + currentRank * 0.18;
    const nextFreeze = 0.35 + nextRank * 0.18;
    return currentRank === 0 ? `${nextDamage} damage • freezes ${nextFreeze.toFixed(2)}s` : `${currentDamage} → ${nextDamage} damage • freeze ${currentFreeze.toFixed(2)} → ${nextFreeze.toFixed(2)}s`;
  }

  const currentDamage = currentRank === 0 ? 0 : 15 + (currentRank - 1) * 5;
  const nextDamage = 15 + (nextRank - 1) * 5;
  return currentRank === 0 ? `${nextDamage} damage • ${nextRank + 1} base jumps` : `${currentDamage} → ${nextDamage} damage • ${currentRank + 1} → ${nextRank + 1} base jumps`;
}

function takeRandom<T>(items: T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items.splice(index, 1)[0];
}

function roman(value: number): string {
  const numerals = ['0', 'I', 'II', 'III', 'IV', 'V'];
  return numerals[value] ?? String(value);
}

export function choiceDefinition(choice: LevelChoice): string {
  if (choice.kind === 'upgrade') return getRunUpgrade(choice.sourceId as RunUpgradeId).name;
  if (choice.kind === 'spell') return getSpell(choice.sourceId as SpellId).name;
  return getSynergy(choice.sourceId as SynergyId).name;
}
