import { selectLightBudget, G4_QUALITY_PROFILES } from './g4-light-budget.js';

const camera = { x: 0, y: 0, halfWidth: 10, halfHeight: 10 };
const settings = { maxLights: 3, maxShadowCost: 6 };
const light = (id, type, priority = 0, x = 0) => ({
  id, type, priority, enabled: true, intensity: 1, position: { x, y: 0 },
  range: 5, castShadow: true
});
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const result = selectLightBudget([
  light('offscreen', 'point', 100, 100),
  light('b', 'spot', 2),
  light('a', 'point', 2),
  light('c', 'directional', 1),
  light('d', 'spot', 0)
], camera, settings);
assert(result.map(x => x.id).join(',') === 'a,b,c', 'stable priority and viewport culling');
assert(result[0].castShadow && !result[1].castShadow && !result[2].castShadow,
  'shadow budget must preserve unshadowed illumination');
assert(result.every(x => x.intensity === 1), 'illumination remains intact');
assert(selectLightBudget([light('a', 'point')], camera, { maxLights: 0, maxShadowCost: 6 }).length === 0,
  'zero active light budget');
console.log('G4 light budget smoke tests passed');

for (const [name, profile] of Object.entries(G4_QUALITY_PROFILES)) {
  assert(Object.isFrozen(profile), name + ' profile must be immutable');
  assert(profile.maxLights > 0 && profile.maxShadowCost > 0, name + ' has valid budgets');
}
const invalid = selectLightBudget([
  { ...light('invalid', 'spot'), intensity: NaN },
  { ...light('valid', 'spot'), priority: Infinity },
  { ...light('missing-position', 'spot'), position: null }
], camera, { maxLights: Infinity, maxShadowCost: NaN });
assert(invalid.length === 0, 'non-finite limits must fail closed');
const noShadow = selectLightBudget([light('point', 'point')], camera, {
  maxLights: 1, maxShadowCost: 0
});
assert(noShadow.length === 1 && !noShadow[0].castShadow, 'light survives zero shadow budget');

const many = Array.from({ length: 200 }, (_, i) => light(String(i).padStart(3, '0'), 'spot', i % 17));
const selected = selectLightBudget(many, camera, { maxLights: 8, maxShadowCost: 2 });
const reference = [...many].sort((a, b) => b.priority - a.priority ||
  String(a.id).localeCompare(String(b.id))).slice(0, 8);
assert(selected.map(x => x.id).join(',') === reference.map(x => x.id).join(','),
  'bounded top-K must match full deterministic sorting');
assert(selectLightBudget(many, camera, { maxLights: 0, maxShadowCost: 0 }).length === 0,
  'bounded top-K handles zero slots');
