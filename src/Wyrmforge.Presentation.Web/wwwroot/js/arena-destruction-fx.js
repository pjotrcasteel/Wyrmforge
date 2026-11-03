// Cosmetic destruction and fire-zone cues for Hunt 1.0. Presentation only: every cue is derived from a C# terrain delta or the
// C# influence band and never writes back. Everything is built from the terrain's own 4 px microcells (the divided voxels): hot
// craters, debris, glowing cracks and the bedrock hint are whole-microcell squares in stepped colour ramps, never smooth gradients.
import { MICRO_PER_COLUMN, MICRO_UNITS, TERRAIN_MATERIAL, BEDROCK_MICROCELLS, crackCells, veinRamp } from './arena-terrain-canvas.js';
import { FACE_PIXELS, MICROCELL_UNITS, blockTopRect } from './arena-projection.js';

export const HEAT_SECONDS = 7;
export const HEAT_SECONDS_REDUCED = 3;
export const CHIP_SECONDS = 0.8;
export const MAX_CHIPS = 90;
export const MAX_HEAT_SPOTS = 12;
export const MAX_HEAT_CELLS = 160;
const GRAVITY = 260;

// Dirt and stone chips match the strata colours; the hot ones are embers kicked out of the crater. All are one whole microcell.
const CHIP_COLORS = Object.freeze({ dirt: ['#7a4630', '#52291b', '#3d1f15'], stone: ['#8a8580', '#5c5348', '#4a423a'], ember: ['#ff7a14', '#ffb347'] });

function mix(seed) {
    let h = (Math.imul(seed | 0, 0x9E3779B1) ^ 0x85EBCA6B) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
    return (h ^ (h >>> 15)) >>> 0;
}

/** Deterministic 0..1 stream so the same terrain delta always throws the same chips (replay and test friendly). */
export function seededUnit(seed, step) { return mix(seed * 31 + step) / 4294967296; }

/**
 * Craters carved between two merged terrain frames: one per changed fine block. `cells` are the microcolumns that got lower, as
 * top-left corners of their 4 x 4 px top square in screen-space world units (ground y minus height, the painter's space), with
 * their dug depth; `rim` are the untouched microcolumns beside them.
 */
export function craterEvents(previous, next) {
    if (!next?.changed?.length) return [];
    const events = [];
    for (const index of next.changed) {
        const block = next.fine?.get(index);
        if (!block) continue;
        const before = previous?.fine?.get(index)?.heights;
        const wholeHeight = previous?.surface?.[index] ?? 0;
        const column = index % next.columns, row = Math.floor(index / next.columns);
        const dugAt = new Map();
        let sumX = 0, sumY = 0, sumDepth = 0, deepest = 0;
        for (let micro = 0; micro < MICRO_PER_COLUMN * MICRO_PER_COLUMN; micro++) {
            const dug = (before?.[micro] ?? wholeHeight) - block.heights[micro];
            if (dug <= 0) continue;
            dugAt.set(micro, dug);
            sumDepth += dug; deepest = Math.min(deepest, block.heights[micro]);
            sumX += micro % MICRO_PER_COLUMN; sumY += Math.floor(micro / MICRO_PER_COLUMN);
        }
        const count = dugAt.size;
        if (count === 0) continue;
        const cellAt = micro => {
            const mx = micro % MICRO_PER_COLUMN, my = Math.floor(micro / MICRO_PER_COLUMN);
            return { x: column * FACE_PIXELS + mx * MICRO_UNITS, y: row * FACE_PIXELS + my * MICRO_UNITS - block.heights[micro] * MICROCELL_UNITS };
        };
        const cells = [...dugAt].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, MAX_HEAT_CELLS).map(([micro, depth]) => ({ ...cellAt(micro), depth }));
        const rimSet = new Set();
        for (const micro of dugAt.keys()) {
            const mx = micro % MICRO_PER_COLUMN, my = Math.floor(micro / MICRO_PER_COLUMN);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = mx + dx, ny = my + dy, neighbour = ny * MICRO_PER_COLUMN + nx;
                if (nx >= 0 && nx < MICRO_PER_COLUMN && ny >= 0 && ny < MICRO_PER_COLUMN && !dugAt.has(neighbour)) rimSet.add(neighbour);
            }
        }
        const mx = sumX / count, my = sumY / count;
        const height = block.heights[Math.round(my) * MICRO_PER_COLUMN + Math.round(mx)];
        events.push({ index, count, depth: sumDepth, cells, rim: [...rimSet].slice(0, MAX_HEAT_CELLS).map(micro => cellAt(micro)),
            maxDepth: Math.max(...dugAt.values()),
            x: column * FACE_PIXELS + (mx + .5) * MICRO_UNITS,
            y: row * FACE_PIXELS + (my + .5) * MICRO_UNITS - height * MICROCELL_UNITS,
            // Stone once the bowl reaches the stone line, dirt above it: the chips match the exposed strata.
            stone: deepest <= block.stoneTop, seed: (next.revision ?? 0) * 977 + index });
    }
    return events;
}

export function createDestructionFx() { return { heat: [], chips: [], craters: 0 }; }

/** Records a frame change. `now` is seconds on any monotonic clock shared with `drawDestructionFx`. */
export function observeTerrain(fx, previous, next, now, reducedMotion = false) {
    const events = craterEvents(previous, next);
    for (const event of events) {
        fx.craters++;
        fx.heat.push({ x: event.x, y: event.y, radius: 16 + Math.min(26, Math.sqrt(event.count) * 3.2), born: now,
            cells: event.cells, rim: event.rim, maxDepth: event.maxDepth, life: reducedMotion ? HEAT_SECONDS_REDUCED : HEAT_SECONDS });
        if (reducedMotion) continue;
        const total = Math.min(16, 4 + Math.floor(event.count / 3));
        for (let n = 0; n < total; n++) {
            const angle = seededUnit(event.seed, n * 3) * Math.PI * 2;
            const speed = 40 + seededUnit(event.seed, n * 3 + 1) * 90;
            const palette = n % 4 === 3 ? CHIP_COLORS.ember : event.stone && n % 2 ? CHIP_COLORS.stone : CHIP_COLORS.dirt;
            fx.chips.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle)) * speed * 1.3 - 30, born: now, life: CHIP_SECONDS * (.7 + seededUnit(event.seed, n * 3 + 2) * .5),
                color: palette[n % palette.length], size: MICRO_UNITS, ember: palette === CHIP_COLORS.ember });
        }
    }
    if (fx.heat.length > MAX_HEAT_SPOTS) fx.heat.splice(0, fx.heat.length - MAX_HEAT_SPOTS);
    if (fx.chips.length > MAX_CHIPS) fx.chips.splice(0, fx.chips.length - MAX_CHIPS);
    return events;
}

/** Fresh rock glows white-orange, cools to a deep red and goes out; the curve is steep first so impact reads instantly. */
export function heatStrength(age, life = HEAT_SECONDS) {
    if (!(age >= 0) || age >= life) return 0;
    return Math.pow(1 - age / life, 1.6);
}

/** The ember ramp: four whole colour steps from white-hot to dull red, nothing smooth in between. Null when it has gone out. */
export function heatColor(strength) {
    if (strength > .75) return '#ffe3a0';
    if (strength > .5) return '#ffa63a';
    if (strength > .3) return '#ff6a1a';
    if (strength > .12) return '#b8300a';
    return null;
}

/** A debris cube lands on the 4 px microcell grid like every other voxel. */
export function chipPosition(chip, now) {
    const t = now - chip.born;
    const snap = value => Math.floor(value / MICRO_UNITS) * MICRO_UNITS + 0;
    return { x: snap(chip.x + chip.vx * t), y: snap(chip.y + chip.vy * t + .5 * GRAVITY * t * t), age: t };
}

/** Drops expired cues; returns whether anything is still alive so callers can skip drawing. */
export function pruneDestructionFx(fx, now) {
    fx.heat = fx.heat.filter(spot => now - spot.born < spot.life);
    fx.chips = fx.chips.filter(chip => now - chip.born < chip.life);
    return fx.heat.length + fx.chips.length > 0;
}

/** Draws hot crater microcells (additive) and debris cubes over the lit composite in world coordinates; `view` only culls. */
export function drawDestructionFx(ctx, fx, now, view) {
    if (!pruneDestructionFx(fx, now)) return 0;
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spot of fx.heat) {
        const strength = heatStrength(now - spot.born, spot.life);
        if (strength <= 0.01 || spot.x < view.x - spot.radius || spot.y < view.y - spot.radius
            || spot.x > view.x + view.width + spot.radius || spot.y > view.y + view.height + spot.radius) continue;
        // A faint outer glow: the untouched microcells beside the crater warm up first and cool first.
        if (strength > .3) {
            ctx.globalAlpha = .5;
            ctx.fillStyle = '#7a1f0c';
            for (const cell of spot.rim) { ctx.fillRect(cell.x, cell.y, MICRO_UNITS, MICRO_UNITS); drawn++; }
        }
        ctx.globalAlpha = .85;
        for (const cell of spot.cells) {
            const color = heatColor(strength * (.45 + .55 * cell.depth / spot.maxDepth));
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(cell.x, cell.y, MICRO_UNITS, MICRO_UNITS);
            drawn++;
        }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const chip of fx.chips) {
        const { x, y, age } = chipPosition(chip, now);
        const fade = 1 - age / chip.life;
        if (fade <= 0) continue;
        ctx.globalAlpha = Math.min(1, fade * 1.6);
        ctx.fillStyle = chip.color;
        ctx.fillRect(x, y, chip.size, chip.size);
        drawn++;
    }
    ctx.restore();
    return drawn;
}

// Edge heat per Wyrm Influence band: none in the wet land, then rising to a furnace glow at the lair.
export const FIRE_ZONE_EDGE_ALPHA = Object.freeze([0, .05, .12, .22]);
const VIGNETTE_STEP = 2 * MICRO_UNITS;

export function fireZoneIntensity(band, seconds, reducedMotion = false) {
    const base = FIRE_ZONE_EDGE_ALPHA[Math.min(FIRE_ZONE_EDGE_ALPHA.length - 1, Math.max(0, band | 0))] ?? 0;
    if (base === 0) return 0;
    // A slow breathing flicker, steadier on higher bands because the heat is constant, not a flame.
    return reducedMotion ? base : base * (1 + .16 * Math.sin(seconds * 1.7) + .06 * Math.sin(seconds * 4.3 + 1));
}

/** Warm ember frame: three stepped rings, each two microcells wide, so the screen edges glow like a furnace without a smooth gradient. */
export function drawFireZoneVignette(ctx, width, height, band, seconds, reducedMotion = false) {
    const alpha = fireZoneIntensity(band, seconds, reducedMotion);
    if (alpha <= 0.004) return 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < 3; ring++) {
        const inset = ring * VIGNETTE_STEP;
        ctx.fillStyle = `rgba(255,90,22,${alpha * (1 - ring * .33)})`;
        ctx.fillRect(inset, inset, width - 2 * inset, VIGNETTE_STEP);
        ctx.fillRect(inset, height - inset - VIGNETTE_STEP, width - 2 * inset, VIGNETTE_STEP);
        ctx.fillRect(inset, inset + VIGNETTE_STEP, VIGNETTE_STEP, height - 2 * inset - 2 * VIGNETTE_STEP);
        ctx.fillRect(width - inset - VIGNETTE_STEP, inset + VIGNETTE_STEP, VIGNETTE_STEP, height - 2 * inset - 2 * VIGNETTE_STEP);
    }
    ctx.restore();
    return alpha;
}

/**
 * The generated heat-crack network (C# paths, see `crackCells`) glowing in whole 4 px cells with a one-cell halo, brighter and more
 * yellow the nearer the Wyrm. A warm pulse travels along the cracks like heat moving through the rock. Drawn additively over the
 * lit composite so it keeps glowing in the dark; skipped where the ground has been dug or is lava. Returns the cells drawn.
 */
export function drawCrackGlow(ctx, frame, band, view, seconds, reducedMotion = false) {
    const ramp = veinRamp(band);
    if (!frame || !ramp) return 0;
    const cells = crackCells(frame.cracks);
    if (cells.length === 0) return 0;
    const left = view.x / MICRO_UNITS - 2, right = (view.x + view.width) / MICRO_UNITS + 2;
    const top = view.y / MICRO_UNITS - 2, bottom = (view.y + view.height) / MICRO_UNITS + 2 + 16;
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const cell of cells) {
        if (cell.x < left || cell.x > right || cell.y < top || cell.y > bottom) continue;
        const column = cell.x >> 3, row = cell.y >> 3, index = row * frame.columns + column;
        if (index < 0 || index >= frame.surface.length || frame.fine?.has(index) || frame.material[index] === TERRAIN_MATERIAL.Lava) continue;
        const pulse = reducedMotion ? .8 : .72 + .28 * Math.sin(seconds * 2.2 - (cell.x + cell.y) * .35);
        ctx.globalAlpha = cell.kind === 'core' ? pulse : pulse * .4;
        ctx.fillStyle = cell.kind === 'core' ? ramp.core[cell.tone] : ramp.halo;
        ctx.fillRect(cell.x * MICRO_UNITS, cell.y * MICRO_UNITS - frame.surface[index] * MICROCELL_UNITS, MICRO_UNITS, MICRO_UNITS);
        drawn++;
    }
    ctx.restore();
    return drawn;
}

/**
 * The unbreakable hint: microcells dug down to bedrock carry a faint cold-violet glow and their neighbours an even fainter one,
 * a quiet "this one will not break" that never competes with fire. Returns the microcells lit.
 */
export function drawBedrockGlow(ctx, frame, view, seconds, reducedMotion = false) {
    if (!frame?.fine?.size) return 0;
    const pulse = reducedMotion ? 1 : .75 + .25 * Math.sin(seconds * 1.3);
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#7a5cc8';
    for (const [index, block] of frame.fine) {
        const column = index % frame.columns, row = Math.floor(index / frame.columns);
        const x0 = column * FACE_PIXELS, y0 = row * FACE_PIXELS;
        if (x0 > view.x + view.width || x0 + FACE_PIXELS < view.x || y0 + 4 * FACE_PIXELS < view.y || y0 - 5 * FACE_PIXELS > view.y + view.height) continue;
        const cellAt = (mx, my) => [x0 + mx * MICRO_UNITS, y0 + my * MICRO_UNITS - block.heights[my * MICRO_PER_COLUMN + mx] * MICROCELL_UNITS];
        const lit = new Set();
        for (let micro = 0; micro < block.heights.length; micro++) {
            if (block.heights[micro] > BEDROCK_MICROCELLS) continue;
            const mx = micro % MICRO_PER_COLUMN, my = Math.floor(micro / MICRO_PER_COLUMN);
            ctx.globalAlpha = .16 * pulse;
            const [x, y] = cellAt(mx, my);
            ctx.fillRect(x, y, MICRO_UNITS, MICRO_UNITS);
            drawn++;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = mx + dx, ny = my + dy, key = ny * MICRO_PER_COLUMN + nx;
                if (nx < 0 || nx >= MICRO_PER_COLUMN || ny < 0 || ny >= MICRO_PER_COLUMN || lit.has(key) || block.heights[key] <= BEDROCK_MICROCELLS) continue;
                lit.add(key);
                const [rx, ry] = cellAt(nx, ny);
                ctx.globalAlpha = .07 * pulse;
                ctx.fillRect(rx, ry, MICRO_UNITS, MICRO_UNITS);
                drawn++;
            }
        }
    }
    ctx.restore();
    return drawn;
}