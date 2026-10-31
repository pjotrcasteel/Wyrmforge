/**
 * Lighting Engine 0.1: a scene-composition adapter, not a second light engine.
 * AR4/AR5/WF32 can register texture and geometry resources on HuntGpuWorld,
 * then submit these same typed surfaces against the authoritative C# frame.
 * Neither this adapter nor the optional torch art generates light sources.
 */
export function lighting01Requested(params) {
    return params.get('arenaGpu') === '1' && params.get('lighting01') === '1';
}

export function submitLighting01Surfaces(world, surfaces) {
    if (!world || typeof world.submitSurface !== 'function' || !Array.isArray(surfaces))
        throw new TypeError('Lighting 0.1 requires a begun shared HuntGpuWorld and a surface list');
    const ids = new Set();
    for (const surface of surfaces) {
        const { renderable, material } = surface ?? {};
        if (!renderable?.id || !renderable?.ownerId || !material?.id ||
            renderable.material !== material.id || ids.has(renderable.id))
            throw new TypeError('Lighting 0.1 surfaces need unique IDs, owners and matching materials');
        ids.add(renderable.id);
    }
    // Validate the entire submission before mutating the shared frame.
    for (const { renderable, material } of surfaces)
        world.submitSurface(renderable, material);
    return ids.size;
}

/** The fixture list and matching emitter both originate in one C# arena tick.
 * Missing/mismatched state is skipped safely; no guessed JS firelight is added.
 */
export function lighting01FixtureSpecs(environment, frame, worldWidth, worldHeight) {
    if (!environment?.wetForest?.lightFixtures || !frame?.lights) return [];
    if (!(worldWidth > 0 && worldHeight > 0)) return [];
    const emitters = new Map(frame.lights.map(light => [light.id, light]));
    return environment.wetForest.lightFixtures.flatMap(fixture => {
        const emitter = emitters.get(fixture.id);
        if (fixture.kind !== 'torch' || !emitter?.enabled || emitter.ownerId !== fixture.id ||
            emitter.type !== 'point' || !Number.isFinite(fixture.x) || !Number.isFinite(fixture.y) ||
            fixture.x < 0 || fixture.x > 1 || fixture.y < 0 || fixture.y > 1 ||
            !Number.isFinite(fixture.height) || fixture.height <= 0 ||
            Math.abs(emitter.position?.[0] - fixture.x * worldWidth) > .01 ||
            Math.abs(emitter.position?.[1] - fixture.y * worldHeight) > .01) return [];
        return [{ id: fixture.id, x: emitter.position[0], y: emitter.position[1],
            height: fixture.height, color: emitter.color }];
    });
}

// Provisional source-pixel diagnostic artwork. A native WF32 authored torch
// atlas can replace this texture without altering the source or surface APIs.
function torchSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 24;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3a2b24'; ctx.fillRect(7, 10, 3, 13);
    ctx.fillStyle = '#91775c'; ctx.fillRect(7, 12, 1, 8);
    ctx.fillStyle = '#695546'; ctx.fillRect(4, 9, 9, 3);
    ctx.fillStyle = '#d65427'; ctx.fillRect(6, 3, 5, 7);
    ctx.fillStyle = '#ff9b39'; ctx.fillRect(7, 4, 4, 5);
    ctx.fillStyle = '#ffe0a1'; ctx.fillRect(8, 6, 2, 3);
    ctx.fillStyle = '#ffb65c'; ctx.fillRect(9, 1, 1, 3);
    return canvas;
}

let cachedTorch;
/** Called between begin() and render() on the *existing* HuntGpuWorld. */
export function submitLighting01Fixtures(world, environment, frame, camera, worldWidth, worldHeight) {
    const fixtures = lighting01FixtureSpecs(environment, frame, worldWidth, worldHeight);
    if (!fixtures.length) return 0;
    cachedTorch ??= torchSprite();
    for (const fixture of fixtures) {
        const id = `lighting01:fixture:${fixture.id}`;
        world.capture(id, cachedTorch, fixture.x - camera.x - 8, fixture.y - camera.y - 23,
            16, 24, 0, false, {
                geometry: 'hunt-billboard', standing: true, revision: 'g5-01-torch-pixels-v1',
                ownerId: fixture.id,
                receivesLight: true,
                material: { roughness: .78, emission: fixture.color, emissionIntensity: .3 },
            });
    }
    return fixtures.length;
}
