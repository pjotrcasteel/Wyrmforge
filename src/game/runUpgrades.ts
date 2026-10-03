export type RunUpgradeId = 'potency' | 'quickening' | 'vitality' | 'fleetfoot' | 'multicast' | 'frost-touch' | 'chain-spark' | 'arcane-echo';

export interface RunUpgradeDefinition {
  readonly id: RunUpgradeId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly maxRank: number;
}

export type RunUpgradeLevels = Record<RunUpgradeId, number>;

export interface RunUpgradeChoice {
  readonly upgrade: RunUpgradeDefinition;
  readonly currentRank: number;
}

export interface RunModifiers {
  readonly damageMultiplier: number;
  readonly castIntervalMultiplier: number;
  readonly projectileSpeedMultiplier: number;
  readonly moveSpeedMultiplier: number;
  readonly maxHealthBonus: number;
  readonly extraProjectiles: number;
  readonly bonusChains: number;
  readonly freezeEveryHits: number;
  readonly freezeDuration: number;
  readonly echoEveryCasts: number;
  readonly echoDamageMultiplier: number;
}

export const runUpgrades: readonly RunUpgradeDefinition[] = [
  { id: 'potency', name: 'Potency', description: '+18% spell damage.', icon: '✦', maxRank: 5 },
  { id: 'quickening', name: 'Quickening', description: 'Cast 12% faster.', icon: '⚡', maxRank: 5 },
  { id: 'vitality', name: 'Vitality', description: '+18 max health and heal 18.', icon: '♥', maxRank: 4 },
  { id: 'fleetfoot', name: 'Fleetfoot', description: '+10% movement speed.', icon: '➶', maxRank: 3 },
  { id: 'multicast', name: 'Multicast', description: '+1 projectile per cast, but each projectile deals 10% less damage.', icon: '✧', maxRank: 2 },
  { id: 'frost-touch', name: 'Frost Touch', description: 'Repeated hits freeze enemies. Higher ranks trigger faster and last longer.', icon: '❄', maxRank: 3 },
  { id: 'chain-spark', name: 'Chain Spark', description: 'Projectiles gain +1 chain. Stacks with Storm tree effects.', icon: 'ϟ', maxRank: 2 },
  { id: 'arcane-echo', name: 'Arcane Echo', description: 'Periodically repeat a cast for free. Rank 2 echoes more often and harder.', icon: '◈', maxRank: 2 },
];

export function createRunUpgradeLevels(): RunUpgradeLevels {
  return {
    potency: 0,
    quickening: 0,
    vitality: 0,
    fleetfoot: 0,
    multicast: 0,
    'frost-touch': 0,
    'chain-spark': 0,
    'arcane-echo': 0,
  };
}

export function experienceRequiredForLevel(level: number): number {
  return 5 + Math.max(0, level - 1) * 3;
}

export function applyRunUpgrade(levels: RunUpgradeLevels, id: RunUpgradeId): boolean {
  const upgrade = getRunUpgrade(id);
  if (levels[id] >= upgrade.maxRank) return false;
  levels[id]++;
  return true;
}

export function rollRunUpgradeChoices(levels: RunUpgradeLevels, count = 3, random: () => number = Math.random): readonly RunUpgradeChoice[] {
  const pool = runUpgrades.filter((upgrade) => levels[upgrade.id] < upgrade.maxRank);
  const choices: RunUpgradeChoice[] = [];

  while (pool.length > 0 && choices.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    const [upgrade] = pool.splice(index, 1);
    if (!upgrade) break;
    choices.push({ upgrade, currentRank: levels[upgrade.id] });
  }

  return choices;
}

export function getRunModifiers(levels: RunUpgradeLevels): RunModifiers {
  const multicastRank = levels.multicast;
  const frostRank = levels['frost-touch'];
  const echoRank = levels['arcane-echo'];

  return {
    damageMultiplier: (1 + levels.potency * 0.18) * Math.pow(0.9, multicastRank),
    castIntervalMultiplier: 1 / (1 + levels.quickening * 0.12),
    projectileSpeedMultiplier: 1,
    moveSpeedMultiplier: 1 + levels.fleetfoot * 0.1,
    maxHealthBonus: levels.vitality * 18,
    extraProjectiles: multicastRank,
    bonusChains: levels['chain-spark'],
    freezeEveryHits: frostRank === 0 ? 0 : 7 - frostRank,
    freezeDuration: frostRank === 0 ? 0 : 0.65 + frostRank * 0.2,
    echoEveryCasts: echoRank === 0 ? 0 : echoRank === 1 ? 7 : 5,
    echoDamageMultiplier: echoRank === 0 ? 0 : echoRank === 1 ? 0.55 : 0.8,
  };
}

export function getRunUpgrade(id: RunUpgradeId): RunUpgradeDefinition {
  const upgrade = runUpgrades.find((candidate) => candidate.id === id);
  if (!upgrade) throw new Error(`Unknown run upgrade: ${id}`);
  return upgrade;
}
