// WF32-P1k-H4 — reproducible source-art handoff, NOT an AR3/G runtime adapter.
// Fixed, owner-liked H1 recipe only. H3 seed/wear extremes are not approved.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../lib/png.mjs';
import { createHardPairingWindow, HARD_PAIRING_FAMILIES, HARD_PAIRING_VERSION } from './terrain-hard-pairings.mjs';
import { buildHardPairingRelief, HARD_PAIRING_RISE_PIXELS } from './terrain-hard-pairing-relief.mjs';
import { cutWorldInto32, worldLightingMaps, WORLD_CELL } from './terrain-world-variation.mjs';

export const HARD_PAIRING_BUNDLE_SCHEMA = 'wf32-hard-pairing-source-bundle.v1';
const RECIPE = Object.freeze({seed: 2111, state: 'worn', originX: 0, originY: 0,
    width: 256, height: 192, role: 'left', boundaryX: 128, boundaryY: 96, seamMaterial: 'soil'});
const CHANNELS = Object.freeze(['albedo', 'normal', 'roughness', 'candidateElevation', 'candidateCasterAlpha']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

/** Produce exact native-pixel source maps for each directed material meeting.
 * This does not allocate a runtime atlas, place AR3 terrain or register G lights.
 */
export function buildHardPairingSourceBundle() {
    const files = new Map();
    const pairs = [];
    for (const primary of HARD_PAIRING_FAMILIES) {
        for (const secondary of HARD_PAIRING_FAMILIES) {
            if (primary === secondary) {
                continue;
            }
            const field = createHardPairingWindow(primary, secondary, RECIPE);
            const maps = worldLightingMaps(field);
            const relief = buildHardPairingRelief(field);
            const channels = {
                albedo: maps.albedo,
                normal: maps.normal,
                roughness: maps.roughnessMap,
                candidateElevation: relief.heightmap,
                candidateCasterAlpha: relief.casterAlpha
            };
            const prefix = `${primary}-to-${secondary}`;
            const exported = {};
            for (const name of CHANNELS) {
                const bitmap = channels[name];
                if (bitmap.width !== field.width || bitmap.height !== field.height ||
                    cutWorldInto32(bitmap).length !== (field.width / WORLD_CELL) * (field.height / WORLD_CELL)) {
                    throw new Error('Source material channel has an incompatible native-pixel grid');
                }
                const filename = `${prefix}.${name}.png`;
                const bytes = encodePng(bitmap.width, bitmap.height, bitmap.data);
                files.set(filename, bytes);
                exported[name] = {filename, sha256: sha256(bytes), width: bitmap.width, height: bitmap.height};
            }
            const footprintFilename = `${prefix}.candidate-caster-footprints.json`;
            const footprintDocument = {
                schema: 'wf32-candidate-stone-footprints.v1',
                primary, secondary, origin: [field.originX, field.originY],
                dimensions: [field.width, field.height],
                coordinates: 'native local pixel spans; original IDs, not colliders or render meshes',
                candidateCasterFootprints: relief.candidateCasterFootprints
            };
            const footprintBytes = Buffer.from(json(footprintDocument));
            files.set(footprintFilename, footprintBytes);
            const counts = [0, 0, 0];
            for (const tag of field.sourceTags) {
                counts[tag]++;
            }
            pairs.push({primary, secondary, channels: exported,
                candidateFootprints: {filename: footprintFilename, sha256: sha256(footprintBytes),
                    stoneCount: relief.candidateCasterFootprints.length},
                sourceCoveragePixels: {soil: counts[0], primary: counts[1], secondary: counts[2]}});
        }
    }
    const manifest = {
        schema: HARD_PAIRING_BUNDLE_SCHEMA,
        provenance: {sourceVersion: HARD_PAIRING_VERSION, recipe: RECIPE},
        nativePixelTileSize: WORLD_CELL,
        pixelsPerWorldUnit: 48,
        candidateRisePixels: HARD_PAIRING_RISE_PIXELS,
        elevationEncoding: 'grayscale = round(255 * sixteenthsOfNativePixel / 128); candidate only',
        normalAndRoughness: 'existing worldLightingMaps tangent normal / grayscale roughness channels',
        channels: CHANNELS,
        pairs,
        ownership: {geography: 'AR3 C#', materialPlacement: 'AR4 after AR3 approval',
            lightingAndActualCasterGeometry: 'existing G engine', collision: 'C# gameplay / shared FXP'},
        status: 'OFFLINE UNLIT SOURCE INPUTS ONLY. NO PHYSICAL SHADOWS, AR3 WEIGHTS, RUNTIME GPU CACHE, GAME COLLISION OR LIVE HUNT APPROVAL'
    };
    files.set('source-bundle-manifest.json', Buffer.from(json(manifest)));
    return {manifest, files};
}

export function writeHardPairingSourceBundle(directory) {
    const {manifest, files} = buildHardPairingSourceBundle();
    mkdirSync(directory, {recursive: true});
    for (const [filename, bytes] of files) {
        writeFileSync(join(directory, filename), bytes);
    }
    return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const directory = process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)),
        '../../../docs/art/previews/wf32-hard-pair-source-bundle');
    console.log(JSON.stringify(writeHardPairingSourceBundle(directory), null, 2));
}
