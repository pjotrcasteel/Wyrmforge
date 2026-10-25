// Lab-only fixture adapter. G2 will supply authoritative building/school/mastery state.
// Color families follow existing Spellcraft colors and Nexus Death/Binding palettes.
// Intensity endpoints are diagnostic calibration values, not gameplay balance or art approval.
export const SCHOOL_LIGHT_COLORS = Object.freeze({
    fire: '#ff7a36', frost: '#7fd0ff', storm: '#e3cf4f', arcane: '#b887ff', death: '#53a662', binding: '#24a897',
});
export function townFixture({ active, school, mastery }) {
    if (typeof active !== 'boolean' || !Object.hasOwn(SCHOOL_LIGHT_COLORS, school) ||
        !Number.isFinite(mastery) || mastery < 0 || mastery > 1) throw new TypeError('Invalid Town fixture state');
    if (!active) return null;
    return { id: 'town-nexus-fixture', ownerId: 'town-nexus', type: 'point', enabled: true,
        position: [-2, .4, 1.7], direction: [0, 0, -1], color: SCHOOL_LIGHT_COLORS[school],
        intensity: 8 + mastery * 16, range: 8, coneAngle: .55, penumbra: .25, castsShadow: true, priority: 10 };
}
