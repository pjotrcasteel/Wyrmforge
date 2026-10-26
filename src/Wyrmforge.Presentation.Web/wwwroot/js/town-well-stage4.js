// G4/T2 Stage 4 — authored remade well, NOT a copy of the old painted
// town centrepiece. This module is completely opt-in until the two Stage 3
// binary assets are installed and its actual GPU frames are visually approved.
//
// The underlying 1672x941 plaza is one opaque original-aligned texture;
// only the 255x207 well has alpha. Never overlay transparent cobblestones.
export const WELL_STAGE4 = Object.freeze({
    artSize: [1672, 941],
    sprite: { x: 697, y: 357, width: 255, height: 207 },
    foot: { x: 819, y: 564 },
    light: { x: 917, y: 439 },
    frontDepthY: 564,
    backgroundUrl: 'art/town/stage4-town-square-no-well.png',
    spriteUrl: 'art/town/stage4-remade-well-255x207.png',
});

export const STAGE4_REPLACED_CUTOUT_IDS = Object.freeze([
    'well-roof', 'well-supports', 'well-front-rim',
    'noticeboard-panel', 'noticeboard-supports',
]);

// These are *sprite-local* shadow proxies drawn against the approved remade
// object, NOT collision geometry or the original gigantic well/front-rim trace.
// No ground/floor/foundation/barrel/flower shape is allowed into this atlas.
export const WELL_STAGE4_CASTER_PATHS = Object.freeze({
    // Tighter roof: Stage 3 artist geometry, with NO caster in empty sky.
    roof: [[111, 52], [132, 21], [140, 18], [213, 36], [238, 57],
        [235, 65], [218, 58], [206, 79], [198, 82], [111, 59]],
    leftPost: [[129, 73], [143, 72], [143, 129], [131, 133]],
    rightPost: [[202, 76], [215, 77], [215, 138], [202, 135]],
    boardLeftPost: [[18, 84], [29, 82], [30, 155], [19, 159]],
    boardRightPost: [[106, 51], [115, 53], [113, 158], [105, 156]],
});

export const STAGE4_SHADOW_EXTRUSION = .035;

function finiteVec3(point, label) {
    if (!Array.isArray(point) || point.length !== 3 || point.some(x => !Number.isFinite(x)))
        throw new TypeError('Invalid authored ' + label);
    return point;
}

function moved(project, toward, x, y, depth) {
    const at = finiteVec3(project(x, y), 'well projection');
    finiteVec3(toward, 'camera direction');
    if (Math.abs(Math.hypot(...toward) - 1) > 1e-4)
        throw new RangeError('Stage 4 requires a unit-length camera direction');
    return at.map((v, i) => v + toward[i] * depth);
}

export function stage4WellLayer(project, toward) {
    const b = WELL_STAGE4.sprite;
    return {
        id: 'stage4-remade-well', ownerId: 'town-stage4',
        geometry: 'stage4-well-plane',
        occluderGeometry: 'stage4-well-caster-proxies',
        artBounds: [b.x, b.y, b.width, b.height],
        material: 'stage4-well-material',
        position: moved(project, toward, b.x + b.width / 2, b.y + b.height / 2, .09),
        rotation: [0, 0, 0], scale: [1, 1, 1],
        castsShadow: true, receivesShadow: true,
    };
}

export function stage4WellMaterial() {
    return {
        id: 'stage4-well-material', color: '#ffffff',
        albedo: 'stage4-well-albedo', emission: '#000000',
        emissionIntensity: 0, // lamp light is an ENGINE FIXTURE, not baked into RGB
        roughness: .91, metalness: 0, specular: .08,
        reflection: 'off', alphaCutoff: .5, doubleSided: true,
    };
}

export function stage4WellLight(project, toward, { offset = 0, enabled = true } = {}) {
    if (!Number.isFinite(offset) || Math.abs(offset) > 250 || typeof enabled !== 'boolean')
        throw new RangeError('Invalid Stage 4 well-lantern controls');
    const { x, y } = WELL_STAGE4.light;
    return {
        id: 'stage4-well-lantern', ownerId: 'town-stage4',
        type: 'spot', enabled, color: '#ffcf96', intensity: 1.35,
        position: moved(project, toward, x + offset, y, .21),
        direction: [0, 0, -1], range: 2.6,
        coneAngle: .53, penumbra: .7,
        castsShadow: true, priority: 4,
        artAnchor: [x + offset, y],
    };
}

export function stage4CasterGeometry(Three, basis) {
    if (typeof Three.Shape !== 'function' || typeof Three.ExtrudeGeometry !== 'function')
        throw new TypeError('Missing THREE authored-shadow geometry');
    const shapes = [];
    const unit = 16 / WELL_STAGE4.artSize[0];
    const { width, height } = WELL_STAGE4.sprite;
    for (const points of Object.values(WELL_STAGE4_CASTER_PATHS)) {
        const shape = new Three.Shape();
        points.forEach(([x, y], i) => {
            if (x < 0 || x > width || y < 0 || y > height)
                throw new RangeError('Stage 4 caster outside sprite boundary');
            const px = (x - width / 2) * unit;
            const py = (height / 2 - y) * unit;
            if (!i) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        });
        shape.closePath();
        shapes.push(shape);
    }
    const result = new Three.ExtrudeGeometry(shapes, {
        depth: STAGE4_SHADOW_EXTRUSION, steps: 1,
        bevelEnabled: false, curveSegments: 1,
    });
    result.applyMatrix4(basis);
    return result;
}
