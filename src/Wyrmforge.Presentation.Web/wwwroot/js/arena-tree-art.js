// Hunt 1.0 trees and undergrowth. A tree is a column of C# terrain (material Wood) that blocks walking and shots and that fire wears away;
// the terrain itself shows only a low root mound. This module draws the upright tree from the gothic forest kit (tools/art/build_gothic_forest_kit.py,
// recoloured from the Pixel Crawler Free Pack by Anokolisa) as a depth layer, so actors pass behind it and the shared lighting engine
// shadows it like any other upright sprite. The Wyrm Influence band picks live, dry, dead or charred art; a worn-down trunk becomes a stump.
// Bushes are cosmetic undergrowth on open ground (nothing blocks), placed by a hash of the cell and cleared wherever the ground is dug.
import { TERRAIN_MATERIAL } from './arena-terrain-canvas.js';
import { forestKit, useForestKit, spriteSource } from './forest-kit.js';
import { cellHash } from './arena-ground-decals.js';
import { undergrowthField } from './arena-undergrowth.js';

export { useForestKit };
export const TREE_MIN_TRUNK_MICROCELLS = 8;
const STUMP_MIN_MICROCELLS = 2;
const MICROCELL_PX = 4;
const FACE = 32;
/** The sprite's roots sit on the root mound, slightly south of the block centre. */
const FOOT_RAISE_PX = 8;
const VARIANTS = Object.freeze({ conifer_l: 4, conifer_s: 4, oak_l: 2, oak_s: 2, pine_l: 2, pine_s: 2 });

/** The art kind for an influence band: living, dry, dead, charred. */
export const canopyKindForBand = band => ['live', 'dry', 'dead', 'charred'][Math.min(3, Math.max(0, band | 0))];

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
        const h = cellHash(column, row, 0, 3);
        const standing = trunk >= TREE_MIN_TRUNK_MICROCELLS;
        trees.push({ key: index, x: (column + .5) * FACE, footY: (row + .5) * FACE - FOOT_RAISE_PX, heightPx: trunk * MICROCELL_PX,
            standing, name: treeSpriteName(kind, h, standing), depth: (row + 1) * FACE });
    }
    frame.treeList = trees; frame.treeBand = band;
    return trees;
}

/** Sprite name of a bush for a band, or null where the Wyrm has left no undergrowth worth drawing. */
export function bushSpriteName(band, hash) {
    const large = ((hash >>> 5) & 3) === 0 ? 2 : 0;
    if (band === 0) return `bush.0.${large}`;
    if (band === 1) return `bush.${1 + ((hash >>> 6) % 3)}.${large}`;
    return `shrub.${band === 2 ? 'dead' : 'charred'}.${(hash >>> 5) & 1}`;
}

// Chance per fully covered cell (see arena-undergrowth.js): scrub is thick at the woods' edge, thins into the meadow and stays off the road.
const BUSH_DENSITY = [.2, .15, .1, .06];

/** Cosmetic undergrowth on open, level ground where the undergrowth field says it grows, cached on the frame. Dug or chipped columns carry none. */
export function collectBushes(frame, band) {
    if (!frame?.material) return [];
    if (frame.bushList && frame.bushBand === band) return frame.bushList;
    const { columns, rows, surface, material } = frame;
    const cover = undergrowthField(frame);
    const density = BUSH_DENSITY[Math.min(3, Math.max(0, band | 0))];
    const bushes = [];
    for (let index = 0; index < material.length; index++) {
        const m = material[index], height = surface[index];
        if ((m !== TERRAIN_MATERIAL.Soil && m !== TERRAIN_MATERIAL.Ash) || height < 0 || height > 8 || frame.fine?.has(index) || cover[index] <= 0) continue;
        const column = index % columns, row = Math.floor(index / columns);
        if (row < 1 || column < 1 || column >= columns - 1) continue;
        const h = cellHash(column, row, frame.visualSeed ?? 0, 21);
        if (h / 4294967296 >= density * cover[index]) continue;
        const flat = [index - 1, index + 1, index - columns, index + columns].every(n => Math.abs(surface[n] - height) <= 2 && material[n] !== TERRAIN_MATERIAL.Lava && !frame.fine?.has(n));
        if (!flat) continue;
        const jitter = (cellHash(column, row, frame.visualSeed ?? 0, 23) % 17) - 8;
        bushes.push({ key: `b${index}`, x: (column + .5) * FACE + jitter, footY: (row + .5) * FACE + 8, heightPx: 0, standing: true,
            name: bushSpriteName(Math.min(3, Math.max(0, band | 0)), cellHash(column, row, 0, 25)), depth: (row + 1) * FACE - 4 });
    }
    frame.bushList = bushes; frame.bushBand = band;
    return bushes;
}
const ROCK_TONES = ['grey', 'grey', 'ash', 'char'];

/** The rock sprites for a boulder of a given height in microcells (taller ones are two rocks piled), or null once it is rubble. */
export function boulderParts(band, height, hash) {
    const tone = ROCK_TONES[Math.min(3, Math.max(0, band | 0))];
    if (height >= 20) return { name: `rock.tall.0.${tone}`, extra: { name: `rock.big.0.${tone}`, dx: (hash >>> 21) & 1 ? 5 : -5, dy: -26 } };
    if (height >= 14) return { name: `rock.tall.0.${tone}` };
    if (height >= 8) return { name: `rock.big.0.${tone}` };
    if (height >= 4) return { name: `rock.lump.${hash % 2}.${tone}` };
    if (height >= 2) return { name: (hash >>> 20) & 1 ? `rock.flat.${hash % 3}.${tone}` : `rock.pebble.${hash % 5}.${tone}` };
    return null;
}

/** Every boulder of a terrain frame as an upright rock that shrinks as C# wears its column down; cached on the frame. */
export function collectBoulders(frame, band) {
    if (!frame?.boulders) return [];
    if (frame.boulderList && frame.boulderBand === band) return frame.boulderList;
    const rocks = [];
    for (const [index, height] of frame.boulders) {
        const column = index % frame.columns, row = Math.floor(index / frame.columns);
        const hash = cellHash(column, row, 0, 31);
        const parts = boulderParts(band, height, hash);
        if (!parts) continue;
        rocks.push({ key: `r${index}`, x: (column + .5) * FACE, footY: (row + .5) * FACE - FOOT_RAISE_PX, heightPx: height * MICROCELL_PX, standing: true,
            name: parts.name, extra: parts.extra, flip: ((hash >>> 22) & 1) === 1, depth: (row + 1) * FACE });
    }
    frame.boulderList = rocks; frame.boulderBand = band;
    return rocks;
}

function drawPart(ctx, loaded, name, footX, footY, flip) {
    const sprite = loaded.sprites[name];
    if (!sprite) return false;
    if (!flip) {
        ctx.drawImage(loaded.image, ...spriteSource(sprite), Math.round(footX - sprite.ax), Math.round(footY - sprite.ay), sprite.w, sprite.h);
        return true;
    }
    ctx.save();
    ctx.translate(Math.round(footX), Math.round(footY - sprite.ay));
    ctx.scale(-1, 1);
    ctx.drawImage(loaded.image, ...spriteSource(sprite), -sprite.ax, 0, sprite.w, sprite.h);
    ctx.restore();
    return true;
}

/** Draws one tree, bush or boulder in world coordinates with its roots on the foot anchor. */
export function drawTree(ctx, tree) {
    const loaded = forestKit();
    if (!loaded || !loaded.sprites[tree.name]) return false;
    drawContactShadow(ctx, tree.name, loaded.sprites[tree.name], tree.x, tree.footY);
    if (!drawPart(ctx, loaded, tree.name, tree.x, tree.footY, tree.flip)) return false;
    if (tree.extra) drawPart(ctx, loaded, tree.extra.name, tree.x + (tree.flip ? -tree.extra.dx : tree.extra.dx), tree.footY + tree.extra.dy, tree.flip);
    return true;
}

/**
 * A soft, stepped shadow pooled under the foot of an upright sprite, so it sits in the ground instead of hovering over it. Radii follow the
 * kind of object (a trunk base is narrow, a boulder as wide as its rock). Built from half-unit steps like the rest of the art.
 */
function drawContactShadow(ctx, name, sprite, x, y) {
    if (typeof ctx.fillRect !== 'function') return;
    const rx = name.startsWith('tree.') ? 12 : name.startsWith('stump.') ? 8 : name.startsWith('rock.') ? Math.max(5, sprite.w * .46) : Math.min(11, sprite.w * .44);
    const ry = rx * (name.startsWith('rock.') ? .36 : .4);
    for (const [scale, alpha] of [[1, .18], [.72, .22], [.44, .26]]) {
        ctx.fillStyle = `rgba(8,5,8,${alpha})`;
        for (let dy = -ry * scale; dy < ry * scale; dy += .5) {
            const half = Math.round(rx * scale * Math.sqrt(Math.max(0, 1 - ((dy + .25) / (ry * scale)) ** 2)) * 2) / 2;
            if (half > 0) ctx.fillRect(x - half, y + 1 + dy, half * 2, .5);
        }
    }
}

/** Depth layers for the trees and bushes inside (or just outside) the camera window; empty until the kit has loaded. */
export function treeLayers(frame, band, camera, width, height) {
    const loaded = forestKit();
    if (!loaded) return [];
    const layers = [];
    for (const tree of [...collectTrees(frame, band), ...collectBushes(frame, band), ...collectBoulders(frame, band)]) {
        const sprite = loaded.sprites[tree.name];
        if (!sprite) continue;
        const spriteHeight = tree.extra ? Math.max(sprite.h, (loaded.sprites[tree.extra.name]?.h ?? 0) - tree.extra.dy) : sprite.h;
        if (tree.x < camera.x - sprite.w || tree.x > camera.x + width + sprite.w || tree.footY < camera.y - 32 || tree.footY - spriteHeight > camera.y + height) continue;
        layers.push({ kind: 'tree', depth: tree.depth, tree: { ...tree, spriteHeight, captureSize: spriteHeight <= 80 ? 160 : spriteHeight <= 176 ? 256 : 384 } });
    }
    return layers;
}
