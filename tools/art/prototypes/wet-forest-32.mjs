// WyrmForge original pixel art study. No third-party image pixels or generative-image inputs.
// Optional AR4 candidate; deliberately NOT wired to the live terrain renderer before AR3 approval.
import { Bitmap, packAtlas, rng } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WET_FOREST_TILE_SIZE = 32;
export const WET_FOREST_PROTO_VERSION = 'wf-original-32.v1';
const palettes = Object.freeze({
    soil: ['#292723', '#302d28', '#39342d', '#464039', '#514b40', '#605649'],
    grass: ['#222b24', '#2b362c', '#344536', '#3c503d', '#4d6045', '#627054'],
    mud: ['#211f1e', '#292724', '#34302a', '#413a31', '#514538', '#635445'],
    stone: ['#282d2d', '#313737', '#3b4240', '#494e49', '#565c54', '#65685d'],
});
const names = Object.freeze(Object.keys(palettes));
const point = (b, x, y, c) => b.rect(x, y, 1, 1, c);

function materialTile(material, variant) {
    if (!names.includes(material) || !Number.isInteger(variant) || variant < 0 || variant > 2)
        throw new RangeError('Unknown Wet Forest material or variant');
    const p = palettes[material];
    const b = new Bitmap(WET_FOREST_TILE_SIZE, WET_FOREST_TILE_SIZE);
    b.wrap = true;
    b.rect(0, 0, 32, 32, p[1]);
    const random = rng(101 + names.indexOf(material) * 997 + variant * 117);
    // Tiny authored-looking clusters; never broad gradients, halos or prelit reflections.
    for (let i = 0; i < 75; i++) {
        const x = Math.floor(random() * 32), y = Math.floor(random() * 32);
        const tone = p[Math.floor(random() * 5)];
        const w = 1 + Math.floor(random() * 3);
        const h = random() < .23 ? 2 : 1;
        b.rect(x, y, w, h, tone);
        if (random() < .33) point(b, x + w, y + 1, p[2]);
    }
    // Surface-specific hand-authored vocabulary; all positions wrap at tile boundaries.
    if (material === 'grass') {
        for (let i = 0; i < 18; i++) {
            const x = Math.floor(random() * 32), y = Math.floor(random() * 32);
            b.line(x, y + 2, x - 1, y - (2 + Math.floor(random() * 3)), p[3]);
            b.line(x + 1, y + 2, x + 2, y - 2, p[4]);
            point(b, x, y + 1, p[0]);
        }
    } else if (material === 'soil') {
        for (let i = 0; i < 13; i++) {
            const x = Math.floor(random() * 32), y = Math.floor(random() * 32);
            b.line(x, y, x + 3 + Math.floor(random() * 4), y + (random() < .5 ? 0 : 1), p[0]);
            if (random() < .45) point(b, x + 2, y - 1, p[4]);
        }
    } else if (material === 'mud') {
        for (let i = 0; i < 9; i++) {
            const x = Math.floor(random() * 32), y = Math.floor(random() * 32);
            b.rect(x, y, 4 + Math.floor(random() * 4), 2, p[0]);
            b.line(x + 1, y + 2, x + 4, y + 2, p[3]);
            // Wet surfaces have a muted neutral light response, never a painted blue mirror.
        }
    } else if (material === 'stone') {
        for (let i = 0; i < 7; i++) {
            const x = Math.floor(random() * 32), y = Math.floor(random() * 32);
            b.line(x, y, x + 2, y + 1, p[0]);
            b.line(x + 2, y + 1, x + 3, y + 3, p[0]);
            point(b, x + 1, y - 1, p[4]);
        }
    }
    return b;
}

function materialEdge(orientation) {
    const left = materialTile('grass', 1), right = materialTile('mud', 1);
    const out = new Bitmap(32, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const along = orientation === 'vertical' ? y : x;
        const across = orientation === 'vertical' ? x : y;
        // Pixel-stepped organic boundary, as an art sample. Final blending uses C# weight maps.
        const boundary = 16 + Math.round(3 * Math.sin(along * .38) + 2 * Math.sin(along * .91));
        out.set(x, y, (across < boundary ? left : right).get(x, y));
    }
    return out;
}

function groundDetail(kind) {
    const b = new Bitmap(32, 32);
    if (kind === 'root') {
        b.line(2, 12, 16, 17, '#312b25', 2);
        b.line(16, 17, 29, 11, '#443c30', 2);
        b.line(15, 17, 21, 27, '#302b26');
        b.line(9, 14, 6, 23, '#514538');
        b.line(16, 16, 26, 13, '#625543');
    } else {
        b.rect(5, 16, 4, 2, '#4d5a41');
        b.line(8, 16, 4, 11, '#344d35');
        b.line(17, 21, 13, 13, '#425a3c');
        b.line(17, 21, 23, 12, '#4b6346');
        b.line(24, 20, 26, 14, '#344a33');
        for (const [x, y] of [[4, 10], [13, 12], [23, 11], [26, 13]]) point(b, x, y, '#6b7959');
    }
    return b;
}

export function wetForestPrototypeTiles() {
    const tiles = {};
    for (const name of names) for (let variant = 0; variant < 3; variant++)
        tiles[`wetforest.${name}.${variant}`] = materialTile(name, variant);
    tiles['wetforest.edge.grass-mud.vertical'] = materialEdge('vertical');
    tiles['wetforest.edge.grass-mud.horizontal'] = materialEdge('horizontal');
    tiles['wetforest.detail.root'] = groundDetail('root');
    tiles['wetforest.detail.fern'] = groundDetail('fern');
    return tiles;
}

export function wetForestPrototypeAtlas() {
    return packAtlas(Object.entries(wetForestPrototypeTiles()).map(([name, bitmap]) => ({
        name, bitmap, anchor: [0, 0],
    })), 256, 1);
}

// Deterministic study board, NOT an in-game arena or an authoritative terrain recipe.
export function wetForestPrototypeBoard() {
    const collection = wetForestPrototypeTiles();
    const order = [
        ...names.flatMap(name => [0, 1, 2].map(i => `wetforest.${name}.${i}`)),
        'wetforest.edge.grass-mud.vertical', 'wetforest.edge.grass-mud.horizontal',
        'wetforest.detail.root', 'wetforest.detail.fern',
    ];
    const board = new Bitmap(4 * 32, 4 * 32);
    for (let i = 0; i < order.length; i++) {
        const x = (i % 4) * 32, y = Math.floor(i / 4) * 32;
        board.rect(x, y, 32, 32, '#2b3029');
        board.blit(collection[order[i]], x, y);
    }
    return { board, order };
}

// Generates files only when run as a CLI; importing this module has no side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const output = process.argv[2] || 'docs/art/previews/wet-forest-32';
    const { atlas, frames } = wetForestPrototypeAtlas();
    const { board, order } = wetForestPrototypeBoard();
    const scaled = new Bitmap(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) scaled.set(x, y, board.get(Math.floor(x / 4), Math.floor(y / 4)));
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'atlas.png'), encodePng(atlas.width, atlas.height, atlas.data));
    writeFileSync(join(output, 'contact-4x.png'), encodePng(scaled.width, scaled.height, scaled.data));
    writeFileSync(join(output, 'manifest.json'), `${JSON.stringify({
        version: WET_FOREST_PROTO_VERSION, tilePixels: 32, status: 'prototype-only',
        atlas: 'atlas.png', frames, order,
        provenance: 'Original source-authored pixels; no reference pack files copied.',
    }, null, 2)}\n`);
    console.log(`Wrote ${Object.keys(frames).length} original Wet Forest frames to ${output}`);
}
