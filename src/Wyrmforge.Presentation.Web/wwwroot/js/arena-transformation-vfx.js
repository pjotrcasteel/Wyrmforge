// A boss changing form, presentation only. C# marks the enemy `invulnerable` for the whole change (the cracking bell, the shifting rite, the
// shattering glass) and reports the change's 0 to 1 progress through its telegraph; this only draws that moment: a shell nothing can pass,
// converging sparks, rising embers, orbiting shards, pulsing ground rings and a white flash as it breaks open. It reads and decides nothing.
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const FIRE = { core: '#f7e4ac', hot: '#efa74e', ember: '#be603c', dark: '#2b1717', shell: '#e0a458' };
const FROST = { core: '#f4fbff', hot: '#b8e4f2', ember: '#6aa6c9', dark: '#10202e', shell: '#9ccce0' };
// Enemy kinds of the frost bosses: the Bell of Winter and the Reliquary of Glass.
const FROST_KINDS = new Set([17, 18]);

export const transformationPalette = enemy => FROST_KINDS.has(enemy?.kind) ? FROST : FIRE;

function unit(seed, salt) {
    let h = (Math.imul(seed + 17, 0x9E3779B1) ^ Math.imul(salt + 29, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
    return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
}
const block = (ctx, x, y, w, h = w) => ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));

/** The enemies that are mid-change right now, with their 0 to 1 progress (0.5 when C# gives none). */
export function transformingEnemies(snapshot) {
    return (snapshot?.enemies ?? []).filter(enemy => enemy.invulnerable).map(enemy => ({ enemy, progress: clamp(enemy.telegraph?.progress ?? .5) }));
}

/** Draws every transformation in the snapshot; returns the number of particles and rings drawn. */
export function drawTransformations(ctx, snapshot, seconds = 0, reducedMotion = false) {
    let drawn = 0;
    for (const { enemy, progress } of transformingEnemies(snapshot)) drawn += drawTransformation(ctx, enemy, progress, seconds, reducedMotion);
    return drawn;
}

// Stepped, pixel-blocky glow: nested rows of an ellipse, each layer a little smaller and a little brighter.
function glow(ctx, x, y, rx, ry, color, alpha, layers = 4) {
    ctx.fillStyle = color;
    for (let layer = 0; layer < layers; layer++) {
        const scale = 1 - layer / layers;
        ctx.globalAlpha = alpha * (layer + 1) / layers;
        for (let dy = -ry * scale; dy < ry * scale; dy += 3) {
            const half = rx * scale * Math.sqrt(Math.max(0, 1 - (dy / (ry * scale)) ** 2));
            block(ctx, x - half, y + dy, half * 2, 3);
        }
    }
}

export function drawTransformation(ctx, enemy, progress, seconds = 0, reducedMotion = false) {
    const palette = transformationPalette(enemy), { x, y } = enemy, body = Math.max(18, enemy.radius || 20), p = clamp(progress);
    const clock = reducedMotion ? 0 : seconds, seed = Math.round(enemy.entityId ?? 1);
    const flicker = reducedMotion ? 1 : .75 + .25 * Math.sin(clock * 24 + seed);
    let drawn = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A dome of heat around the whole body that swells as the change nears its end.
    glow(ctx, x, y - body * .4, body * (1.7 + p * 1.5), body * (1.1 + p * .8), palette.ember, (.1 + .16 * p) * flicker);
    drawn++;

    // Ground rings: two pulses rolling outward from the feet, faster as the change nears its end.
    for (let pulse = 0; pulse < 2; pulse++) {
        const t = ((clock * (1.1 + p * 1.4) + pulse * .5) % 1 + 1) % 1, r = body * (1.2 + t * 4);
        ctx.globalAlpha = (1 - t) * .85; ctx.fillStyle = pulse ? palette.ember : palette.hot;
        const segments = reducedMotion ? 24 : 56;
        for (let i = 0; i < segments; i++) { const a = i / segments * TAU; block(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * .55, 4, 3); drawn++; }
    }

    // Sparks pulled inward while the change builds: the world is being drawn into it.
    if (p < .8) {
        const count = reducedMotion ? 10 : 30;
        for (let i = 0; i < count; i++) {
            const a = unit(seed, i) * TAU, t = ((clock * (.8 + unit(seed, 50 + i)) + unit(seed, 90 + i)) % 1 + 1) % 1, r = body * (5 * (1 - t) + .6);
            ctx.globalAlpha = t; ctx.fillStyle = i % 3 === 0 ? palette.core : palette.hot;
            block(ctx, x + Math.cos(a) * r, y - body * .5 + Math.sin(a) * r * .6, 3 + (i % 2), 3);
            drawn++;
        }
    }

    // The pillar: a column of light out of the body, wider and taller as the break nears, with a white-hot core.
    const height = body * (3 + p * 5), width = body * (.55 + p * .5);
    for (let step = 0; step < 10; step++) {
        const rise = step / 10, w = width * (1 - rise * .55);
        ctx.globalAlpha = (.18 + .5 * p) * flicker * (1 - rise * .6); ctx.fillStyle = palette.hot;
        block(ctx, x - w / 2, y - body * .5 - rise * height, w, height / 10 + 1);
        ctx.globalAlpha *= .9; ctx.fillStyle = palette.core;
        block(ctx, x - w / 5, y - body * .5 - rise * height, Math.max(2, w * .4), height / 10 + 1);
    }
    drawn++;

    // Embers and debris climbing the column, thicker and higher as it nears the break.
    const rising = reducedMotion ? 12 : 48;
    for (let i = 0; i < rising; i++) {
        const t = ((clock * (.45 + unit(seed, 200 + i) * .6) + unit(seed, 240 + i)) % 1 + 1) % 1;
        const sway = Math.sin(clock * 3 + i) * 6 * (reducedMotion ? 0 : 1), spread = (unit(seed, 280 + i) - .5) * body * 3;
        ctx.globalAlpha = Math.sin(Math.PI * t) * (.5 + p * .5); ctx.fillStyle = i % 7 === 0 ? palette.core : i % 3 === 0 ? palette.hot : palette.ember;
        block(ctx, x + spread + sway, y - body * .3 - t * (80 + p * 190), 3 + (i % 4 === 0 ? 1 : 0), 4);
        drawn++;
    }

    // The shell: a ring of light around the body that nothing passes. It brightens toward the break.
    ctx.globalAlpha = (.5 + .45 * p) * flicker; ctx.fillStyle = palette.shell;
    const shell = reducedMotion ? 28 : 48;
    for (let i = 0; i < shell; i++) { const a = i / shell * TAU + clock; block(ctx, x + Math.cos(a) * body * 1.5, y - body * .4 + Math.sin(a) * body * 1.1, 4, 4); drawn++; }

    // The break: the last tenth floods white and throws a ring far out.
    if (p > .88) {
        const t = (p - .88) / .12;
        glow(ctx, x, y - body * .4, body * (2.5 + t * 3), body * (1.8 + t * 1.5), palette.core, .55 * t, 3);
        ctx.globalAlpha = (1 - t * .5); ctx.fillStyle = palette.core;
        for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; block(ctx, x + Math.cos(a) * body * (1.8 + t * 5), y + Math.sin(a) * body * (1.8 + t * 5) * .55, 5, 4); drawn++; }
    }

    // Orbiting shards of the old form are solid, so they keep their colour over the light.
    ctx.globalCompositeOperation = 'source-over';
    const shards = reducedMotion ? 5 : 10;
    for (let i = 0; i < shards; i++) {
        const a = i / shards * TAU + clock * (1.4 + p), r = body * (1.5 + p * .9), lift = p * body * .9;
        ctx.globalAlpha = .95; ctx.fillStyle = i % 2 ? palette.dark : palette.shell;
        block(ctx, x + Math.cos(a) * r, y - lift + Math.sin(a) * r * .5, 4 + (i % 3) * 2, 4);
        drawn++;
    }
    ctx.restore();
    return drawn;
}