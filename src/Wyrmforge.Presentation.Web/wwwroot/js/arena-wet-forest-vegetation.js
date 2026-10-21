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
