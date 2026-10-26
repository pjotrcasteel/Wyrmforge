// T2-only authored grading of LIGHT DESCRIPTORS; not a Town shader or CSS filter.
// The broad cool fill keeps approved masonry legible; only short-range
// lanterns are warm. Review these numbers against real 320/390px GPU PNGs.
import { validateSnapshot } from './lighting/registry.js';

export const TOWN_NIGHT_LIGHT_GRADE = Object.freeze({
    ambient: .22,
    color: '#b3c3df',
    lanternColor: '#ffdab7',
    centralIntensity: 2.5,
    peripheralIntensity: 1.45,
    range: 3.7,
});

export function gradeTownPreviewLighting(snapshot, mode) {
    if (!['day', 'night', 'zero'].includes(mode))
        throw new TypeError('Unknown Town environment grade');
    const graded = structuredClone(snapshot);
    if (mode === 'night') {
        graded.environment.ambient = TOWN_NIGHT_LIGHT_GRADE.ambient;
        graded.environment.color = TOWN_NIGHT_LIGHT_GRADE.color;
    } else if (mode === 'day') {
        // The original reference already has painted daylight. No giant
        // synthetic warm pools during daytime.
        for (const fixture of graded.lights) fixture.enabled = false;
    } else {
        // Never allow a grading preset to override G1 absolute black.
        if (graded.environment.ambient !== 0 || graded.environment.emission !== false ||
            graded.lights.some(light => light.enabled))
            throw new Error('Town zero-light fixture must remain completely disabled');
    }
    return validateSnapshot(graded);
}
