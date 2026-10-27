// Non-production GPU material/projection proof using *exact* approved Town pixels.
// Input day-active.webp is a PAINTED reference, not approved neutral albedo.
// Do not use this page as a visual acceptance or claim T2 completion.
import * as T from './lighting/vendor/three.module.js';
import { LightingEngine } from './lighting/engine.js';
import { compileTownLightingSnapshot, TOWN_ART_SIZE } from './town-relightable-scene.js';
import { CUTOUTS } from './refuge-foreground-cutouts.js';
import {
    WELL_STAGE4, STAGE4_REPLACED_CUTOUT_IDS, stage4WellLayer, stage4WellMaterial,
    stage4WellLight, stage4CasterGeometry,
} from './town-well-stage4.js';
import { splitTownPavingReference, softenTownPavingBoundary, levelPavingNormal } from './town-paving-material.js';
import { deriveTownNeutralPavingCanvas } from './town-neutral-albedo.js';
import { TOWN_NIGHT_LIGHT_GRADE, gradeTownPreviewLighting } from './town-lighting-grade.js';
import { createTownDomainFixtures, configureTownLightDomains, TOWN_LIGHT_ISOLATIONS, TOWN_NEXUS_SCHOOL_LIGHTS } from './town-light-domains.js';
import { TOWN_EMISSION_PLATES, TOWN_APERTURE_PLATES, emissionMaskPixels, commonAperturePixels } from './town-emission-masks.js';
import { liftTownReferencePixels } from './town-building-neutral-albedo.js';
import { clipTownNightSilhouette } from './town-night-silhouette.js';
import { townDomainSnapshot, applyTownPreviewEnvironment } from './town-preview-state.js';
import { projectTownCitizens, TOWN_CITIZEN_ART_WIDTH, TOWN_CITIZEN_ART_HEIGHT } from './town-citizen-gpu-bridge.js';

export const TOWN_PREVIEW_SOURCE = 'art/town/day-active.webp';
// Equal orthographic width and art-plane width is essential: the old
// 8.16 half-width shrank the canonical image by 1.96% (16.4 original
// artwork pixels per side), visibly misaligning C# Town hotspots/NPCs.
const BASE_WIDTH = 16;
const BASE_HEIGHT = BASE_WIDTH * TOWN_ART_SIZE[1] / TOWN_ART_SIZE[0];
const states = new WeakMap();

// Small authored shadow PROXIES for the actual production foreground contours.
// Distances are along camera-facing depth, not NPC collision footprints.
// These are isolated lab values pending mobile screenshot approval.
export const TOWN_FOREGROUND_CASTER_DEPTH = Object.freeze({
    'noticeboard-panel': .14,
    'noticeboard-supports': .09,
    'well-roof': .22,
    'well-supports': .10,
    'well-front-rim': .16,
    'nexus-terrace-parapet': .10,
    'nexus-terrace-bushes': .07,
    'nexus-stairs-shrubs': .06,
});

const material = (id, albedo, extra = {}) => ({
    id, albedo, color: '#ffffff', emission: '#000000', emissionIntensity: 0,
    roughness: .9, metalness: 0, specular: .1, reflection: 'off',
    alphaCutoff: .5, doubleSided: true, ...extra,
});

// T2-only alpha corrections traced against original 1672x941 source pixels.
// The production NPC masks remain untouched. These tighter paths exclude the
// surrounding paving that previously appeared as a bright cut-paper halo.
const DOMAIN_FOREGROUND_PATHS = Object.freeze({
    'noticeboard-panel': 'M738 444 L745 443 L745 447 L794 430 L798 423 L805 424 L809 430 L805 436 L804 484 L797 491 L746 509 L738 505 Z',
    'noticeboard-supports': 'M737 446 L747 444 L747 531 L741 537 L737 534 Z M797 427 L807 426 L805 529 L798 533 L796 529 Z',
    'well-roof': 'M810 435 L820 420 L827 410 L825 401 L824 395 L829 390 L834 393 L834 400 L832 405 L837 410 L899 429 L902 423 L909 425 L911 432 L923 444 L922 449 L914 449 L907 445 L909 453 L896 451 L891 458 L872 453 L832 446 L819 444 L816 447 L810 441 Z',
    'well-supports': 'M830 444 L840 446 L840 495 L830 499 Z M879 452 L890 454 L891 505 L880 509 Z',
    'well-front-rim': 'M718 514 L733 505 L751 501 L772 509 L794 518 L818 520 L843 518 L872 515 L891 498 L908 502 L919 513 L932 519 L938 532 L930 547 L916 556 L887 561 L843 563 L786 561 L754 557 L735 551 L718 539 Z',
});
function domainForeground(cutouts, domains) {
    return cutouts.map(cutout => domains && DOMAIN_FOREGROUND_PATHS[cutout.id]
        ? { ...cutout, path: DOMAIN_FOREGROUND_PATHS[cutout.id] } : cutout);
}

function axes() {
    // Identical projection to LightingEngine.setCamera([0,0,0]); keeps the
    // painting's perspective baked into ART, never warps approved geometry.
    const toward = new T.Vector3(8, -12, 12).normalize();
    const right = new T.Vector3(0, 0, 1).cross(toward).normalize();
    const up = toward.clone().cross(right).normalize();
    return { right, up, toward, basis: new T.Matrix4().makeBasis(right, up, toward) };
}

/**
 * T1 acceptance, not an aesthetic approximation: validate real Three.js
 * camera projection against the source painting at nine art-space anchors.
 * Canvas remains pixel-identical to the original 1672×941 composition.
 */
export function townProjectionMaxErrorPixels(camera) {
    if (!camera?.isCamera) throw new TypeError('Missing live Three.js Town camera');
    camera.updateMatrixWorld();
    let maximum = 0;
    for (const [x, y] of [
        [0, 0], [TOWN_ART_SIZE[0], 0], [0, TOWN_ART_SIZE[1]],
        [...TOWN_ART_SIZE], [TOWN_ART_SIZE[0] / 2, TOWN_ART_SIZE[1] / 2],
        [712, 412], [864, 513], [902, 465], [1200, 710],
    ]) {
        const normalized = new T.Vector3(...townPreviewProjection(x, y)).project(camera);
        const rx = (normalized.x + 1) / 2 * TOWN_ART_SIZE[0];
        const ry = (1 - normalized.y) / 2 * TOWN_ART_SIZE[1];
        maximum = Math.max(maximum, Math.abs(rx - x), Math.abs(ry - y));
    }
    return maximum;
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
    const depth = TOWN_FOREGROUND_CASTER_DEPTH[cutout.id];
    if (!Number.isFinite(depth) || depth <= 0 || depth > .25)
        throw new TypeError('Missing shallow authored Town shadow-proxy depth');
    // Shallow extruded alpha-tight silhouettes produce actual GPU shadow
    // occlusion, unlike normals or a fullscreen multiply/darkness pass.
    // This is invisible geometry, not visible town architecture.
    const geometry = new T.ExtrudeGeometry(shapes, {
        depth, steps: 1, bevelEnabled: false, curveSegments: 1,
    });
    geometry.applyMatrix4(basis);
    return geometry;
}

function cutoutTexture(source, cutout, lift = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = cutout.width; canvas.height = cutout.height;
    const context = canvas.getContext('2d');
    context.drawImage(source, cutout.x, cutout.y, cutout.width, cutout.height,
        0, 0, cutout.width, cutout.height);
    // Conservative candidate exposure in LINEAR color, on the exact original
    // cutout geometry. Never borrow a differently painted daylight roof edge.
    if (lift !== 1) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) for (let c = 0; c < 3; c++) {
            const value = pixels.data[i+c] / 255;
            const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
            const bounded = Math.min(1, linear * lift);
            pixels.data[i+c] = Math.round(255 * (bounded <= .0031308
                ? 12.92 * bounded : 1.055 * bounded ** (1/2.4) - .055));
        }
        context.putImageData(pixels, 0, 0);
    }
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
        position: p.toArray(), direction: [0, 0, -1], range: TOWN_NIGHT_LIGHT_GRADE.range,
        coneAngle: .55, penumbra: .3, castsShadow: true, priority: id === 'noticeboard-lantern' ? 3 : 1,
        artAnchor: [x, y],
    };
}

export function townPreviewManifest({ wellV4 = false, domains = false } = {}) {
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
            // A painted 2D receiver has no measured world-space paving geometry.
            // Keep its normal continuous with the surrounding scene in domain mode.
            ...(domains ? {} : { normal: 'town-paving-flat-normal' }), roughness: 1, specular: 0,
        }),
    ];
    layers.push({
        id: 'town-central-paving', ownerId: 'canonical-town-paving',
        geometry: 'approved-panorama-plane', artBounds: [0, 0, ...TOWN_ART_SIZE],
        material: 'town-level-paving',
        position: new T.Vector3().addScaledVector(a.toward, .015).toArray(),
        rotation: [0, 0, 0], scale: [1, 1, 1], castsShadow: false, receivesShadow: true,
    });
    const legacyFixtures = [
        light('noticeboard-lantern', 902, 465, 1.1,
            TOWN_NIGHT_LIGHT_GRADE.lanternColor, TOWN_NIGHT_LIGHT_GRADE.centralIntensity),
        light('north-west-lantern', 552, 373, 1.2,
            TOWN_NIGHT_LIGHT_GRADE.lanternColor, TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity),
        light('east-lantern', 1111, 373, 1.2,
            TOWN_NIGHT_LIGHT_GRADE.lanternColor, TOWN_NIGHT_LIGHT_GRADE.peripheralIntensity),
    ];
    // One immutable scene receiver. Vacancy/isolation never swaps in four
    // differently painted diffuse plates over the ground and architecture.
    if (domains) for (const plate of TOWN_APERTURE_PLATES) {
        const classes = plate.domain === 'nexus' ? ['warm', 'magic'] : ['warm'];
        for (const kind of classes) {
            const key = 'town-emissive-' + plate.domain + '-' + kind;
            layers.push({
                id: key, ownerId: 'town-' + plate.domain,
                domain: plate.domain, emissionKind: kind, geometry: key + '-plane',
                artBounds: [plate.x, plate.y, plate.width, plate.height],
                material: key + '-material',
                position: new T.Vector3(...townPreviewProjection(
                    plate.x + plate.width / 2, plate.y + plate.height / 2))
                    .addScaledVector(a.toward, .05).toArray(),
                rotation: [0, 0, 0], scale: [1, 1, 1],
                castsShadow: false, receivesShadow: false,
            });
            materials.push(material(key + '-material', key + '-map', {
                color: '#000000', emissiveMap: key + '-map',
                emission: '#ffffff', emissionIntensity: 1.4,
                roughness: 1, specular: 0, metalness: 0,
            }));
        }
    }
    const fixtures = domains ? createTownDomainFixtures(townPreviewProjection, a.toward.toArray()) : legacyFixtures;
    const selectedCutouts = domainForeground(wellV4
        ? CUTOUTS.filter(c => !STAGE4_REPLACED_CUTOUT_IDS.includes(c.id)) : CUTOUTS, domains);
    if (wellV4) {
        const direction = a.toward.toArray();
        layers.push(stage4WellLayer(townPreviewProjection, direction));
        materials.push(stage4WellMaterial());
        // Replace the old lamplight: its point-shadow map and giant 2.5D
        // cutout proxy are what caused the broad dark ring around the well.
        if (!domains) fixtures.splice(fixtures.findIndex(f => f.id === 'noticeboard-lantern'), 1,
            stage4WellLight(townPreviewProjection, direction));
        // Don't spend the remaining cubemap shadow budget on legacy
        // panorama cutouts. The only new T2 shadow is the tightly authored
        // well roof/posts; surrounding lamps still provide illumination.
        fixtures.filter(f => f.id !== (domains ? 'town-square-well' : 'stage4-well-lantern'))
            .forEach(f => { f.castsShadow = false; });
    }
    for (const cutout of selectedCutouts) {
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
            // Original billboard support extrusions are not reliable shadow volumes.
            // Keep feet-depth occlusion, but do not project their rectangular shadows.
            castsShadow: !domains, receivesShadow: !domains,
        });
        materials.push(material('approved-cutout-material-' + cutout.id,
            'approved-cutout-texture-' + cutout.id));
    }
    return { version: 1, artSize: [...TOWN_ART_SIZE], layers, materials, fixtures };
}

// Exact existing canonical vacant overlays, placed at their authored 1672x941
// image coordinates. Used only to make one COMMON dark candidate source.
// No CSS dimming; never switch full panoramas when C# buildings unlock.
// These are still painted references, NOT artist-approved neutral albedo.
const VACANT_TOWN_PLATES = Object.freeze([
    ['ArcaneNexus', 0, 0, 618, 582],
    ['Blacksmith', 0, 353, 633, 588],
    ['Codex', 982, 0, 690, 548],
    ['HallOfFame', 866, 333, 806, 608],
]);

async function loadApprovedImage(wellV4 = false, domains = false, sourceMode = 'night') {
    if (!['night', 'day-candidate'].includes(sourceMode)) throw new TypeError('Unknown Town albedo candidate');
    const image = new Image();
    image.src = new URL(domains && sourceMode === 'night'
        ? '../art/town/night-active.webp'
        : wellV4 ? '../' + WELL_STAGE4.backgroundUrl
            : '../art/town/day-active.webp', import.meta.url).href;
    await image.decode();
    if (image.naturalWidth !== TOWN_ART_SIZE[0] || image.naturalHeight !== TOWN_ART_SIZE[1])
        throw new Error('Approved Town source resolution changed; reject visual drift');
    if (!domains) return image;
    // In the opt-in domain preview, remove baked ACTIVE-building window
    // artwork using the matching authentic vacant plates already in the game.
    // This is a fixed source texture, not five composited light frames.
    const canvas = document.createElement('canvas');
    canvas.width = TOWN_ART_SIZE[0]; canvas.height = TOWN_ART_SIZE[1];
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Town 2D asset preparation unavailable');
    context.drawImage(image, 0, 0);
    for (const [building, x, y, width, height] of VACANT_TOWN_PLATES) {
        const filename = sourceMode === 'day-candidate'
            ? `day-vacant-${building}.webp` : `night-vacant-${building}.png`;
        const plate = new Image();
        plate.src = new URL('../art/town/' + filename, import.meta.url).href;
        await plate.decode();
        if (plate.naturalWidth !== width || plate.naturalHeight !== height)
            throw new Error('Original vacant plate registration failed: ' + filename);
        context.drawImage(plate, x, y);
    }
    return sourceMode === 'night' ? clipTownNightSilhouette(canvas) : canvas;
}

async function registerTownEmissionMasks(engine, ensureAlive = () => {}) {
    // Original registered runtime assets, same art coordinates as the approved
    // Town. The downloaded owner-selected lighting frames remain immutable
    // visual references; these are not guessed colour blobs.
    const active = new Image();
    active.src = new URL('../art/town/night-active.webp', import.meta.url).href;
    await active.decode();
    ensureAlive();
    if (active.naturalWidth !== 1672 || active.naturalHeight !== 941)
        throw new Error('Town emission requires pixel-exact active reference');
    for (const plate of TOWN_APERTURE_PLATES) {
        const vacant = new Image();
        if (plate.domain !== 'common') {
            vacant.src = new URL('../art/town/night-vacant-' + plate.name + '.png', import.meta.url).href;
            await vacant.decode();
            ensureAlive();
        }
        if (plate.domain !== 'common' && (vacant.naturalWidth !== plate.width || vacant.naturalHeight !== plate.height))
            throw new Error('Emission plate registration drift: ' + plate.name);
        const draw = document.createElement('canvas');
        draw.width = plate.width; draw.height = plate.height;
        const ctx = draw.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(active, plate.x, plate.y, plate.width, plate.height,
            0, 0, plate.width, plate.height);
        const activePixels = ctx.getImageData(0, 0, plate.width, plate.height).data;
        ctx.clearRect(0, 0, plate.width, plate.height);
        if (plate.domain !== 'common') ctx.drawImage(vacant, 0, 0);
        const vacantPixels = ctx.getImageData(0, 0, plate.width, plate.height).data;
        for (const kind of plate.domain === 'nexus' ? ['warm', 'magic'] : ['warm']) {
            const key = 'town-emissive-' + plate.domain + '-' + kind;
            const mask = plate.domain === 'common'
                ? commonAperturePixels(activePixels, plate.width, plate.height)
                : emissionMaskPixels(activePixels, vacantPixels, plate.width, plate.height, plate, kind);
            const output = document.createElement('canvas');
            output.width = plate.width; output.height = plate.height;
            output.getContext('2d').putImageData(
                new ImageData(mask, plate.width, plate.height), 0, 0);
            const texture = new T.CanvasTexture(output);
            engine.registerTexture(key + '-map', texture);
            engine.registerGeometry(key + '-plane', plane(
                plate.width * BASE_WIDTH / TOWN_ART_SIZE[0],
                plate.height * BASE_WIDTH / TOWN_ART_SIZE[0], axes().basis));
        }
    }
}

/** The only side effect is an isolated canvas, never live Town runtime. */
export async function initializeTownPreview(canvas, { wellV4 = false, domains = false, unlocks = null,
    school = 'none', strength = .16, isolation = 'combined', neutralMagic = false,
    sourceMode = 'night', exposure = 1, environmentMode = 'night' } = {}) {
    if (states.has(canvas)) return;
    // The full Town scene is ~1000–1700 CSS px wide on portrait phones.
// The previous 780px cap discarded more than half of the authored detail
// before CSS enlarged the image. The separate generic engine keeps its
// 390px default for other scenes; ONLY this opt-in Town uses native-art QA.
const engine = new LightingEngine(canvas, {
        shadowViews: 8, maxLights: domains ? 40 : 8, maxFramebufferWidth: TOWN_ART_SIZE[0],
    });
    const state = { engine, mode: environmentMode, environmentMode, diagnosticMode: null, lamps: true, offset: 0, npcEnabled: true,
        npcProgress: 0, paving: 'neutral', view: 'lit', citizens: null,
        wellV4: wellV4 === true, domains: domains === true,
        unlocks: unlocks ?? { nexusUnlocked: false, forgeUnlocked: false, codexUnlocked: false, hallUnlocked: false },
        school, strength, isolation, neutralMagic, sourceMode, exposure, alive: true };
    states.set(canvas, state);
    const ensureAlive = () => { if (!state.alive) throw new Error('Town preview disposed during asset loading'); };
    try {
        const a = axes();
        const source = await loadApprovedImage(state.wellV4, state.domains,
            state.sourceMode);
        ensureAlive();
        if (state.domains && state.sourceMode === 'night') {
            clipTownNightSilhouette(source);
            const context=source.getContext('2d');
            const pixels=context.getImageData(0,0,source.width,source.height);
            pixels.data.set(liftTownReferencePixels(pixels.data,source.width,source.height,4));
            context.putImageData(pixels,0,0);
        }
        const selectedCutouts = domainForeground(state.wellV4
            ? CUTOUTS.filter(c => !STAGE4_REPLACED_CUTOUT_IDS.includes(c.id)) : CUTOUTS, state.domains);
        engine.registerGeometry('approved-panorama-plane', plane(BASE_WIDTH, BASE_HEIGHT, a.basis));
        // Existing Town CSS NPC silhouettes rendered by the same shared engine.
        // This is diagnostic Town behavior, not new or approved character art.
        engine.registerGeometry('town-citizen-css-rectangle', plane(
            TOWN_CITIZEN_ART_WIDTH * BASE_WIDTH / TOWN_ART_SIZE[0],
            TOWN_CITIZEN_ART_HEIGHT * BASE_WIDTH / TOWN_ART_SIZE[0], a.basis));
        const separated = splitTownPavingReference(source, selectedCutouts);
        engine.registerTexture('town-day-background', new T.CanvasTexture(separated.backdrop));
        engine.registerTexture('town-day-paving', new T.CanvasTexture(separated.floor));
        // CRITICAL: the night panorama is much too dark to use as the
        // cobblestone's base-color. Reuse the exact registered daylight
        // cobbles strictly INSIDE the authored paving alpha mask. Its
        // bright sky/buildings are NEVER used as the Town background.
        // Stage 4's opaque clean-square PNG is strictly a *paving* source.
        // NEVER let its daylight sky overwrite the preserved night backing.
        const dayReference = state.domains
            ? await loadApprovedImage(false, false, 'day-candidate') : source;
        // The night source contains painted wet streaks. Use only original
        // dry daytime paving inside the authored ground mask, never its sky/buildings.
        const floorReference = state.domains ? dayReference : source;
        ensureAlive();
        ensureAlive();
        const pavingLayers = floorReference === source ? separated
            : splitTownPavingReference(floorReference, selectedCutouts);
        if (state.domains) {
            // A day/night environment switch must change the scenic source,
            // not merely turn up ambient on a painted night panorama.
            engine.registerTexture('town-authored-day-background',
                new T.CanvasTexture(splitTownPavingReference(dayReference, selectedCutouts).backdrop));
        }
        // Preserve exact approved-source pixels as a QC toggle, but author a
        // NEW runtime-only candidate neutral albedo for the GPU paving pass.
        const neutral = document.createElement('canvas');
        neutral.width = separated.floor.width; neutral.height = separated.floor.height;
        neutral.getContext('2d').drawImage(pavingLayers.floor, 0, 0);
        state.neutralMetrics = deriveTownNeutralPavingCanvas(neutral);
        if (state.domains) softenTownPavingBoundary(neutral, separated.floor);
        engine.registerTexture('town-paving-neutral', new T.CanvasTexture(neutral));
        const normal = levelPavingNormal(a.right, a.up, a.toward);
        const normalTexture = new T.DataTexture(normal, 1, 1, T.RGBAFormat);
        normalTexture.needsUpdate = true;
        engine.registerTexture('town-paving-flat-normal', normalTexture, false);
        if (state.wellV4) {
            const wellImage = new Image();
            wellImage.src = new URL('../' + WELL_STAGE4.spriteUrl, import.meta.url).href;
            await wellImage.decode();
            ensureAlive();
            if (wellImage.naturalWidth !== WELL_STAGE4.sprite.width ||
                wellImage.naturalHeight !== WELL_STAGE4.sprite.height)
                throw new Error('Stage 4 requires exact authored well PNG, not rescaled canvas art');
            engine.registerGeometry('stage4-well-plane', plane(
                WELL_STAGE4.sprite.width * BASE_WIDTH / TOWN_ART_SIZE[0],
                WELL_STAGE4.sprite.height * BASE_WIDTH / TOWN_ART_SIZE[0], a.basis));
            engine.registerGeometry('stage4-well-caster-proxies',
                stage4CasterGeometry(T, a.basis));
            const wellTexture = new T.Texture(wellImage);
            wellTexture.needsUpdate = true;
            engine.registerTexture('stage4-well-albedo', wellTexture);
        }
        // Foreground must sample the SAME already-calibrated pixels as its backing.
        // Reloading an uncalibrated scene and lifting by a different amount
        // creates dark roof seams and a halo around the well.
        const foregroundSource = source;
        ensureAlive();
        for (const cutout of selectedCutouts) {
            const size = BASE_WIDTH / TOWN_ART_SIZE[0];
            engine.registerGeometry('approved-cutout-plane-' + cutout.id,
                plane(cutout.width * size, cutout.height * size, a.basis));
            engine.registerGeometry('approved-foreground-caster-' + cutout.id, cutoutGeometry(cutout, a.basis));
            engine.registerTexture('approved-cutout-texture-' + cutout.id, cutoutTexture(foregroundSource, cutout));
        }
        if (state.domains) {
            await registerTownEmissionMasks(engine, ensureAlive);
        }
        state.manifest = townPreviewManifest({ wellV4: state.wellV4, domains: state.domains });
        engine.setCamera([0, 0, 0], BASE_WIDTH / 2);
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
    applyTownPreviewEnvironment(state, options);
    if (!['day', 'night', 'zero'].includes(state.mode) ||
        !Number.isFinite(state.offset) || Math.abs(state.offset) > 250 ||
        !['source', 'neutral'].includes(state.paving) ||
        !['lit', 'shadow-visibility', 'normals', 'albedo', 'geometry'].includes(state.view) ||
        !Number.isFinite(state.npcProgress) || state.npcProgress < 0 || state.npcProgress > 1 ||
        typeof state.npcEnabled !== 'boolean')
        throw new RangeError('Invalid Town proof control');
    const manifest = structuredClone(state.manifest);
    if (state.domains && state.mode === 'day')
        manifest.materials.find(m => m.id === 'approved-day-reference').albedo =
            'town-authored-day-background';
    manifest.materials.find(m => m.id === 'town-level-paving').albedo =
        state.paving === 'neutral' ? 'town-paving-neutral' : 'town-day-paving';
    const citizenY = 513 + state.npcProgress * 75;
    const input = state.citizens ?? [{ id: 1, feet: [864, citizenY], isPresent: true }];
    const actor = projectTownCitizens(input,
        townPreviewProjection, axes().toward.toArray(),
        { enabled: state.npcEnabled,
          frontDepthY: state.wellV4 ? WELL_STAGE4.frontDepthY : undefined });
    manifest.layers.push(...actor.layers);
    manifest.materials.push(...actor.materials);
    if (state.domains) {
        if (!TOWN_LIGHT_ISOLATIONS.includes(state.isolation))
            throw new TypeError('Invalid developer light isolation');
        configureTownLightDomains(manifest.fixtures, {
            unlocks: state.unlocks, isolation: state.isolation,
            school: state.school, strength: state.strength, neutralMagic: state.neutralMagic,
        });
        // Keep the movable light diagnostic in world coordinates, with no
        // texture-space adjustment or full-scene painted-light blending.
        const well = manifest.fixtures.find(f => f.id === 'town-square-well');
        if (state.offset) {
            const original = townPreviewProjection(well.artAnchor[0], well.artAnchor[1]);
            const moved = townPreviewProjection(well.artAnchor[0] + state.offset, well.artAnchor[1]);
            well.position = well.position.map((value, i) => value + moved[i] - original[i]);
        }

    } else {
        const moved = manifest.fixtures.find(f =>
            f.id === (state.wellV4 ? 'stage4-well-lantern' : 'noticeboard-lantern'));
        const modified = state.wellV4
            ? stage4WellLight(townPreviewProjection, axes().toward.toArray(),
                { offset: state.offset, enabled: state.lamps })
            : light(moved.id, moved.artAnchor[0] + state.offset,
                moved.artAnchor[1], 1.1, TOWN_NIGHT_LIGHT_GRADE.lanternColor,
                TOWN_NIGHT_LIGHT_GRADE.centralIntensity, state.lamps);
        Object.assign(moved, modified);
        for (const fixture of manifest.fixtures) fixture.enabled &&= state.lamps;
    }
    const { snapshot, effectiveMode } = state.domains
        ? townDomainSnapshot(manifest, state)
        : { snapshot: gradeTownPreviewLighting(compileTownLightingSnapshot(manifest, {
            state: {}, mode: state.mode, localHour: 12, time: 0,
        }), state.mode), effectiveMode: state.mode };
    state.engine.apply(snapshot);
    state.engine.setCamera([0, 0, 0], BASE_WIDTH / 2);
    // The shared shadow-visibility inspector reuses the *real* shadow map
    // from a preceding lit frame. Never fake it with a CSS darkness mask.
    state.engine.setDebugView('lit');
    // G4 visual approval uses original 1672x941 art pixels, irrespective of
    // the portrait viewport crop; downscaling this canvas to 390 pixels was
    // the root cause of the pronounced blocks in the earlier screenshots.
    state.engine.render(TOWN_ART_SIZE[0], TOWN_ART_SIZE[1]);
    if (effectiveMode !== 'zero' && state.view !== 'lit') {
        state.engine.setDebugView(state.view);
        // G4 visual approval uses original 1672x941 art pixels, irrespective of
    // the portrait viewport crop; downscaling this canvas to 390 pixels was
    // the root cause of the pronounced blocks in the earlier screenshots.
    state.engine.render(TOWN_ART_SIZE[0], TOWN_ART_SIZE[1]);
    }
    if (effectiveMode === 'zero') {
        // Actual framebuffer check: no ambient, fixtures, or emission is allowed
        // to leave any non-black world pixel. Alpha is intentionally ignored.
        const pixels = state.engine.pixels();
        let litPixels = 0;
        for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] || pixels[i + 1] || pixels[i + 2]) litPixels++;
        canvas.dataset.zeroBlack = (litPixels === 0).toString();
        if (litPixels) throw new Error(`Zero-light proof leaked ${litPixels} world pixels`);
    } else delete canvas.dataset.zeroBlack;
    canvas.dataset.npcFeetY = !state.npcEnabled ? 'hidden' : state.citizens === null
        ? citizenY.toFixed(2) : 'authoritative';
    canvas.dataset.npcPass = !state.npcEnabled ? 'hidden' : state.citizens === null
        ? (citizenY >= 572 ? 'front' : 'behind') : 'authoritative';
    canvas.dataset.npcShadowCasters = actor.layers.filter(a => a.castsShadow).length.toString();
    canvas.dataset.inspection = effectiveMode === 'zero' ? 'lit' : state.view;
    const projectionError = townProjectionMaxErrorPixels(state.engine.camera);
    canvas.dataset.projectionErrorPx = projectionError.toFixed(3);
    // Reject even apparently plausible previews if the live GPU image moves
    // well, gate, actor or hotspot artwork from their canonical positions.
    if (projectionError > 2) throw new Error(
        `Town GPU image alignment drifted ${projectionError.toFixed(2)} source pixels`);
    canvas.dataset.nightAmbient = effectiveMode === 'night'
        ? snapshot.environment.ambient.toFixed(3) : 'not-night';
    if (state.engine.canvas.width !== TOWN_ART_SIZE[0] ||
        state.engine.canvas.height !== TOWN_ART_SIZE[1])
        throw new Error('Town review requires native-source GPU framebuffer resolution');
    canvas.dataset.framebufferWidth = state.engine.canvas.width.toString();
    canvas.dataset.framebufferHeight = state.engine.canvas.height.toString();
    canvas.dataset.artworkPixelsPerFramebufferPixel =
        (TOWN_ART_SIZE[0] / state.engine.canvas.width).toFixed(3);
    canvas.dataset.wellAssetMode = state.wellV4 ? 'stage4-remade' : 'legacy';
    canvas.dataset.wellShadowCaster = state.wellV4 ? 'roof-and-posts-only' : 'legacy';
    canvas.dataset.pavingAlbedo = state.paving;
    canvas.dataset.neutralCoverage = (state.neutralMetrics?.coverage ?? 0).toString();
    canvas.dataset.illuminationReduction =
        (state.neutralMetrics?.illuminationReduction ?? 0).toFixed(3);
    canvas.dataset.profile = effectiveMode;
    canvas.dataset.albedoSource = state.sourceMode;
    canvas.dataset.fixtureCount = snapshot.lights.filter(l => l.enabled).length.toString();
    canvas.dataset.lightIsolation = state.domains ? state.isolation : 'legacy';
    canvas.dataset.chimneyOn = String(snapshot.lights.some(l => l.id === 'town-blacksmith-chimney' && l.enabled));
    canvas.dataset.nexusMagicColor = snapshot.lights.find(l => l.id === 'town-nexus-magic')?.color ?? 'none';
}

/**
 * Live opt-in Town only: render the C# citizen identity and feet passed in by
 * readTownCitizensFromDom. The isolated lab continues using its scripted actor.
 * Never mutate the C# positions or start a separate gameplay simulation.
 */
export function updateTownPreviewCitizens(canvas, citizens, options = {}) {
    const state = states.get(canvas);
    if (!state?.alive || !state.manifest) throw new Error('Town GPU preview must initialize first');
    if (!Array.isArray(citizens)) throw new TypeError('Expected authoritative C# citizens');
    state.citizens = citizens;
    configureTownPreview(canvas, options);
}

export function disposeTownPreview(canvas) {
    const state = states.get(canvas);
    if (!state) return;
    state.alive = false;
    state.resize?.disconnect();
    state.engine.dispose();
    states.delete(canvas);
}
