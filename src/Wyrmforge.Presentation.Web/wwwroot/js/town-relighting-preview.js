// Non-production GPU material/projection proof using *exact* approved Town pixels.
// Input day-active.webp is a PAINTED reference, not approved neutral albedo.
// Do not use this page as a visual acceptance or claim T2 completion.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { compileTownLightingSnapshot, TOWN_ART_SIZE } from './town-relightable-scene.js';
import { CUTOUTS } from './refuge-foreground-cutouts.js';
import { splitTownPavingReference, levelPavingNormal } from './town-paving-material.js';
import { projectTownCitizens, TOWN_CITIZEN_ART_WIDTH, TOWN_CITIZEN_ART_HEIGHT } from './town-citizen-gpu-bridge.js';

export const TOWN_PREVIEW_SOURCE = 'art/town/day-active.webp';
const BASE_WIDTH = 16;
const BASE_HEIGHT = BASE_WIDTH * TOWN_ART_SIZE[1] / TOWN_ART_SIZE[0];
const states = new WeakMap();

const material = (id, albedo, extra = {}) => ({
    id, albedo, color: '#ffffff', emission: '#000000', emissionIntensity: 0,
    roughness: .9, metalness: 0, specular: .1, reflection: 'off',
    alphaCutoff: .5, doubleSided: true, ...extra,
});

function axes() {
    // Identical projection to LightingEngine.setCamera([0,0,0]); keeps the
    // painting's perspective baked into ART, never warps approved geometry.
    const toward = new T.Vector3(8, -12, 12).normalize();
    const right = new T.Vector3(0, 0, 1).cross(toward).normalize();
    const up = toward.clone().cross(right).normalize();
    return { right, up, toward, basis: new T.Matrix4().makeBasis(right, up, toward) };
}

export function townPreviewProjection(x, y) {
    const a = axes();
    return a.right.multiplyScalar((x / TOWN_ART_SIZE[0] - .5) * BASE_WIDTH)
        .addScaledVector(a.up, (.5 - y / TOWN_ART_SIZE[1]) * BASE_HEIGHT).toArray();
}

function plane(width, height, basis) {
    const geometry = new T.PlaneGeometry(width, height);
    geometry.applyMatrix4(basis);
    return geometry;
}

function cutoutGeometry(cutout, basis) {
    // These are hand-traced foreground paths already used by production NPC
    // masks; NOT collision polygons or guessed height from RGB.
    const tokens = cutout.path.match(/[MLZ]|-?\d+(?:\.\d+)?/gi);
    if (!tokens) throw new TypeError('Missing approved Town foreground path');
    const shapes = [];
    const u = BASE_WIDTH / TOWN_ART_SIZE[0], cx = cutout.x + cutout.width / 2,
        cy = cutout.y + cutout.height / 2;
    let shape = null, index = 0;
    while (index < tokens.length) {
        const op = tokens[index++];
        if (op === 'Z') { shape?.closePath(); continue; }
        if (op !== 'M' && op !== 'L') throw new TypeError('Unsupported foreground path command');
        const x = Number(tokens[index++]), y = Number(tokens[index++]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Invalid authored foreground point');
        if (op === 'M') { shape = new T.Shape(); shapes.push(shape); shape.moveTo((x - cx) * u, (cy - y) * u); }
        else if (shape) shape.lineTo((x - cx) * u, (cy - y) * u);
        else throw new TypeError('Foreground path must start with M');
    }
    if (!shapes.length) throw new TypeError('No foreground silhouette');
    const geometry = new T.ShapeGeometry(shapes);
    geometry.applyMatrix4(basis);
    return geometry;
}

function cutoutTexture(source, cutout) {
    const canvas = document.createElement('canvas');
    canvas.width = cutout.width; canvas.height = cutout.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, cutout.x, cutout.y, cutout.width, cutout.height,
        0, 0, cutout.width, cutout.height);
    context.globalCompositeOperation = 'destination-in';
    context.translate(-cutout.x, -cutout.y);
    context.fill(new Path2D(cutout.path));
    return new T.CanvasTexture(canvas);
}

function light(id, x, y, height, color, intensity, enabled = true) {
    const a = axes(), p = new T.Vector3(...townPreviewProjection(x, y))
        .addScaledVector(a.toward, height);
    return {
        id, ownerId: id, type: 'point', enabled, color, intensity,
        position: p.toArray(), direction: [0, 0, -1], range: 5,
        coneAngle: .55, penumbra: .3, castsShadow: true, priority: 1,
        artAnchor: [x, y],
    };
}

export function townPreviewManifest() {
    const a = axes();
    const layers = [{
        id: 'canonical-day-reference', ownerId: 'canonical-town', geometry: 'approved-panorama-plane',
        artBounds: [0, 0, ...TOWN_ART_SIZE], material: 'approved-day-reference',
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1],
        castsShadow: false, receivesShadow: true,
    }];
    // Opaque architecture/reference painting and independent paving now share
    // complementary alpha masks. Only paving receives the authored level-ground
    // normal. No RGB-to-normal or RGB-to-geometry inference.
    const materials = [
        material('approved-day-reference', 'town-day-background'),
        material('town-level-paving', 'town-day-paving', {
            normal: 'town-paving-flat-normal', roughness: .87, specular: .16,
        }),
    ];
    layers.push({
        id: 'town-central-paving', ownerId: 'canonical-town-paving',
        geometry: 'approved-panorama-plane', artBounds: [0, 0, ...TOWN_ART_SIZE],
        material: 'town-level-paving',
        position: new T.Vector3().addScaledVector(a.toward, .015).toArray(),
        rotation: [0, 0, 0], scale: [1, 1, 1], castsShadow: false, receivesShadow: true,
    });
    const fixtures = [
        light('noticeboard-lantern', 902, 465, 1.1, '#ffc58e', 11),
        light('north-west-lantern', 552, 373, 1.2, '#ffc58e', 7),
        light('east-lantern', 1111, 373, 1.2, '#ffc58e', 7),
    ];
    for (const cutout of CUTOUTS) {
        const position = new T.Vector3(...townPreviewProjection(
            cutout.x + cutout.width / 2, cutout.y + cutout.height / 2))
            .addScaledVector(a.toward, .09).toArray();
        layers.push({
            id: 'foreground-' + cutout.id, ownerId: 'canonical-town-foreground',
            geometry: 'approved-cutout-plane-' + cutout.id,
            occluderGeometry: 'approved-foreground-caster-' + cutout.id,
            artBounds: [cutout.x, cutout.y, cutout.width, cutout.height],
            material: 'approved-cutout-material-' + cutout.id,
            position, rotation: [0, 0, 0], scale: [1, 1, 1],
            castsShadow: true, receivesShadow: true,
        });
        materials.push(material('approved-cutout-material-' + cutout.id,
            'approved-cutout-texture-' + cutout.id));
    }
    return { version: 1, artSize: [...TOWN_ART_SIZE], layers, materials, fixtures };
}

async function loadApprovedImage() {
    const image = new Image();
    image.src = new URL('../art/town/day-active.webp', import.meta.url).href;
    await image.decode();
    if (image.naturalWidth !== TOWN_ART_SIZE[0] || image.naturalHeight !== TOWN_ART_SIZE[1])
        throw new Error('Approved Town source resolution changed; reject visual drift');
    return image;
}

/** The only side effect is an isolated canvas, never live Town runtime. */
export async function initializeTownPreview(canvas) {
    if (states.has(canvas)) return;
    const engine = new LightingEngine(canvas, { shadowViews: 8, maxLights: 8, maxFramebufferWidth: 780 });
    const state = { engine, mode: 'night', lamps: true, offset: 0, npcEnabled: true, npcProgress: 0, alive: true };
    states.set(canvas, state);
    try {
        const a = axes(), source = await loadApprovedImage();
        engine.registerGeometry('approved-panorama-plane', plane(BASE_WIDTH, BASE_HEIGHT, a.basis));
        // Existing Town CSS NPC silhouettes rendered by the same shared engine.
        // This is diagnostic Town behavior, not new or approved character art.
        engine.registerGeometry('town-citizen-css-rectangle', plane(
            TOWN_CITIZEN_ART_WIDTH * BASE_WIDTH / TOWN_ART_SIZE[0],
            TOWN_CITIZEN_ART_HEIGHT * BASE_WIDTH / TOWN_ART_SIZE[0], a.basis));
        const separated = splitTownPavingReference(source, CUTOUTS);
        engine.registerTexture('town-day-background', new T.CanvasTexture(separated.backdrop));
        engine.registerTexture('town-day-paving', new T.CanvasTexture(separated.floor));
        const normal = levelPavingNormal(a.right, a.up, a.toward);
        const normalTexture = new T.DataTexture(normal, 1, 1, T.RGBAFormat);
        normalTexture.needsUpdate = true;
        engine.registerTexture('town-paving-flat-normal', normalTexture, false);
        for (const cutout of CUTOUTS) {
            const size = BASE_WIDTH / TOWN_ART_SIZE[0];
            engine.registerGeometry('approved-cutout-plane-' + cutout.id,
                plane(cutout.width * size, cutout.height * size, a.basis));
            engine.registerGeometry('approved-foreground-caster-' + cutout.id, cutoutGeometry(cutout, a.basis));
            engine.registerTexture('approved-cutout-texture-' + cutout.id, cutoutTexture(source, cutout));
        }
        state.manifest = townPreviewManifest();
        engine.setCamera([0, 0, 0], 8.16);
        configureTownPreview(canvas, {});
        canvas.dataset.ready = 'true';
        state.resize = new ResizeObserver(() => configureTownPreview(canvas, {}));
        state.resize.observe(canvas);
    } catch (error) {
        canvas.dataset.error = error.message;
        disposeTownPreview(canvas);
        throw error;
    }
}

export function configureTownPreview(canvas, options) {
    const state = states.get(canvas);
    if (!state?.alive || !state.manifest) return;
    Object.assign(state, options);
    if (!['day', 'night', 'zero'].includes(state.mode) ||
        !Number.isFinite(state.offset) || Math.abs(state.offset) > 250 ||
        !Number.isFinite(state.npcProgress) || state.npcProgress < 0 || state.npcProgress > 1 ||
        typeof state.npcEnabled !== 'boolean')
        throw new RangeError('Invalid Town proof control');
    const manifest = structuredClone(state.manifest);
    const citizenY = 483 + state.npcProgress * 140;
    const actor = projectTownCitizens([{ id: 1, feet: [864, citizenY], isPresent: true }],
        townPreviewProjection, axes().toward.toArray(), { enabled: state.npcEnabled });
    manifest.layers.push(...actor.layers);
    manifest.materials.push(...actor.materials);
    const moved = manifest.fixtures.find(f => f.id === 'noticeboard-lantern');
    const modified = light(moved.id, moved.artAnchor[0] + state.offset,
        moved.artAnchor[1], 1.1, '#ffc58e', 11, state.lamps);
    Object.assign(moved, modified);
    for (const fixture of manifest.fixtures) fixture.enabled &&= state.lamps;
    const snapshot = compileTownLightingSnapshot(manifest, {
        state: {}, mode: state.mode, localHour: 12, time: 0,
    });
    state.engine.apply(snapshot);
    state.engine.setCamera([0, 0, 0], 8.16);
    state.engine.render(canvas.clientWidth || 1000, canvas.clientHeight || 564);
    if (state.mode === 'zero') {
        // Actual framebuffer check: no ambient, fixtures, or emission is allowed
        // to leave any non-black world pixel. Alpha is intentionally ignored.
        const pixels = state.engine.pixels();
        let litPixels = 0;
        for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] || pixels[i + 1] || pixels[i + 2]) litPixels++;
        canvas.dataset.zeroBlack = (litPixels === 0).toString();
        if (litPixels) throw new Error(`Zero-light proof leaked ${litPixels} world pixels`);
    } else delete canvas.dataset.zeroBlack;
    canvas.dataset.npcFeetY = state.npcEnabled ? citizenY.toFixed(2) : 'hidden';
    canvas.dataset.npcShadowCasters = actor.layers.filter(a => a.castsShadow).length.toString();
    canvas.dataset.profile = state.mode;
    canvas.dataset.fixtureCount = snapshot.lights.filter(l => l.enabled).length.toString();
}

export function disposeTownPreview(canvas) {
    const state = states.get(canvas);
    if (!state) return;
    state.alive = false;
    state.resize?.disconnect();
    state.engine.dispose();
    states.delete(canvas);
}
