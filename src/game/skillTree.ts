export type NodeTier = 'minor' | 'major' | 'epic' | 'legendary';
export type School = 'fire' | 'frost' | 'storm' | 'arcane';

export interface SkillNode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tier: NodeTier;
  readonly school: School;
  readonly cost: number;
  readonly requires: readonly string[];
  readonly excludes?: readonly string[];
}

export const TOTAL_META_POINTS = 14;

export const skillNodes: readonly SkillNode[] = [
  { id: 'fire-1', name: 'Ember', description: '+5% spell damage.', tier: 'minor', school: 'fire', cost: 1, requires: [] },
  { id: 'fire-2', name: 'Kindling', description: '+5% spell damage.', tier: 'minor', school: 'fire', cost: 1, requires: ['fire-1'] },
  { id: 'fire-major', name: 'Pyromantic Focus', description: 'Total spell damage ×1.25.', tier: 'major', school: 'fire', cost: 2, requires: ['fire-2'] },
  { id: 'wildfire', name: 'Wildfire', description: 'Hits splash 35% damage to nearby enemies.', tier: 'epic', school: 'fire', cost: 3, requires: ['fire-major'], excludes: ['detonation'] },
  { id: 'detonation', name: 'Detonation', description: 'Every 4th hit explodes for ×2 damage.', tier: 'epic', school: 'fire', cost: 3, requires: ['fire-major'], excludes: ['wildfire'] },
  { id: 'inferno', name: "Dragon's Inferno", description: 'Every 5th cast becomes a ×4 Inferno projectile.', tier: 'legendary', school: 'fire', cost: 5, requires: ['wildfire'] },
  { id: 'volcanic', name: 'Volcanic Heart', description: 'Explosions are larger and deal ×2.5 damage.', tier: 'legendary', school: 'fire', cost: 5, requires: ['detonation'] },
  { id: 'frost-1', name: 'Rime', description: '+4 max health.', tier: 'minor', school: 'frost', cost: 1, requires: [] },
  { id: 'frost-2', name: 'Permafrost', description: '+4 max health.', tier: 'minor', school: 'frost', cost: 1, requires: ['frost-1'] },
  { id: 'frost-major', name: 'Glacial Core', description: 'Damage taken ×0.85.', tier: 'major', school: 'frost', cost: 2, requires: ['frost-2'] },
  { id: 'deep-freeze', name: 'Deep Freeze', description: 'Every 4th hit freezes its target briefly.', tier: 'epic', school: 'frost', cost: 3, requires: ['frost-major'], excludes: ['ice-armor'] },
  { id: 'ice-armor', name: 'Ice Armor', description: 'Taking damage grants a short barrier.', tier: 'epic', school: 'frost', cost: 3, requires: ['frost-major'], excludes: ['deep-freeze'] },
  { id: 'absolute-zero', name: 'Absolute Zero', description: 'Frozen enemies take double damage.', tier: 'legendary', school: 'frost', cost: 5, requires: ['deep-freeze'] },
  { id: 'winter-shell', name: 'Winter Shell', description: 'Barrier absorbs one full hit and recharges.', tier: 'legendary', school: 'frost', cost: 5, requires: ['ice-armor'] },
  { id: 'storm-1', name: 'Static', description: '+4% cast speed.', tier: 'minor', school: 'storm', cost: 1, requires: [] },
  { id: 'storm-2', name: 'Surge', description: '+4% cast speed.', tier: 'minor', school: 'storm', cost: 1, requires: ['storm-1'] },
  { id: 'storm-major', name: 'Stormheart', description: 'Cast interval ×0.75.', tier: 'major', school: 'storm', cost: 2, requires: ['storm-2'] },
  { id: 'chainstorm', name: 'Chainstorm', description: 'Projectiles chain once after a kill.', tier: 'epic', school: 'storm', cost: 3, requires: ['storm-major'], excludes: ['tempest-step'] },
  { id: 'tempest-step', name: 'Tempest Step', description: 'Moving builds speed up to +25%.', tier: 'epic', school: 'storm', cost: 3, requires: ['storm-major'], excludes: ['chainstorm'] },
  { id: 'living-storm', name: 'Living Storm', description: 'Chains may continue through up to 4 enemies.', tier: 'legendary', school: 'storm', cost: 5, requires: ['chainstorm'] },
  { id: 'lightning-form', name: 'Lightning Form', description: 'At full movement momentum, casts ×1.5 faster.', tier: 'legendary', school: 'storm', cost: 5, requires: ['tempest-step'] },
  { id: 'arcane-1', name: 'Focus', description: '+5% projectile speed.', tier: 'minor', school: 'arcane', cost: 1, requires: [] },
  { id: 'arcane-2', name: 'Flow', description: '+5% projectile speed.', tier: 'minor', school: 'arcane', cost: 1, requires: ['arcane-1'] },
  { id: 'arcane-major', name: 'Arcane Reservoir', description: 'Projectile speed ×1.3.', tier: 'major', school: 'arcane', cost: 2, requires: ['arcane-2'] },
  { id: 'arcane-echo', name: 'Arcane Echo', description: 'Every 6th cast fires a free echo.', tier: 'epic', school: 'arcane', cost: 3, requires: ['arcane-major'], excludes: ['prismatic'] },
  { id: 'prismatic', name: 'Prismatic Volley', description: 'Every 5th cast fires 3 projectiles.', tier: 'epic', school: 'arcane', cost: 3, requires: ['arcane-major'], excludes: ['arcane-echo'] },
  { id: 'echo-chamber', name: 'Echo Chamber', description: 'Echoes deal full damage and may echo again once.', tier: 'legendary', school: 'arcane', cost: 5, requires: ['arcane-echo'] },
  { id: 'astral-barrage', name: 'Astral Barrage', description: 'Prismatic Volley fires 5 projectiles.', tier: 'legendary', school: 'arcane', cost: 5, requires: ['prismatic'] },
];

export function getNode(id: string): SkillNode {
  const node = skillNodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown skill node: ${id}`);
  return node;
}

export function spentPoints(selected: ReadonlySet<string>): number {
  return [...selected].reduce((total, id) => total + getNode(id).cost, 0);
}

export function canSelectNode(node: SkillNode, selected: ReadonlySet<string>): boolean {
  if (selected.has(node.id)) return false;
  if (spentPoints(selected) + node.cost > TOTAL_META_POINTS) return false;
  if (!node.requires.every((required) => selected.has(required))) return false;
  if (node.excludes?.some((excluded) => selected.has(excluded))) return false;
  if (node.tier === 'legendary' && [...selected].some((id) => getNode(id).tier === 'legendary')) return false;
  return true;
}

export function canRemoveNode(node: SkillNode, selected: ReadonlySet<string>): boolean {
  if (!selected.has(node.id)) return false;
  return !skillNodes.some((candidate) => selected.has(candidate.id) && candidate.requires.includes(node.id));
}
