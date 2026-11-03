// Hunt 1.0 trees. A tree is a column of C# terrain (material Wood) that blocks walking and shots and that fire wears away; the terrain
// itself shows only a low root mound. This module draws the upright tree from the gothic forest kit (tools/art/build_gothic_forest_kit.py,
// recoloured from the Pixel Crawler Free Pack by Anokolisa) as a depth layer, so actors pass behind it and the shared lighting engine
// shadows it like any other upright sprite. The Wyrm Influence band picks live, dry, dead or charred art; a worn-down trunk becomes a stump.
import { TERRAIN_MATERIAL } from './arena-terrain-canvas.js';

export const TREE_MIN_TRUNK_MICROCELLS = 8;
const STUMP_MIN_MICROCELLS = 2;
const MICROCELL_PX = 4;
const FACE = 32;
/** The sprite's roots sit on the root mound, slightly south of the block centre. */
const FOOT_RAISE_PX = 8;
const VARIANTS = Object.freeze({ conifer_l: 4, conifer_s: 4, oak_l: 2, oak_s: 2, pine_l: 2, pine_s: 2 });

/** The art kind for an influence band: living, dry, dead, charred. */
export const canopyKindForBand = band => ['live', 'dry', 'dead', 'charred'][Math.min(3, Math.max(0, band | 0))];

let kit = null;
let kitRequested = false;
/** Installs a kit (`{ sprites, image }`) directly; used by tests and by anything that already holds the atlas. */
export function useForestKit(value) { kit = value; kitRequested = true; }

async function loadForestKit() {
    const base = new URL('../art/environment/forest/', import.meta.url);
    const json = await (await fetch(new URL('forest-kit.json', base))).json();
    const image = new Image();
    image.src = new URL(json.atlas, base).href;
    await image.decode();
    return { sprites: json.sprites, image };
}

/** The loaded kit, or null while it is still downloading (trees simply appear once it is there). */
export function forestKit() {
    if (!kit && !kitRequested && typeof Image !== 'undefined' && typeof fetch !== 'undefined') {
        kitRequested = true;
        loadForestKit().then(loaded => { kit = loaded; }).catch(() => { });
    }
    return kit;
}

/** Sprite name for a tree: family, size and variant come from the cell's hash so a tree never changes shape while it burns. */
export function treeSpriteName(kind, hash, standing = true) {
    const roll = (hash >>> 8) % 100;
    const family = roll < 45 ? 'conifer' : roll < 70 ? 'oak' : 'pine';
    const model = `${family}_${(hash >>> 4) & 1 ? 's' : 'l'}`;
    if (!standing) return `stump.${model}.${kind === 'charred' ? 'charred' : 'live'}`;
    const variant = kind === 'live' || kind === 'dry' ? (hash >>> 16) % VARIANTS[model] : 0;
    return `tree.${model}.${kind}.${variant}`;
}

/** Every tree and stump of a terrain frame, cached on the frame object (a new merged frame invalidates it). */
export function collectTrees(frame, band) {
    if (!frame?.material) return [];
    if (frame.treeList && frame.treeBand === band) return frame.treeList;
    const kind = canopyKindForBand(band);
    const trees = [];
    for (let index = 0; index < frame.material.length; index++) {
        if (frame.material[index] !== TERRAIN_MATERIAL.Wood) continue;
        const trunk = frame.trunks?.get(index) ?? frame.surface[index];
        if (trunk < STUMP_MIN_MICROCELLS) continue;
        const column = index % frame.columns, row = Math.floor(index / frame.columns);
        let h = (Math.imul(column + 3, 0x9E3779B1) ^ Math.imul(row + 5, 0x85EBCA6B)) >>> 0;
        h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
        const standing = trunk >= TREE_MIN_TRUNK_MICROCELLS;
        trees.push({ key: index, x: (column + .5) * FACE, footY: (row + .5) * FACE - FOOT_RAISE_PX, heightPx: trunk * MICROCELL_PX,
            standing, name: treeSpriteName(kind, h, standing), depth: (row + 1) * FACE });
    }
    frame.treeList = trees; frame.treeBand = band;
    return trees;
}

/** Draws one tree in world coordinates with its roots on the foot anchor. */
export function drawTree(ctx, tree) {
    const loaded = forestKit();
    const sprite = loaded?.sprites[tree.name];
    if (!sprite) return false;
    ctx.drawImage(loaded.image, sprite.x, sprite.y, sprite.w, sprite.h, Math.round(tree.x - sprite.ax), Math.round(tree.footY - sprite.ay), sprite.w, sprite.h);
    return true;
}

/** Depth layers for the trees inside (or just outside) the camera window; empty until the kit has loaded. */
export function treeLayers(frame, band, camera, width, height) {
    const loaded = forestKit();
    if (!loaded) return [];
    const layers = [];
    for (const tree of collectTrees(frame, band)) {
        const sprite = loaded.sprites[tree.name];
        if (!sprite) continue;
        if (tree.x < camera.x - sprite.w || tree.x > camera.x + width + sprite.w || tree.footY < camera.y - 32 || tree.footY - sprite.h > camera.y + height) continue;
        layers.push({ kind: 'tree', depth: tree.depth, tree: { ...tree, spriteHeight: sprite.h, captureSize: sprite.h <= 176 ? 256 : 384 } });
    }
    return layers;
}
