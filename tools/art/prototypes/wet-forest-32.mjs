// Original WyrmForge 32px surface art: deliberate pixel forms, no third-party pixels.
// Source-only AR4 candidate. The C# arena recipe and shared G renderer retain authority.
import { Bitmap, packAtlas, rng } from '../lib/painter.mjs';
import { originalMasonryTileSet, reassembleMasonry } from './wet-forest-masonry.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const WET_FOREST_TILE_SIZE = 32;
export const WET_FOREST_PROTO_VERSION = 'wf-original-32.v3';
// Six restrained values per material, with no baked directional light or glowing highlights.
export const WET_FOREST_PALETTES = Object.freeze({
    soil: Object.freeze(['#1b1e1c', '#272824', '#34342c', '#434033', '#555041', '#696252']),
    grass: Object.freeze(['#1d2923', '#29372b', '#354733', '#475b3e', '#5b704a', '#79815d']),
    mud: Object.freeze(['#1b211f', '#282b27', '#34322b', '#463d32', '#5c4f3e', '#75634e']),
    stone: Object.freeze(['#202725', '#2d3532', '#3c4540', '#50574e', '#666b5e', '#7e8170']),
});
const names = Object.freeze(Object.keys(WET_FOREST_PALETTES));
const point = (b, x, y, color) => b.set(x, y, color);
const randomInt = (random, max) => Math.floor(random() * max);

function baseClusters(bitmap, palette, random, count) {
    // Clustered marks rather than independent per-pixel white noise.
    for (let i = 0; i < count; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        const shade = palette[1 + randomInt(random, 4)];
        const width = 2 + randomInt(random, 3);
        bitmap.rect(x, y, width, random() < .28 ? 2 : 1, shade);
        if (random() < .48) bitmap.rect(x + 1, y + 1, width > 2 ? 2 : 1, 1, shade);
    }
}

function fallenLeaf(bitmap, x, y, palette, orientation) {
    // Angular curled leaf, explicitly shaped rather than an ellipse.
    const sign = orientation ? -1 : 1;
    bitmap.line(x - 2 * sign, y, x + 2 * sign, y + 1, palette[4]);
    bitmap.line(x, y - 1, x + sign, y + 2, palette[3]);
    point(bitmap, x - 2 * sign, y + 1, palette[1]);
}

function soilDetails(bitmap, palette, random, variant) {
    // Soil is coarse-grained earth: dry leaf fragments, fine root fibres, and tiny stones.
    for (let i = 0; i < 8 + variant * 2; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        fallenLeaf(bitmap, x, y, palette, random() < .5);
    }
    for (let i = 0; i < 9; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        bitmap.line(x, y, x + 2 + randomInt(random, 4), y + (i % 3 === 0 ? 1 : 0), palette[0]);
        if (random() < .48) point(bitmap, x + 1, y - 1, palette[5]);
    }
    for (let i = 0; i < 4; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        bitmap.rect(x, y, 3, 2, palette[3]);
        bitmap.line(x + 1, y + 2, x + 3, y + 2, palette[0]);
    }
}

function grassTuft(bitmap, x, y, palette, large) {
    const height = large ? 6 : 4;
    bitmap.line(x, y, x - 2, y - height, palette[3]);
    bitmap.line(x + 1, y, x + 2, y - height + 1, palette[4]);
    bitmap.line(x, y, x, y - height + 1, palette[5]);
    bitmap.line(x - 2, y + 1, x + 2, y + 1, palette[1]);
    point(bitmap, x - 2, y - height, palette[5]);
    point(bitmap, x + 2, y - height, palette[3]);
}

function grassDetails(bitmap, palette, random, variant) {
    // Uneven tuft clusters, with visually quiet negative space for combat readability.
    for (let i = 0; i < 13 + variant * 3; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        if (i % 4 === 0) {
            bitmap.rect(x - 3, y - 1, 7, 3, palette[2]);
            bitmap.rect(x - 1, y + 1, 4, 2, palette[3]);
        }
        grassTuft(bitmap, x, y, palette, i % 4 === 0);
    }
    // Isolated small moss islands, not a bright fluorescent carpet.
    for (let i = 0; i < 5; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        bitmap.rect(x, y, 3 + randomInt(random, 3), 2, palette[2]);
        point(bitmap, x + 1, y - 1, palette[4]);
    }
}

function mudDetails(bitmap, palette, random, variant) {
    // Packed wet clay with compressed linear ruts, not luminous pre-rendered puddles.
    for (let i = 0; i < 9 + variant; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        const length = 4 + randomInt(random, 7);
        bitmap.line(x, y, x + length, y, palette[0]);
        bitmap.line(x + 1, y + 1, x + length - 1, y + 1, palette[2]);
        if (i % 3 === 0) bitmap.line(x + 2, y - 1, x + length - 2, y - 1, palette[3]);
    }
    for (let i = 0; i < 5; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        bitmap.rect(x, y, 5 + randomInt(random, 4), 2, palette[1]);
        bitmap.line(x + 2, y + 2, x + 5, y + 2, palette[3]);
    }
    // Occasional straw and small clods prove scale without pretending to be a light map.
    for (let i = 0; i < 4; i++) {
        const x = randomInt(random, 32), y = randomInt(random, 32);
        bitmap.line(x, y, x + 3, y - 1, palette[4]);
        point(bitmap, x + 4, y, palette[0]);
    }
}

function masonry(bitmap, palette, random, variant) {
    // Interlocking, chipped flagstone faces with narrow mortar joints; one art pixel remains one art pixel.
    const rowHeight = [9, 8, 9, 7];
    let top = -5 + variant;
    for (let row = 0; row < 5; row++) {
        const height = rowHeight[row % rowHeight.length];
        let left = row % 2 ? -13 : -5;
        while (left < 37) {
            const width = 10 + randomInt(random, 10);
            bitmap.rect(left, top, width, height, palette[0]);
            const face = palette[2 + randomInt(random, 3)];
            bitmap.rect(left + 1, top + 1, width - 2, height - 2, face);
            if (random() < .17) {
                // Absent or sunken flagstones break up the mechanically straight masonry.
                bitmap.rect(left + 1, top + 1, width - 2, height - 2, palette[1]);
                bitmap.rect(left + 3, top + 2, Math.max(2, width - 7), 2, palette[2]);
                bitmap.line(left + 2, top + height - 2, left + width - 3, top + height - 2, '#34412e');
            }
            if ((left + row + variant) % 3 === 0) {
                bitmap.rect(left + 2, top + 1, 2, 1, palette[1]);
                point(bitmap, left + width - 3, top + height - 2, palette[1]);
            }
            if (random() < .54) {
                const cx = left + 3 + randomInt(random, Math.max(1, width - 6));
                bitmap.line(cx, top + 3, cx + 2, top + 4, palette[1]);
                point(bitmap, cx + 2, top + 5, palette[1]);
            }
            if (random() < .4) {
                point(bitmap, left + width - 2, top + 2, '#47583d');
                point(bitmap, left + width - 3, top + 2, '#34462f');
            }
            left += width;
        }
        top += height;
    }
}

function materialTile(material, variant) {
    if (!names.includes(material) || !Number.isInteger(variant) || variant < 0 || variant > 2)
        throw new RangeError('Unknown Wet Forest material or variant');
    const p = WET_FOREST_PALETTES[material];
    const bitmap = new Bitmap(WET_FOREST_TILE_SIZE, WET_FOREST_TILE_SIZE);
    bitmap.wrap = true;
    bitmap.rect(0, 0, 32, 32, p[2]);
    const random = rng(2011 + names.indexOf(material) * 1009 + variant * 163);
    if (material === 'stone') masonry(bitmap, p, random, variant);
    else {
        baseClusters(bitmap, p, random, material === 'grass' ? 30 : 36);
        switch (material) {
            case 'soil': soilDetails(bitmap, p, random, variant); break;
            case 'grass': grassDetails(bitmap, p, random, variant); break;
            case 'mud': mudDetails(bitmap, p, random, variant); break;
        }
    }
    return bitmap;
}

function materialEdge(from, to, orientation) {
    if (!names.includes(from) || !names.includes(to) || from === to ||
        !['left', 'right', 'top', 'bottom'].includes(orientation)) throw new RangeError('Unknown surface boundary');
    const first = materialTile(from, 1), second = materialTile(to, 1);
    const out = new Bitmap(32, 32);
    const vertical = orientation === 'left' || orientation === 'right';
    const reverse = orientation === 'right' || orientation === 'bottom';
    const seed = (names.indexOf(from) + 1) * 319 + (names.indexOf(to) + 1) * 173 + (vertical ? 37 : 97);
    const random = rng(seed);
    const profile = [];
    let center = 15;
    for (let i = 0; i < 32; i++) {
        if (i % 2 === 0) center = Math.max(11, Math.min(20, center + randomInt(random, 5) - 2));
        profile.push(center);
    }
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const along = vertical ? y : x;
        const across = vertical ? x : y;
        // All directions explicitly state which side belongs to 'from'. Mirroring a completed
        // tile reverses the material's pixel art and is NOT a safe composition rule.
        const coordinate = reverse ? 31 - across : across;
        const fromSide = coordinate < profile[along];
        const source = fromSide ? first : second;
        out.set(x, y, source.get(x, y));
        if (Math.abs(coordinate - profile[along]) < 3 && random() < .26) {
            const accent = fromSide ? WET_FOREST_PALETTES[to] : WET_FOREST_PALETTES[from];
            out.set(x, y, accent[2 + randomInt(random, 2)]);
        }
    }
    return out;
}

function groundDetail(kind) {
    const b = new Bitmap(32, 32);
    if (kind === 'root') {
        // Buried forked old root; one anchored branching motif, not a long floating stick.
        b.line(1, 11, 13, 18, '#292a25', 4);
        b.line(12, 18, 29, 7, '#2a2924', 3);
        b.line(13, 18, 23, 29, '#282823', 3);
        b.line(8, 15, 5, 25, '#323028', 2);
        b.line(2, 10, 13, 17, '#594b37', 2);
        b.line(13, 17, 29, 7, '#5d4b35', 2);
        b.line(13, 18, 22, 28, '#4e4233', 2);
        b.line(8, 15, 5, 24, '#6b5a40');
        for (const [x, y] of [[10, 16], [17, 14], [21, 12], [18, 23]]) point(b, x, y + 1, '#20251f');
    } else {
        // Two bent fronds, pairwise leaflets and a clearly separated base.
        b.line(15, 27, 10, 11, '#3e5639');
        b.line(15, 27, 23, 8, '#4b6543');
        for (let i = 0; i < 5; i++) {
            const yy = 13 + i * 3;
            const xx = 11 + Math.floor(i / 2);
            b.line(xx, yy, xx - 4, yy - 3, '#455f3b');
            b.line(xx + 1, yy + 1, xx + 4, yy - 3, '#597148');
            const rx = 22 - i;
            const ry = 10 + i * 3;
            b.line(rx, ry, rx - 4, ry - 2, '#587347');
            b.line(rx, ry, rx + 3, ry - 3, '#3d5738');
        }
        b.rect(13, 26, 5, 2, '#2c3a2c');
        point(b, 21, 8, '#75845c');
        point(b, 10, 11, '#71825b');
    }
    return b;
}

export function wetForestPrototypeTiles() {
    const tiles = {};
    // The three base stone studies remain as historical art references, NOT free-placeable
    // road paving: actual masonry must use coherent world-phase keys below.
    for (const name of names) for (let variant = 0; variant < 3; variant++)
        tiles[`wetforest.${name}.${variant}`] = materialTile(name, variant);
    for (const [from, to] of [['grass', 'mud'], ['grass', 'soil'], ['soil', 'mud'], ['soil', 'stone']]) {
        for (const direction of ['left', 'right', 'top', 'bottom'])
            tiles[`wetforest.edge.${from}-${to}.${direction}`] = materialEdge(from, to, direction);
    }
    tiles['wetforest.detail.root'] = groundDetail('root');
    tiles['wetforest.detail.fern'] = groundDetail('fern');
    // Phase-keyed surfaces: atlas frames are small; the stone artwork is CONTINUOUS.
    Object.assign(tiles, originalMasonryTileSet());
    return tiles;
}

export function wetForestPrototypeAtlas() {
    return packAtlas(Object.entries(wetForestPrototypeTiles()).map(([name, bitmap]) => ({
        name, bitmap, anchor: [0, 0],
    })), 512, 1);
}

// Grid contact sheet: exact native pixels with 4x nearest-neighbour magnification only.
export function wetForestPrototypeBoard() {
    const collection = wetForestPrototypeTiles();
    const order = [
        ...names.flatMap(name => [0, 1, 2].map(i => `wetforest.${name}.${i}`)),
        ...[['grass', 'mud'], ['grass', 'soil'], ['soil', 'mud'], ['soil', 'stone']].flatMap(
            ([from, to]) => ['left', 'right', 'top', 'bottom'].map(d => `wetforest.edge.${from}-${to}.${d}`)),
        'wetforest.detail.root', 'wetforest.detail.fern',
    ];
    const board = new Bitmap(5 * 32, 6 * 32);
    for (let i = 0; i < order.length; i++) {
        const x = (i % 5) * 32, y = Math.floor(i / 5) * 32;
        board.rect(x, y, 32, 32, '#29352c');
        board.blit(collection[order[i]], x, y);
    }
    return { board, order };
}

// Art-only composition proof: all masonry frames are sampled from ONE continuous world-space
// pattern; replacing randomly selected 32px stone variants is forbidden for paved surfaces.
export function wetForestCompositionStudy() {
    const tiles = wetForestPrototypeTiles();
    const board = new Bitmap(512, 384);
    const random = rng(700331);
    for (let row = 0; row < 12; row++) for (let col = 0; col < 16; col++) {
        const center = 7.3 + Math.sin(row * .39) * 1.35;
        const left = Math.round(center - 2.5), right = Math.round(center + 2.5);
        const choice = (row * 7 + col * 11 + randomInt(random, 3)) % 3;
        const roadMaterial = row > 5 ? 'mud' : 'soil';
        let tile;
        if (col === left) {
            tile = tiles[`wetforest.edge.grass-${roadMaterial}.left`];
        } else if (col === right) {
            tile = tiles[`wetforest.edge.grass-${roadMaterial}.right`];
        } else if (col > left && col < right) {
            tile = tiles[`wetforest.${roadMaterial}.${choice}`];
        } else {
            tile = tiles[`wetforest.grass.${choice}`];
        }
        // Two genuinely different, continuously keyed stonework panels at their native 32px
        // phase. These are only texture studies; C# remains sole authority for real geography.
        if (col >= 11 && row < 5)
            tile = tiles[`wetforest.masonry.flagstone.${col % 8}.${row % 8}`];
        if (col >= 12 && row >= 8)
            tile = tiles[`wetforest.masonry.cobble.${col % 8}.${row % 8}`];
        board.blit(tile, col * 32, row * 32);
        if (col < left - 1 && (row * 11 + col * 17) % 29 === 0)
            board.blit(tiles['wetforest.detail.fern'], col * 32, row * 32);
        if (col > left && col < right && (row * 7 + col * 19) % 17 === 0)
            board.blit(tiles['wetforest.detail.root'], col * 32, row * 32);
    }
    return board;
}

// Generates files only when run as CLI; importing has zero filesystem effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const output = process.argv[2] || 'docs/art/previews/wet-forest-32';
    const { atlas, frames } = wetForestPrototypeAtlas();
    const { board, order } = wetForestPrototypeBoard();
    const scaled = new Bitmap(board.width * 4, board.height * 4);
    for (let y = 0; y < scaled.height; y++) for (let x = 0; x < scaled.width; x++)
        scaled.set(x, y, board.get(Math.floor(x / 4), Math.floor(y / 4)));
    const scene = wetForestCompositionStudy();
    const surfaces = wetForestPrototypeTiles();
    mkdirSync(output, { recursive: true });
    for (const [name, bitmap] of [['atlas.png', atlas], ['contact-4x.png', scaled], ['composition-study.png', scene],
        ['flagstone-field.png', reassembleMasonry(surfaces, 'flagstone')],
        ['cobble-field.png', reassembleMasonry(surfaces, 'cobble')],
        ['brick-field.png', reassembleMasonry(surfaces, 'brick')]])
        writeFileSync(join(output, name), encodePng(bitmap.width, bitmap.height, bitmap.data));
    writeFileSync(join(output, 'manifest.json'), `${JSON.stringify({
        version: WET_FOREST_PROTO_VERSION, tilePixels: 32, status: 'prototype-only',
        atlas: 'atlas.png', frames, order, composition: 'composition-study.png',
        masonry: { phaseCells: 8, periodPixels: 256, types: ['brick', 'flagstone', 'cobble'],
            ordering: 'world-grid phase, never arbitrary random variants' },
        provenance: 'Original source-authored pixels; no reference pack files copied.',
    }, null, 2)}\n`);
    console.log(`Wrote ${Object.keys(frames).length} original Wet Forest frames to ${output}`);
}