// Shared renderer-owned quality budgets. Scene assets cannot choose shadow cost.
// The balanced tier preserves the existing opt-in Hunt GPU settings.
const TIERS = Object.freeze({
    mobile: Object.freeze({ maxLights: 6, shadowViews: 6, shadowMapSize: 256 }),
    balanced: Object.freeze({ maxLights: 8, shadowViews: 6, shadowMapSize: 512 }),
    high: Object.freeze({ maxLights: 12, shadowViews: 8, shadowMapSize: 1024 }),
});

/** Returns a copy; caller cannot mutate the canonical renderer profiles. */
export function lightingQualityBudget(tier = 'balanced') {
    if (!Object.hasOwn(TIERS, tier)) throw new RangeError('Unknown GPU lighting quality');
    return { ...TIERS[tier] };
}
