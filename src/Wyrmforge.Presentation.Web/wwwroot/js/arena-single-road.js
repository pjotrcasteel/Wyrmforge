// Wet Forest V2 — ONE seeded ground-level route from a North entrance to the South exit.
// Rendering-independent material recipe. No legacy props, forks, colliders or fake exit scenery.
// Ground atlas painting is handled exclusively by arena-materials.js.
import { naturalGroundPreview } from './arena-materials.js';

const GRASS = 0, MUD = 1, DIRT = 3, MARSH = 5;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const smooth = t => t * t * (3 - 2 * t);

function random(seed, channel) {
    let x = (seed | 0) ^ Math.imul(channel + 17, 0x9e3779b1);
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/**
 * One centreline only, bounded within the ground grid.
 * The centreline returns to exactly the same portal X at both borders.
 * Generated ground is a proposal, not gameplay-valid navigation or a Hunt exit.
 */
export function singleRoadPlan(seed, columns = 48, rows = 72) {
    if (!Number.isSafeInteger(seed) || !Number.isInteger(columns) || !Number.isInteger(rows) ||
        columns < 24 || rows < 32 || columns * rows > 65536) return null;
    const portal = Math.floor(columns / 2);
    const straight = Math.abs(seed % 5) === 0;
    const amplitude = straight ? 0 : columns * (.08 + .095 * random(seed, 2));
    const phase = random(seed, 3) * 2 * Math.PI;
    const repetitions = 1 + Math.floor(random(seed, 4) * 2);
    const spine = Array.from({ length: rows }, (_, row) => {
        const t = row / (rows - 1);
        // sin(pi*t) envelope fixes BOTH endpoints, while the interior is free to meander.
        const displacement = amplitude * Math.sin(Math.PI * t) *
            (.72 * Math.sin(repetitions * Math.PI * 2 * t + phase) +
             .28 * Math.sin(2 * Math.PI * t + phase * .7));
        return clamp(portal + displacement, columns * .24, columns * .76);
    });
    // Exact portal x is a fixed geometric contract, not a random visual approximation.
    spine[0] = portal;
    spine[rows - 1] = portal;
    return {
        version: 1, seed, columns, rows,
        biome: 'wet-forest', style: straight ? 'straight' : 'winding',
        entrance: { edge: 'north', x: portal, y: 0 },
        exit: { id: 'primary', edge: 'south', x: portal, y: rows - 1 },
        exits: 1,
        spine,
    };
}

/**
 * Return BOTH materials and semantic road footprint. Do not derive exits or collision
 * from visible dirt/mud, which can also occur naturally elsewhere in the forest.
 * A road-core mask touches both boundaries and is contiguous row by row.
 */
export function composeSingleRoadGround(seed, columns = 48, rows = 72, base) {
    const plan = singleRoadPlan(seed, columns, rows);
    if (!plan || base && base.length !== columns * rows) return null;
    const board = new Uint8Array(base ?? naturalGroundPreview(seed, columns, rows));
    const roadMask = new Uint8Array(board.length);
    for (let row = 0; row < rows; row++) {
        const t = row / (rows - 1);
        const varyingWidth = 2.5 + .65 * Math.sin(t * Math.PI * 4 + random(seed, 6) * 6);
        for (let col = 0; col < columns; col++) {
            const index = row * columns + col;
            // Vary shoulder shape without bending or fragmenting the centreline.
            const edge = .26 * Math.sin(row * .38 + col * .21 + random(seed, 7) * 5);
            const distance = Math.abs(col + .5 - plan.spine[row]);
            if (distance <= varyingWidth) {
                roadMask[index] = 1;
                // Damp stretches are contiguous bands, never a checkerboard of material changes.
                const wet = Math.sin(row * .16 + random(seed, 8) * 6);
                board[index] = wet > .61 ? MUD : DIRT;
            } else if (distance < varyingWidth + 1.7 + edge) {
                // Soft fringes use the same four original approved material paintings.
                if (board[index] === MARSH || board[index] === MUD ||
                    random(seed + row * 131 + col, 9) > .42) board[index] = MUD;
            }
        }
    }
    // Edge-connected walkable core, including centre pixels at BOTH portal positions.
    roadMask[plan.entrance.y * columns + plan.entrance.x] = 1;
    roadMask[plan.exit.y * columns + plan.exit.x] = 1;
    for (let i = 0; i < board.length; i++)
        if (![GRASS, MUD, DIRT, MARSH].includes(board[i]))
            throw new TypeError('Unexpected Wet Forest material');
    return { board, roadMask, plan };
}
