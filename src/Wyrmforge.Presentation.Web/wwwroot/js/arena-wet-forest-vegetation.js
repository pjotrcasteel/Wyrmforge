// Pixel accents for the actual C# Wet Forest props. No independent/phantom trees or collision.
// Atlas sprites remain the primary silhouettes; these details only anchor them in wet ground.
const snap = value => Math.round(value / 2) * 2;
const isTree = kind => kind === 'pine' || kind === 'dead-tree';

function hash(seed, id, salt = 0) {
    let n = (seed | 0) ^ Math.imul(id | 0, 0x9e3779b1) ^ salt;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
}

// Choose among existing authored 1:1 art frames; do not tint/repaint their pixels.
// This is a Wet Forest Lab decision, NOT a replacement for the other biomes' forest art.
export function wetForestTreeFrame(kind, id, seed) {
    if (kind === 'pine') {
        const variants = ['prop.pine.a', 'prop.pine.b', 'prop.pine.c'];
        return variants[hash(seed, id, 31) % variants.length];
    }
    if (kind === 'dead-tree') {
        const variants = ['prop.deadtree.a', 'prop.deadtree.b'];
        return variants[hash(seed, id, 47) % variants.length];
    }
    return null;
}

/** Ground-only, restrained pixel roots and moss attached to C# object footprints. */
export function createWetForestRootVeins(seed, roots = []) {
    const veins = [];
    for (const root of roots) {
        if (!isTree(root.kind) && root.kind !== 'stump' && root.kind !== 'fallen-log') continue;
        // Relative to the exact authoritative prop foot, not a new random scene object.
        const base = hash(seed, root.id, 91);
        const spread = root.kind === 'fallen-log' ? 16 : root.kind === 'stump' ? 15 : 19;
        const directions = root.kind === 'fallen-log' ? [-1, 1] : [-1, 0, 1];
        for (const side of directions) {
            const sway = ((base >>> ((side + 1) * 5)) & 3) - 1;
            const start = snap(root.x + (side === 0 ? 0 : side * 3));
            for (let step = 0; step < 4; step++) {
                const distance = (step + 1) * spread / 4;
                const x = snap(start + (side === 0 ? sway : side * distance));
                const y = snap(root.y + 1 + step * 2 + (side === 0 ? 3 : Math.abs(sway)));
                veins.push({
                    id: root.id, x, y, width: step === 0 ? 6 : step === 1 ? 4 : 2,
                    color: step % 2 ? '#382f29' : '#252c26',
                });
            }
        }
    }
    return veins;
}

/** Understory grows only from seeded C# physical object positions, never hidden raised props. */
export function createWetForestUnderstory(seed, roots = []) {
    const marks = [];
    for (const root of roots) {
        if (!['pine', 'dead-tree', 'stump', 'moss-rock', 'fallen-log'].includes(root.kind)) continue;
        const value = hash(seed, root.id, 177);
        const count = root.kind === 'pine' ? 7 : root.kind === 'fallen-log' ? 6 : 4;
        const spread = root.kind === 'fallen-log' ? root.radius * .7 : Math.min(27, root.radius + 13);
        for (let i = 0; i < count; i++) {
            const n = hash(value, i, 23);
            const angle = i * 2.39996 + (value % 13) * .13;
            const distance = spread * (.6 + (n % 37) / 100);
            marks.push({
                id: root.id, x: snap(root.x + Math.cos(angle) * distance),
                y: snap(root.y + Math.sin(angle) * distance * .47),
                kind: root.kind === 'dead-tree' ? 'rot' : i % 4 === 0 ? 'sedge' : 'moss',
            });
        }
    }
    return marks;
}

export function drawWetForestRootVeins(ctx, veins, understory) {
    ctx.save();
    for (const vein of veins) {
        ctx.fillStyle = vein.color;
        ctx.globalAlpha = .43;
        ctx.fillRect(vein.x, vein.y, vein.width, 2);
    }
    for (const mark of understory) {
        ctx.globalAlpha = mark.kind === 'rot' ? .28 : .32;
        ctx.fillStyle = mark.kind === 'rot' ? '#65513f' : mark.kind === 'sedge' ? '#53664d' : '#45604c';
        ctx.fillRect(mark.x, mark.y, 4, 2);
        if (mark.kind === 'sedge') ctx.fillRect(mark.x + 2, mark.y - 4, 2, 4);
    }
    ctx.restore();
}

/** Bark grain, lichen and ragged branch ends. World-space anchored to the C# trunk foot. */
export function drawWetForestTreeAccents(ctx, kind, id, seed, x, y) {
    if (!isTree(kind)) return;
    const h = hash(seed, id, 53);
    const px = snap(x), py = snap(y);
    ctx.save();
    // Preserve every pixel of the approved atlas art underneath; add only sparse age marks.
    // Trunk fissures visually point into the baked ground roots.
    ctx.fillStyle = '#191c19';
    ctx.globalAlpha = .8;
    ctx.fillRect(px + (h % 3) - 2, py - 14, 2, 9);
    ctx.fillStyle = '#726552';
    ctx.globalAlpha = .49;
    ctx.fillRect(px + ((h >>> 4) % 3), py - 13, 2, 5);
    if (kind === 'pine') {
        // The pine atlas has small regular tier triangles. Ragged dark extremities break
        // their perfect geometry without creating a second canopy or affecting walkability.
        for (let i = 0; i < 4; i++) {
            const y0 = py - 19 - i * 11;
            const reach = 19 - i * 4;
            const left = ((h >>> (i * 3)) & 1) ? -1 : 1;
            ctx.globalAlpha = .8;
            ctx.fillStyle = '#13251f';
            ctx.fillRect(px + left * reach - 2, y0, 6, 2);
            ctx.fillStyle = '#496150';
            ctx.globalAlpha = .32;
            ctx.fillRect(px - left * (reach - 4), y0 - 3, 3, 2);
        }
    } else {
        // Sparse lichen on the dead-wood branches, never a bright glowing aura.
        for (let i = 0; i < 5; i++) {
            const side = i % 2 ? 1 : -1;
            ctx.globalAlpha = .37;
            ctx.fillStyle = i % 2 ? '#5b6352' : '#455449';
            ctx.fillRect(px + side * (5 + ((h >>> (i + 6)) & 7)), py - 29 - i * 5, 3, 2);
        }
    }
    ctx.restore();
}

 
// A Wet Forest *candidate* tree painter. It deliberately does not replace or rebuild the
// approved shared art atlas. The world-lab renderer uses these larger authored pixel shapes
// only for physical C# pine/dead-tree props; other regions keep their original frames.
const treeArtCache = new Map();
// Ancient, wet, partially dying woodland: broken branch geometry and subdued
// needles rather than rounded luminous green crowns. No post-process tint.
const treeInk = {
    black: '#09110f', shadow: '#101b16', deep: '#18271f', leaf: '#27382d',
    lit: '#344737', edge: '#465343', bark: '#2c251f', barkLight: '#4e4437',
    rot: '#1b1b18', ash: '#413f38',
};

/** Deterministic drawing instructions, relative to the physical trunk's foot. */
export function createWetForestTreeArtPlan(kind, id, seed) {
    if (!isTree(kind)) return null;
    const stamp = hash(seed, id, 203);
    const shapes = [];
    const block = (x, y, w, h, color) => {
        shapes.push({ x: snap(x), y: snap(y), w: Math.max(2, snap(w)),
            h: Math.max(2, snap(h)), color });
    };
    const variation = (salt, range) => hash(stamp, salt, 719) % range;

    // Rotting tree collar connects to the floor's corresponding baked veins.
    block(-10, -6, 20, 6, treeInk.shadow);
    block(-7, -10, 14, 6, treeInk.bark);
    if (kind === 'pine') {
        // Winding central timber and lateral boughs are visible between irregular foliage masses.
        let cx = variation(7, 5) - 2;
        for (let y = -94; y < -8; y += 8) {
            cx += (variation(y + 107, 3) - 1);
            block(cx - 3, y, 8, 12, treeInk.black);
            block(cx - 1, y + 2, 3, 7, treeInk.barkLight);
        }
        // Ragged, narrow bough masses with visible empty space between them.
        // The old wide oval lobes read as soft cartoon broccoli at phone scale.
        const lobes = [
            [-17, -31, 16, 8], [13, -41, 18, 9], [-20, -55, 14, 10],
            [9, -65, 17, 10], [-11, -79, 13, 8], [7, -94, 9, 7],
        ];
        for (let i = 0; i < lobes.length; i++) {
            const [dx, dy, rx, ry] = lobes[i];
            const centerX = dx + variation(i + 8, 11) - 5;
            const centerY = dy + variation(i + 24, 7) - 3;
            for (let sy = -ry; sy <= ry; sy += 4) {
                const spread = Math.sqrt(Math.max(0, 1 - sy * sy / (ry * ry))) * rx;
                const width = Math.max(4, Math.floor(spread / 2) * 2);
                const ragged = (variation(i * 53 + sy + 43, 7) - 3) * 2;
                const low = sy > 0;
                const missingTip = variation(i * 41 + sy + 87, 5) === 0;
                // Chipped ends, asymmetric horizontal splits, dark undersides.
                block(centerX - width + ragged, centerY + sy, Math.max(4, width * 2 - (missingTip ? 8 : 0)), 4,
                    low ? treeInk.shadow : (i % 2 ? treeInk.deep : treeInk.leaf));
                if (width > 10 && variation(i * 29 + sy + 69, 6) === 0)
                    block(centerX + variation(i * 31 + sy + 91, 7) - 6, centerY + sy, 4, 4, treeInk.black);
                // Very few upper planes catch cold diffuse light; never a bright outline.
                if (!low && variation(i * 47 + sy + 117, 4) === 0)
                    block(centerX - Math.floor(width * .5), centerY + sy, Math.max(4, width - 4), 2,
                        i % 3 ? treeInk.lit : treeInk.edge);
            }
        }
        // Ragged branch tips break the outer crown, with dark underside and occasional moss.
        for (const [i, side] of [-1, 1, -1, 1].entries()) {
            const y = -31 - i * 13;
            const reach = 24 - i * 3;
            block(side * reach - (side < 0 ? 6 : 0), y, 8, 3, treeInk.shadow);
            block(side * (reach - 7), y - 2, 5, 2, treeInk.lit);
        }
    } else {
        // Skeletal deadwood: tapered, broken, forked trunk with true negative space.
        let cx = variation(4, 9) - 4;
        for (let y = -88; y <= -8; y += 6) {
            cx += variation(y + 111, 3) - 1;
            const width = y < -66 ? 4 : y < -36 ? 6 : 10;
            block(cx - width / 2, y, width, 8, treeInk.rot);
            if (y % 12 === 0) block(cx - 1, y, 2, 6, treeInk.barkLight);
        }
        for (const [i, side] of [-1, 1, -1, 1, 1].entries()) {
            let x = variation(41 + i, 7) - 3;
            let y = -32 - i * 12;
            const steps = 5 + variation(i + 70, 3);
            for (let k = 0; k < steps; k++) {
                const width = k < 3 ? 4 : 2;
                block(x, y, width, 5, k < 2 ? treeInk.bark : treeInk.rot);
                x += side * (4 + variation(i * 31 + k, 3));
                y -= 3 + variation(k + i * 9, 3);
                if (k > 2 && k % 2 === 1)
                    block(x + side * 3, y + 3, 2, 7, treeInk.ash);
            }
        }
        for (let i = 0; i < 13; i++) {
            const y = -9 - variation(i + 90, 77);
            const x = variation(i + 150, 13) - 6;
            if (i % 2 === 0) block(x, y, 2, 4, treeInk.ash);
        }
    }
    return { id, kind, seed, shapes };
}

function drawWetForestTreeShapes(ctx, plan, offsetX, offsetY) {
    for (const shape of plan.shapes) {
        ctx.fillStyle = shape.color;
        ctx.fillRect(offsetX + shape.x, offsetY + shape.y, shape.w, shape.h);
    }
}

/** Draw the lab-only tree with one cached blit per C# prop; safe on low-end phones. */
export function drawWetForestTreeArt(ctx, kind, id, seed, x, y) {
    if (!isTree(kind)) return false;
    const key = `${seed | 0}:${id | 0}:${kind}`;
    let bitmap = treeArtCache.get(key);
    if (!bitmap && typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 112;
        canvas.height = 128;
        const surface = canvas.getContext('2d');
        if (surface) {
            surface.imageSmoothingEnabled = false;
            drawWetForestTreeShapes(surface, createWetForestTreeArtPlan(kind, id, seed), 56, 118);
            bitmap = canvas;
            if (treeArtCache.size >= 96) treeArtCache.delete(treeArtCache.keys().next().value);
            treeArtCache.set(key, bitmap);
        }
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (bitmap) ctx.drawImage(bitmap, snap(x) - 56, snap(y) - 118);
    else drawWetForestTreeShapes(ctx, createWetForestTreeArtPlan(kind, id, seed), snap(x), snap(y));
    ctx.restore();
    return true;
}
