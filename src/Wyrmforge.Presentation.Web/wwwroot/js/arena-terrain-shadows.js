// Moonlight shadows baked into the Hunt 1.0 ground. The shared lighting engine's moon is a directional light that does not cast GPU shadows
// (its normal maps carry the relief), so without this the trees, trunks, boulders and cliffs would stand on the ground without darkening it,
// and the world reads flat. The shadow falls away from the moon, which stands low in the north-west (C# NightSkyLightingProjection: travel
// direction x +.45, y +.6, z -.66): to the east and south on screen. It is derived only from the C# terrain frame (heights, trunks, boulders),
// so it is deterministic, cosmetic, and follows excavation. Shadows are stepped (three levels), never a smooth gradient.
const PER = 8;
/** Unit step toward the moon on the ground plane, in microcells. */
const TOWARD_X = -.6, TOWARD_Y = -.8;
/** Rise in microcells per microcell of horizontal distance the moon's rays climb: its elevation. */
const SLOPE = .9;
const REACH = 24;
/** Alpha of the three shadow levels. */
export const SHADOW_ALPHA = Object.freeze([0, .12, .22, .32]);
/** Samples per column along each axis: half a microcell (2 world units, one 4 px art block). */
export const SHADOW_SAMPLES = 16;

const CROWN = { dx: 8, dy: 10, rx: 13, ry: 8.5 };

/** Per-frame lookup of occluder heights at microcell resolution, cached on the frame (a new merged frame invalidates it). */
export function shadowField(frame) {
    if (frame.shadowField) return frame.shadowField;
    const { columns, rows, surface } = frame;
    const width = columns * PER, height = rows * PER;
    const heights = new Int16Array(width * height);
    const cellMax = new Int16Array(columns * rows), cellMin = new Int16Array(columns * rows);
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const index = row * columns + column, block = frame.fine?.get(index);
        let lo = 32767, hi = -32768;
        for (let my = 0; my < PER; my++) for (let mx = 0; mx < PER; mx++) {
            const h = block?.heights?.length ? block.heights[my * PER + mx] : surface[index];
            heights[(row * PER + my) * width + column * PER + mx] = h;
            if (h < lo) lo = h; if (h > hi) hi = h;
        }
        cellMax[index] = hi; cellMin[index] = lo;
    }
    const raise = (index, x, y, h) => {
        const column = index % columns, row = Math.floor(index / columns);
        const gx = column * PER + x, gy = row * PER + y;
        if (gx < 0 || gy < 0 || gx >= width || gy >= height) return;
        if (h > heights[gy * width + gx]) heights[gy * width + gx] = h;
        if (h > cellMax[index]) cellMax[index] = h;
    };
    // A trunk is a post about 40 cm across; a boulder a dome about 80 cm across. The terrain itself only shows a low mound under either.
    for (const [index, h] of frame.trunks ?? []) if (h > 1) for (let y = 3; y <= 5; y++) for (let x = 3; x <= 5; x++) raise(index, x, y, h);
    for (const [index, h] of frame.boulders ?? []) if (h > 1)
        for (let y = 1; y <= 6; y++) for (let x = 1; x <= 6; x++) {
            const d = Math.hypot(x - 3.5, y - 3.5);
            if (d <= 3.2) raise(index, x, y, Math.round(h * (1 - .08 * d * d)));
        }
    return frame.shadowField = { width, height, heights, cellMax, cellMin };
}

/**
 * The shadow level (0 none, 1 to 3 deeper) of the 16 x 16 half-microcell samples of one column's top face, row-major, or null when nothing
 * shades it. `own` is the ground height of the column, or its 64 microcolumn heights (a dug or shaped column).
 */
export function cellShadow(frame, column, row, own) {
    const field = shadowField(frame), { columns, rows } = frame;
    const whole = typeof own === 'number';
    let ownMin = whole ? own : 32767;
    if (!whole) for (let i = 0; i < own.length; i++) if (own[i] < ownMin) ownMin = own[i];
    let highest = ownMin;
    const crowns = [];
    for (let dy = -3; dy <= 0; dy++) for (let dx = -3; dx <= 0; dx++) {
        const c = column + dx, r = row + dy;
        if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
        const index = r * columns + c;
        if (field.cellMax[index] > highest) highest = field.cellMax[index];
        if ((frame.trunks?.get(index) ?? 0) >= 8) crowns.push({ x: c * PER + CROWN.dx, y: r * PER + CROWN.dy });
    }
    if (highest - ownMin <= 1 && crowns.length === 0) return null;
    const { heights, width, height } = field;
    const levels = new Uint8Array(SHADOW_SAMPLES * SHADOW_SAMPLES);
    let any = false;
    for (let sy = 0; sy < SHADOW_SAMPLES; sy++) for (let sx = 0; sx < SHADOW_SAMPLES; sx++) {
        const px = column * PER + (sx + .5) / 2, py = row * PER + (sy + .5) / 2;
        const h0 = whole ? own : own[(sy >> 1) * PER + (sx >> 1)];
        let level = 0;
        if (highest - h0 > 1) {
            let best = 0;
            for (let s = 1; s <= REACH; s++) {
                const qx = Math.floor(px + TOWARD_X * s), qy = Math.floor(py + TOWARD_Y * s);
                if (qx < 0 || qy < 0 || qx >= width || qy >= height) break;
                const rise = heights[qy * width + qx] - h0 - s * SLOPE;
                if (rise > .5) { const a = Math.min(1, rise / 5) * (1 - s / (REACH + 6)); if (a > best) best = a; }
            }
            level = best > .6 ? 3 : best > .3 ? 2 : best > .06 ? 1 : 0;
        }
        for (const crown of crowns) {
            const q = ((px - crown.x) / CROWN.rx) ** 2 + ((py - crown.y) / CROWN.ry) ** 2;
            if (q < 1) level = Math.max(level, q < .3 ? 3 : q < .65 ? 2 : 1);
        }
        levels[sy * SHADOW_SAMPLES + sx] = level;
        if (level) any = true;
    }
    return any ? levels : null;
}

/** The fill style of a shadow level. */
export const shadowStyle = level => `rgba(6,4,12,${SHADOW_ALPHA[level]})`;
