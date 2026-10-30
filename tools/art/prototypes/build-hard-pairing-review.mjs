// Native-pixel review of genuine original source stones, NOT a playable Hunt capture.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { createHardPairingWindow, HARD_PAIRING_VERSION } from './terrain-hard-pairings.mjs';
import { worldLightingMaps } from './terrain-world-variation.mjs';

const FONT = Object.freeze({
    ' ': ['000','000','000','000','000'],
    '>': ['100','010','001','010','100'],
    A: ['010','101','111','101','101'], B: ['110','101','110','101','110'],
    C: ['111','100','100','100','111'], D: ['110','101','101','101','110'],
    E: ['111','100','110','100','111'], F: ['111','100','110','100','100'],
    G: ['111','100','101','101','111'], I: ['111','010','010','010','111'],
    K: ['101','101','110','101','101'], L: ['100','100','100','100','111'],
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

export function buildHardPairingReview() {
    const panelWidth = 256, panelHeight = 224, artHeight = 192;
    const scene = new Bitmap(panelWidth * 3, panelHeight * 2);
    scene.rect(0, 0, scene.width, scene.height, '#17231c');
    const base = [['flagstone','cobble'],['cobble','brick'],['brick','flagstone']];
    const panels = [];
    let representative = null;
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
            }
        }
    }
    return {scene, enlarged: nearest3x(scene), representative,
        manifest: {schema: 'wf32-hard-pairing-review.v1', version: HARD_PAIRING_VERSION,
            status: 'OFFLINE ORIGINAL SOURCE ART - NOT A LIVE HUNT SCREENSHOT',
            nativePixelScale: 1, panelSize: [panelWidth, artHeight],
            panelRows: 2, panelColumns: 3, panels,
            limitations: 'No AR3 placement, physics, G runtime, shadows, or mobile performance acceptance.'}};
}

export function writeHardPairingReview(directory) {
    const review = buildHardPairingReview();
    mkdirSync(directory, {recursive: true});
    const writeImage = (name, bitmap) => writeFileSync(join(directory, name),
        encodePng(bitmap.width, bitmap.height, bitmap.data));
    writeImage('hard-pairing-gallery-native.png', review.scene);
    writeImage('hard-pairing-gallery-3x.png', review.enlarged);
    writeImage('flagstone-cobble-normal.png', review.representative.normal);
    writeImage('flagstone-cobble-roughness.png', review.representative.roughnessMap);
    writeFileSync(join(directory, 'manifest.json'), JSON.stringify(review.manifest, null, 2) + '\n');
    return review.manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const directory = process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)),
        '../../../docs/art/previews/wf32-hard-pairings');
    console.log(JSON.stringify(writeHardPairingReview(directory), null, 2));
}
