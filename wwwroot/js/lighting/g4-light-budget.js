// G4: deterministic, renderer-independent light budget selection.
// A light may lose shadow allocation without losing illumination.
export function selectLightBudget(lights, camera, settings) {
  const maxLights = Math.max(0, Math.floor(settings.maxLights));
  const maxShadowCost = Math.max(0, Math.floor(settings.maxShadowCost));
  const visible = lights.filter(light => {
    if (!light.enabled || light.intensity <= 0) return false;
    if (light.type === 'directional') return true;
    const dx = light.position.x - camera.x;
    const dy = light.position.y - camera.y;
    return Math.abs(dx) <= camera.halfWidth + light.range &&
      Math.abs(dy) <= camera.halfHeight + light.range;
  });
  visible.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) ||
    String(a.id).localeCompare(String(b.id)));
  let remaining = maxShadowCost;
  return visible.slice(0, maxLights).map(light => {
    const cost = light.type === 'point' ? 6 : light.type === 'directional' ? 4 : 1;
    const castShadow = Boolean(light.castShadow) && remaining >= cost;
    if (castShadow) remaining -= cost;
    return { ...light, castShadow };
  });
}
