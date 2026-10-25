// Renderer-independent G4 budget allocation. No simulation state is mutated.
export const G4_QUALITY_PROFILES = Object.freeze({
  low: Object.freeze({ maxLights: 8, maxShadowCost: 6, shadowResolution: 256, maxRenderTargetSize: 1024, reflectionScale: 0.25 }),
  medium: Object.freeze({ maxLights: 16, maxShadowCost: 12, shadowResolution: 512, maxRenderTargetSize: 2048, reflectionScale: 0.5 }),
  high: Object.freeze({ maxLights: 32, maxShadowCost: 24, shadowResolution: 1024, maxRenderTargetSize: 4096, reflectionScale: 1 }),
  diagnostic: Object.freeze({ maxLights: 256, maxShadowCost: 256, shadowResolution: 2048, maxRenderTargetSize: 8192, reflectionScale: 1 })
});

const finiteNonNegative = (value, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, value) : fallback;
const budget = value => Math.floor(finiteNonNegative(value));
const shadowCost = type => type === 'point' ? 6 : type === 'directional' ? 4 : 1;

// Shadow selection is separate from illumination selection: a visible light
// without a shadow allocation still contributes direct light.
export function selectLightBudget(lights, camera, settings) {
  const maxLights = budget(settings.maxLights);
  const maxShadowCost = budget(settings.maxShadowCost);
  const visible = lights.filter(light => {
    if (!light.enabled || !Number.isFinite(light.intensity) || light.intensity <= 0) return false;
    if (light.type === 'directional') return true;
    if (!light.position || !Number.isFinite(light.position.x) || !Number.isFinite(light.position.y)) return false;
    const range = finiteNonNegative(light.range);
    const dx = Math.abs(light.position.x - camera.x);
    const dy = Math.abs(light.position.y - camera.y);
    return dx <= finiteNonNegative(camera.halfWidth) + range &&
      dy <= finiteNonNegative(camera.halfHeight) + range;
  });
  // Keep only the best K candidates; avoid sorting thousands of distant
  // emitters when a mobile quality profile permits only a small active set.
  const compare = (a, b) => (finiteNonNegative(b.priority) - finiteNonNegative(a.priority)) ||
    String(a.id).localeCompare(String(b.id));
  const selected = [];
  for (const light of visible) {
    if (maxLights === 0) break;
    let lo = 0;
    let hi = selected.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(light, selected[mid]) < 0) hi = mid;
      else lo = mid + 1;
    }
    if (lo >= maxLights) continue;
    selected.splice(lo, 0, light);
    if (selected.length > maxLights) selected.pop();
  }
  let remaining = maxShadowCost;
  return selected.map(light => {
    const cost = shadowCost(light.type);
    const castShadow = Boolean(light.castShadow) && remaining >= cost;
    if (castShadow) remaining -= cost;
    return { ...light, castShadow };
  });
}
