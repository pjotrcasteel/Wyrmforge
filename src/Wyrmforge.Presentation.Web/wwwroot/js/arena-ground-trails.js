// Arena Rebuild · Step 2 · floor recipe only.
//
// Visual lab experiment: deterministic connected dirt/mud footpaths and
// eroded clearings painted into the approved material grid. It does NOT import
// an old arena generator, spawn props, create collision or assert gameplay truth.
// Native iOS/Android will ultimately consume a C# authored recipe/snapshot.
const DIRT = 3;
const MUD = 1;

function random01(seed, x, y, channel = 0) {
    let v = (seed | 0) ^ Math.imul(x + 101, 0x9e3779b1) ^
        Math.imul(y + 83, 0x85ebca6b) ^ Math.imul(channel + 17, 0xc2b2ae35);
    v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
    v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

function noise(seed, x, y, channel) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = ease(x - ix), fy = ease(y - iy);
    return lerp(lerp(random01(seed, ix, iy, channel), random01(seed, ix + 1, iy, channel), fx),
        lerp(random01(seed, ix, iy + 1, channel), random01(seed, ix + 1, iy + 1, channel), fx), fy);
}

function distanceToSegment(x, y, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const t = length ? clamp(((x - ax) * dx + (y - ay) * dy) / length, 0, 1) : 0;
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

export function forestTrailPlan(seed, columns, rows) {
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 20 || rows < 30 ||
        columns * rows > 65536) return null;
    // A continuous, meandering spine from North to South. Each row has a
    // centerline (not a chain of disconnected stamps or straight road tiles).
    const span = Math.max(6, Math.round(rows / 10));
    const anchors = [];
    let x = columns * (.44 + random01(seed, 0, 0, 0) * .12);
    for (let index = 0, row = 0; row <= rows + span; index++, row += span) {
        if (index) x = clamp(x + (random01(seed, index, 0, 1) - .5) * columns * .15,
            columns * .24, columns * .76);
        anchors.push({ row, x });
    }
    const spine = Array.from({ length: rows }, (_, row) => {
        const i = Math.min(anchors.length - 2, Math.floor(row / span));
        const t = ease((row - anchors[i].row) / span);
        return lerp(anchors[i].x, anchors[i + 1].x, t);
    });

    // Side branches lead to real open patches of ground, never to phantom
    // ruins, props or disconnected destinations. No cobblestone material.
    const clearings = [.31, .69].map((position, index) => {
        const cy = Math.floor(rows * position + (random01(seed, index, 3, 2) - .5) * rows * .055);
        const sign = index ? -1 : 1;
        const center = spine[cy];
        const distance = columns * (.16 + random01(seed, index, 5, 3) * .07);
        const cx = clamp(center + sign * distance, 5, columns - 6);
        return { cx, cy, rx: 4.2 + random01(seed, index, 7, 4) * 1.8,
            ry: 3.9 + random01(seed, index, 9, 5) * 1.9,
            fromX: center, fromY: cy, sign };
    });
    return { spine, clearings, columns, rows };
}

export function composeForestTrailGround(base, seed, columns, rows) {
    const plan = forestTrailPlan(seed, columns, rows);
    if (!plan || !base || base.length !== columns * rows) return null;
    const board = new Uint8Array(base);
    // Paint the coherent path and the two connected erosion/clearing sites
    // into the EXISTING material-grid; the approved shader/transition painter
    // handles feathering. Never paste images or add another overlay layer.
    for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
            const p = row * columns + col;
            const x = col + .5, y = row + .5;
            const pathCenter = plan.spine[row];
            const contour = (noise(seed, x * .28, y * .25, 10) - .5) * 1.7;
            const halfWidth = 2.1 + noise(seed, .13 * x, .11 * y, 11) * 1.5;
            let pathDistance = Math.abs(x - pathCenter) + contour;
            for (const site of plan.clearings) {
                const bending = (noise(seed, y * .21, x * .17, 12) - .5) * .9;
                pathDistance = Math.min(pathDistance, distanceToSegment(x, y,
                    site.fromX, site.fromY, site.cx, site.cy + bending) - .5);
            }
            let clearingDepth = -Infinity;
            for (const site of plan.clearings) {
                const dx = (x - site.cx) / site.rx, dy = (y - site.cy) / site.ry;
                const irregular = (noise(seed, x * .27, y * .25, 13) - .5) * .30;
                clearingDepth = Math.max(clearingDepth, 1 - Math.hypot(dx, dy) + irregular);
            }
            const inCore = pathDistance < halfWidth - .9 || clearingDepth > .19;
            const inShoulder = pathDistance < halfWidth + .55 || clearingDepth > -.06;
            if (!inCore && !inShoulder) continue;

            const wet = noise(seed, x * .095 + 31, y * .115 + 17, 14);
            if (inCore) {
                // Broad damp stretches, not randomly stamped single pixels.
                board[p] = wet > .68 ? MUD : DIRT;
            } else if (wet > .58 || base[p] === MUD || base[p] === 5) {
                board[p] = MUD;
            } else if (noise(seed, x * .48, y * .44, 15) > .55) {
                board[p] = DIRT; // broken grass fringe, softened by the same material transitions
            }
        }
    return { board, plan };
}
