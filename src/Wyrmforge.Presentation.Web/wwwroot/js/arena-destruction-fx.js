// Cosmetic destruction and fire-zone cues for Hunt 1.0. Presentation only: every cue is derived from a C# terrain delta or the
// C# influence band and never writes back. Crater heat and debris chips make fresh destruction unmistakable; the vignette makes
// the land feel more like a fire domain the closer the hunter gets to the Wyrm.
import { MICRO_PER_COLUMN, MICRO_UNITS, TERRAIN_MATERIAL, veinSegments } from './arena-terrain-canvas.js';
import { FACE_PIXELS, MICROCELL_UNITS, blockTopRect } from './arena-projection.js';

export const HEAT_SECONDS = 7;
export const HEAT_SECONDS_REDUCED = 3;
export const CHIP_SECONDS = 0.8;
export const MAX_CHIPS = 90;
export const MAX_HEAT_SPOTS = 12;
const GRAVITY = 260;

// Dirt and stone chips match the strata colours; the hot ones are embers kicked out of the crater.
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
 * Craters carved between two merged terrain frames: one per changed fine block, centred on the microcolumns that got lower.
 * Positions are screen-space world units (ground y minus height), the same space the painter uses.
 */
export function craterEvents(previous, next) {
    if (!next?.changed?.length) return [];
    const events = [];
    for (const index of next.changed) {
        const block = next.fine?.get(index);
        if (!block) continue;
        const before = previous?.fine?.get(index)?.heights;
        const wholeHeight = previous?.surface?.[index] ?? 0;
        let count = 0, sumX = 0, sumY = 0, sumDepth = 0, deepest = 0;
        for (let micro = 0; micro < MICRO_PER_COLUMN * MICRO_PER_COLUMN; micro++) {
            const dug = (before?.[micro] ?? wholeHeight) - block.heights[micro];
            if (dug <= 0) continue;
            count++; sumDepth += dug;
            sumX += micro % MICRO_PER_COLUMN; sumY += Math.floor(micro / MICRO_PER_COLUMN);
            deepest = Math.min(deepest, block.heights[micro]);
        }
        if (count === 0) continue;
        const column = index % next.columns, row = Math.floor(index / next.columns);
        const mx = sumX / count, my = sumY / count;
        const height = block.heights[Math.round(my) * MICRO_PER_COLUMN + Math.round(mx)];
        events.push({ index, count, depth: sumDepth,
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
            life: reducedMotion ? HEAT_SECONDS_REDUCED : HEAT_SECONDS });
        if (reducedMotion) continue;
        const total = Math.min(16, 4 + Math.floor(event.count / 3));
        for (let n = 0; n < total; n++) {
            const angle = seededUnit(event.seed, n * 3) * Math.PI * 2;
            const speed = 40 + seededUnit(event.seed, n * 3 + 1) * 90;
            const palette = n % 4 === 3 ? CHIP_COLORS.ember : event.stone && n % 2 ? CHIP_COLORS.stone : CHIP_COLORS.dirt;
            fx.chips.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed,
                vy: -Math.abs(Math.sin(angle)) * speed * 1.3 - 30, born: now, life: CHIP_SECONDS * (.7 + seededUnit(event.seed, n * 3 + 2) * .5),
                color: palette[n % palette.length], size: n % 3 === 0 ? 3 : 2, ember: palette === CHIP_COLORS.ember });
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

export function chipPosition(chip, now) {
    const t = now - chip.born;
    return { x: chip.x + chip.vx * t, y: chip.y + chip.vy * t + .5 * GRAVITY * t * t, age: t };
}

/** Drops expired cues; returns whether anything is still alive so callers can skip drawing. */
export function pruneDestructionFx(fx, now) {
    fx.heat = fx.heat.filter(spot => now - spot.born < spot.life);
    fx.chips = fx.chips.filter(chip => now - chip.born < chip.life);
    return fx.heat.length + fx.chips.length > 0;
}

/** Draws hot crater glows (additive) and debris chips over the lit composite in world coordinates; iew only culls. */
export function drawDestructionFx(ctx, fx, now, view) {
    if (!pruneDestructionFx(fx, now)) return 0;
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spot of fx.heat) {
        const strength = heatStrength(now - spot.born, spot.life);
        const x = spot.x, y = spot.y;
        if (strength <= 0.01 || x < view.x - spot.radius || y < view.y - spot.radius || x > view.x + view.width + spot.radius || y > view.y + view.height + spot.radius) continue;
        const gradient = ctx.createRadialGradient(x, y, 1, x, y, spot.radius);
        gradient.addColorStop(0, `rgba(255,190,90,${.62 * strength})`);
        gradient.addColorStop(.45, `rgba(255,90,20,${.34 * strength})`);
        gradient.addColorStop(1, 'rgba(120,20,5,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - spot.radius, y - spot.radius, spot.radius * 2, spot.radius * 2);
        drawn++;
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const chip of fx.chips) {
        const { x, y, age } = chipPosition(chip, now);
        const fade = 1 - age / chip.life;
        if (fade <= 0) continue;
        ctx.globalAlpha = Math.min(1, fade * 1.6);
        ctx.fillStyle = chip.color;
        ctx.fillRect(Math.round(x), Math.round(y), chip.size, chip.size);
        drawn++;
    }
    ctx.restore();
    return drawn;
}

// Edge heat per Wyrm Influence band: none in the wet land, then rising to a furnace glow at the lair.
export const FIRE_ZONE_EDGE_ALPHA = Object.freeze([0, .05, .12, .22]);

export function fireZoneIntensity(band, seconds, reducedMotion = false) {
    const base = FIRE_ZONE_EDGE_ALPHA[Math.min(FIRE_ZONE_EDGE_ALPHA.length - 1, Math.max(0, band | 0))] ?? 0;
    if (base === 0) return 0;
    // A slow breathing flicker, steadier on higher bands because the heat is constant, not a flame.
    return reducedMotion ? base : base * (1 + .16 * Math.sin(seconds * 1.7) + .06 * Math.sin(seconds * 4.3 + 1));
}

/** Warm ember vignette: the screen edges glow like looking into a furnace. Returns the edge alpha used (0 = nothing drawn). */
export function drawFireZoneVignette(ctx, width, height, band, seconds, reducedMotion = false) {
    const alpha = fireZoneIntensity(band, seconds, reducedMotion);
    if (alpha <= 0.004) return 0;
    const radius = Math.hypot(width, height) / 2;
    const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * .45, width / 2, height / 2, radius);
    gradient.addColorStop(0, 'rgba(255,60,10,0)');
    gradient.addColorStop(.7, `rgba(255,70,16,${alpha * .45})`);
    gradient.addColorStop(1, `rgba(255,96,24,${alpha})`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return alpha;
}

/**
 * Glowing ember cracks in undisturbed hot-band ground. They are drawn additively over the lit composite, not baked into the
 * lit ground, so they keep glowing in the dark like real magma seams. Returns the number of seams drawn.
 */
export function drawVeinGlow(ctx, frame, band, view, seconds, reducedMotion = false) {
    if (!frame || !(band >= 2)) return 0;
    const first = Math.max(0, Math.floor(view.x / FACE_PIXELS) - 1);
    const last = Math.min(frame.columns - 1, Math.floor((view.x + view.width) / FACE_PIXELS) + 1);
    const firstRow = Math.max(0, Math.floor(view.y / FACE_PIXELS) - 1);
    const lastRow = Math.min(frame.rows - 1, Math.floor((view.y + view.height + 3 * FACE_PIXELS) / FACE_PIXELS) + 1);
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let row = firstRow; row <= lastRow; row++) {
        for (let column = first; column <= last; column++) {
            const index = row * frame.columns + column;
            if (frame.fine?.has(index) || frame.material[index] === TERRAIN_MATERIAL.Lava) continue;
            const seams = veinSegments(column, row, band);
            if (seams.length === 0) continue;
            const top = blockTopRect(column, row, frame.surface[index]);
            // Each seam pulses on its own phase, like heat moving through the rock.
            const pulse = reducedMotion ? .8 : .78 + .22 * Math.sin(seconds * 2.1 + column * 1.7 + row * 2.9);
            for (const seam of seams) {
                const x = Math.round(top.x + seam.x), y = Math.round(top.y + seam.y);
                // A dim red bloom one pixel around the bright core makes the crack read as emitting light.
                ctx.globalAlpha = pulse * .3;
                ctx.fillStyle = '#b8300a';
                ctx.fillRect(x - 1, y - 1, seam.w + 2, seam.h + 2);
                ctx.globalAlpha = pulse;
                ctx.fillStyle = seam.color;
                ctx.fillRect(x, y, seam.w, seam.h);
            }
            drawn++;
        }
    }
    ctx.restore();
    return drawn;
}