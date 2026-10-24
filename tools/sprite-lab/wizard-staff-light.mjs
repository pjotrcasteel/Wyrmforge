/** Character-only lighting descriptors for PR #332's generic LightEmitter and LitMaterial.
 * This module has no own renderer or clock. Connect only after game/snapshot integration.
 */
export const WIZARD_STAFF_SCHOOLS = Object.freeze({
    fire: '#c66a42', frost: '#8bbfd3', storm: '#e3be52',
    arcane: '#a281ce', necromancer: '#8da66a', summoner: '#b99660',
});

const smoothstep = value => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
};

/** The first 23% is windup, before spell release: charge must be visible already. */
export function wizardStaffCharge(castMotion) {
    const progress = castMotion?.progress;
    if (!Number.isFinite(progress) || progress < 0 || progress >= 1) return 0;
    if (progress < .23) return .70 * smoothstep(progress / .23);
    if (progress < .46) return .70 + .30 * smoothstep((progress - .23) / .23);
    if (progress < .78) return 1;
    return 1 - smoothstep((progress - .78) / .22);
}

/** Data conforms to #332 lighting/contracts.d.ts. This does NOT install a scene light. */
export function wizardStaffLightDescriptors({ ownerId, school, staffTip, castMotion }) {
    if (!ownerId || typeof ownerId !== 'string') throw new TypeError('Owner ID required');
    const color = WIZARD_STAFF_SCHOOLS[school];
    if (!color) throw new RangeError('Unrecognised wizard school');
    if (!Array.isArray(staffTip) || staffTip.length !== 3 || !staffTip.every(Number.isFinite))
        throw new TypeError('Staff tip must be pose-correct world-space XYZ in metres');
    const charge = wizardStaffCharge(castMotion);
    return {
        emitter: {
            id: `${ownerId}:staff`, ownerId, type: 'point', enabled: charge > 0,
            position: [...staffTip], direction: [0, 0, -1], color,
            intensity: 8 * charge, range: 2.8, coneAngle: 0, penumbra: 0,
            castsShadow: true, priority: 6,
        },
        material: {
            id: `${ownerId}:staff-emissive`, color,
            emission: color, emissionIntensity: charge * 1.8,
            roughness: .72, metalness: .1, specular: .25,
            reflection: 'off', alphaCutoff: .5, doubleSided: true,
        },
        charge,
    };
}
