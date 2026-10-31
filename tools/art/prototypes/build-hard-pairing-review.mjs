// Native-pixel review of genuine original source stones, NOT a playable Hunt capture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createHardPairingWindow, HARD_PAIRING_VERSION } from './terrain-hard-pairings.mjs';
import { buildHardPairingRelief, HARD_PAIRING_RISE_PIXELS } from './terrain-hard-pairing-relief.mjs';
import { worldLightingMaps } from './terrain-world-variation.mjs';

const FONT = Object.freeze({
    ' ': ['000','000','000','000','000'],
    '>': ['100','010','001','010','100'],
    A: ['010','101','111','101','101'], B: ['110','101','110','101','110'],
    C: ['111','100','100','100','111'], D: ['110','101','101','101','110'],
    E: ['111','100','110','100','111'], F: ['111','100','110','100','100'],
    G: ['111','100','101','101','111'], I: ['111','010','010','010','111'],
    K: ['101','101','110','101','101'], L: ['100','100','100','100','111'],
    M: ['101','111','111','101','101'],
    N: ['101','111','111','111','101'], O: ['111','101','101','101','111'],
    R: ['110','101','110','101','101'], S: ['111','100','111','001','111'],
    T: ['111','010','010','010','010']
});

function label(bitmap, text, x, y) {
    for (const c of text.toUpperCase()) {
        const glyph = FONT[c];
        if (!glyph) {
            throw new Error('Unknown pairing preview glyph: ' + c);
        }
        for (let py = 0; py < 5; py++) {
            for (let px = 0; px < 3; px++) {
                if (glyph[py][px] === '1') {
                    bitmap.set(x + px, y + py, '#d3dfcb');
                }
            }
        }
        x += 4;
    }
}

function nearest3x(source) {
    const out = new Bitmap(source.width * 3, source.height * 3);
    for (let y = 0; y < out.height; y++) {
        for (let x = 0; x < out.width; x++) {
            out.set(x, y, source.get(Math.floor(x / 3), Math.floor(y / 3)));
        }
    }
    return out;
}

const VARIATION_PAIRS = Object.freeze([
    ['flagstone', 'cobble'], ['cobble', 'brick'], ['brick', 'flagstone']
]);
const VARIATION_SERIES = Object.freeze([
    {name: 'degradation', rows: [
        {label: 'INTACT', seed: 2111, state: 'intact'},
        {label: 'BROKEN', seed: 2111, state: 'broken'},
        {label: 'RECLAIMED', seed: 2111, state: 'reclaimed'}
    ]},
    {name: 'seeds', rows: [
        {label: 'SEED A', seed: 2111, state: 'worn'},
        {label: 'SEED B', seed: 4709, state: 'worn'},
        {label: 'SEED C', seed: 8933, state: 'worn'}
    ]}
]);

/** P1k-H3: independent material stress studies; no C# terrain distribution.
 * The same world window shows distinct physical degradation and seeded masonry
 * without changing the owner-liked H1 mixing gallery or any G renderer inputs.
 */
export function buildHardPairingVariationReview() {
    const panelWidth = 256, panelHeight = 224, artHeight = 192;
    const reviews = [];
    for (const series of VARIATION_SERIES) {
        const scene = new Bitmap(panelWidth * 3, panelHeight * series.rows.length);
        scene.rect(0, 0, scene.width, scene.height, '#17231c');
        const panels = [];
        for (let row = 0; row < series.rows.length; row++) {
            const {label: stateLabel, seed, state} = series.rows[row];
            for (let column = 0; column < VARIATION_PAIRS.length; column++) {
                const [primary, secondary] = VARIATION_PAIRS[column];
                const field = createHardPairingWindow(primary, secondary, {
                    seed, state, originX: 0, originY: 0, width: panelWidth,
                    height: artHeight, role: 'left', boundaryX: panelWidth / 2,
                    boundaryY: artHeight / 2, seamMaterial: 'soil'
                });
                const x = column * panelWidth, y = row * panelHeight;
                label(scene, primary + ' > ' + secondary, x + 7, y + 7);
                label(scene, stateLabel, x + 7, y + 14);
                scene.blit(field.albedo, x, y + 20);
                const counts = [0, 0, 0];
                for (const tag of field.sourceTags) {
                    counts[tag]++;
                }
                panels.push({primary, secondary, seed, state, row, column,
                    stonePixelsPrimary: counts[1], stonePixelsSecondary: counts[2],
                    infillPixels: counts[0],
                    sourceAlbedoSha256: createHash('sha256').update(field.albedo.data).digest('hex')});
            }
        }
        reviews.push({name: series.name, scene, enlarged: nearest3x(scene), panels});
    }
    return {reviews, manifest: {
        schema: 'wf32-hard-pairing-variation-review.v1',
        sourceVersion: HARD_PAIRING_VERSION, nativePixelScale: 1,
        panelSize: [panelWidth, artHeight],
        series: reviews.map(({name, panels}) => ({name, panels})),
        status: 'OFFLINE SOURCE-ONLY SEED AND WEAR ART; NOT LIVE AR3, DEPTH, G SHADOWS OR PHYSICS'
    }};
}

export function buildHardPairingReview() {
    const panelWidth = 256, panelHeight = 224, artHeight = 192;
    const scene = new Bitmap(panelWidth * 3, panelHeight * 2);
    scene.rect(0, 0, scene.width, scene.height, '#17231c');
    const base = [['flagstone','cobble'],['cobble','brick'],['brick','flagstone']];
    const panels = [];
    let representative = null;
    let relief = null;
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
            const [first, second] = base[col];
            const primary = row === 0 ? first : second;
            const secondary = row === 0 ? second : first;
            const field = createHardPairingWindow(primary, secondary, {
                seed: 2111, state: 'worn', originX: 0, originY: 0,
                width: panelWidth, height: artHeight, role: 'left',
                boundaryX: panelWidth / 2, boundaryY: artHeight / 2,
                seamMaterial: 'soil'
            });
            const x = col * panelWidth, y = row * panelHeight;
            label(scene, primary + ' > ' + secondary, x + 7, y + 7);
            scene.blit(field.albedo, x, y + 20);
            panels.push({primary, secondary, column: col, row,
                stonePixelsPrimary: field.sourceTags.filter(v => v === 1).length,
                stonePixelsSecondary: field.sourceTags.filter(v => v === 2).length,
                infillPixels: field.sourceTags.filter(v => v === 0).length});
            if (row === 0 && col === 0) {
                representative = worldLightingMaps(field);
                relief = buildHardPairingRelief(field);
            }
        }
    }
    return {scene, enlarged: nearest3x(scene), representative, relief,
        manifest: {schema: 'wf32-hard-pairing-review.v1', version: HARD_PAIRING_VERSION,
            status: 'OFFLINE ORIGINAL SOURCE ART - NOT A LIVE HUNT SCREENSHOT',
            nativePixelScale: 1, panelSize: [panelWidth, artHeight],
            panelRows: 2, panelColumns: 3, panels,
            relief: {status: relief.status, risePixels: HARD_PAIRING_RISE_PIXELS,
                pixelsPerWorldUnit: relief.pixelsPerWorldUnit,
                heightUnitsPerPixel: relief.heightUnitsPerPixel,
                representativeCasterFootprints: relief.candidateCasterFootprints.length,
                maps: ['flagstone-cobble-elevation.png', 'flagstone-cobble-caster-alpha.png']},
            limitations: 'Candidate elevation only. No AR3 placement, physics, G runtime, cast shadows, or mobile performance acceptance.'}};
}

export function writeHardPairingReview(directory) {
    const review = buildHardPairingReview();
    const variations = buildHardPairingVariationReview();
    mkdirSync(directory, {recursive: true});
    const writeImage = (name, bitmap) => writeFileSync(join(directory, name),
        encodePng(bitmap.width, bitmap.height, bitmap.data));
    writeImage('hard-pairing-gallery-native.png', review.scene);
    writeImage('hard-pairing-gallery-3x.png', review.enlarged);
    writeImage('flagstone-cobble-normal.png', review.representative.normal);
    writeImage('flagstone-cobble-roughness.png', review.representative.roughnessMap);
    writeImage('flagstone-cobble-elevation.png', review.relief.heightmap);
    writeImage('flagstone-cobble-caster-alpha.png', review.relief.casterAlpha);
    for (const series of variations.reviews) {
        writeImage(`hard-pairing-${series.name}-native.png`, series.scene);
        writeImage(`hard-pairing-${series.name}-3x.png`, series.enlarged);
    }
    review.manifest.variationReview = variations.manifest;
    writeFileSync(join(directory, 'manifest.json'), JSON.stringify(review.manifest, null, 2) + '\n');
    return review.manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const directory = process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)),
        '../../../docs/art/previews/wf32-hard-pairings');
    console.log(JSON.stringify(writeHardPairingReview(directory), null, 2));
}
