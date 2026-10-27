// T2-only authored grading of LIGHT DESCRIPTORS; not a Town shader or CSS filter.
// The broad cool fill keeps approved masonry legible; only short-range
// lanterns are warm. Review these numbers against real 320/390px GPU PNGs.
import { validateSnapshot } from './lighting/registry.js';

export const TOWN_NIGHT_LIGHT_GRADE = Object.freeze({
    ambient: .025,
    color: '#9aa5b5',
    dayAmbient: 2.15,
    dayColor: '#fff4e7',
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
        // A physically shaded texture needs substantially more than the
        // shared generic 0.55 ambient to preserve the source-art clarity.
        // Calibration is local to this Town proof, never to the shared engine.
        graded.environment.ambient = TOWN_NIGHT_LIGHT_GRADE.dayAmbient;
        graded.environment.color = TOWN_NIGHT_LIGHT_GRADE.dayColor;
        for (const fixture of graded.lights) fixture.enabled = false;
    } else {
        // Never allow a grading preset to override G1 absolute black.
        if (graded.environment.ambient !== 0 || graded.environment.emission !== false ||
            graded.lights.some(light => light.enabled))
            throw new Error('Town zero-light fixture must remain completely disabled');
    }
    return validateSnapshot(graded);
}
