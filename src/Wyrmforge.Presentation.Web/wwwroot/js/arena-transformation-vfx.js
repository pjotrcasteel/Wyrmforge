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

export function drawTransformation(ctx, enemy, progress, seconds = 0, reducedMotion = false) {
    const palette = transformationPalette(enemy), { x, y } = enemy, body = Math.max(14, enemy.radius || 20), p = clamp(progress);
    const clock = reducedMotion ? 0 : seconds, seed = Math.round(enemy.entityId ?? 1);
    let drawn = 0;
    ctx.save();
    // Dark scorch under the change so the bright parts read on any floor.
    ctx.globalAlpha = .35 * Math.min(1, p * 4); ctx.fillStyle = palette.dark;
    for (let row = -3; row <= 3; row++) { const width = Math.sqrt(Math.max(0, 16 - row * row)) / 4 * body * 2.2; block(ctx, x - width / 2, y + row * body * .16, width, Math.ceil(body * .16)); }

    // Ground rings: two pulses rolling outward from the feet, faster as the change nears its end.
    for (let pulse = 0; pulse < 2; pulse++) {
        const t = ((clock * (1.1 + p * 1.4) + pulse * .5) % 1 + 1) % 1, r = body * (1 + t * 2.6);
        ctx.globalAlpha = (1 - t) * .7; ctx.fillStyle = pulse ? palette.ember : palette.hot;
        const segments = reducedMotion ? 20 : 44;
        for (let i = 0; i < segments; i++) { const a = i / segments * TAU; block(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * .55, 3, 2); drawn++; }
    }

    // Sparks pulled inward while the change builds: the world is being drawn into it.
    if (p < .75) {
        const count = reducedMotion ? 8 : 22;
        for (let i = 0; i < count; i++) {
            const a = unit(seed, i) * TAU, t = ((clock * (.8 + unit(seed, 50 + i)) + unit(seed, 90 + i)) % 1 + 1) % 1, r = body * (3.4 * (1 - t) + .5);
            ctx.globalAlpha = t * .9; ctx.fillStyle = i % 3 === 0 ? palette.core : palette.hot;
            block(ctx, x + Math.cos(a) * r, y - body * .5 + Math.sin(a) * r * .6, 2 + (i % 2), 2);
            drawn++;
        }
    }

    // Embers and debris climbing a column above the body, thicker and higher as it nears the break.
    const rising = reducedMotion ? 10 : 34;
    for (let i = 0; i < rising; i++) {
        const t = ((clock * (.45 + unit(seed, 200 + i) * .6) + unit(seed, 240 + i)) % 1 + 1) % 1;
        const sway = Math.sin(clock * 3 + i) * 5 * (reducedMotion ? 0 : 1), spread = (unit(seed, 280 + i) - .5) * body * 1.8;
        ctx.globalAlpha = Math.sin(Math.PI * t) * (.4 + p * .6); ctx.fillStyle = i % 7 === 0 ? palette.core : i % 3 === 0 ? palette.hot : palette.ember;
        block(ctx, x + spread + sway, y - body * .3 - t * (50 + p * 110), 2 + (i % 3 === 0 ? 1 : 0), 3);
        drawn++;
    }

    // Orbiting shards of the old form, lifting as it prepares to burst.
    const shards = reducedMotion ? 4 : 8;
    for (let i = 0; i < shards; i++) {
        const a = i / shards * TAU + clock * (1.4 + p), r = body * (1.2 + p * .9), lift = p * body * .9;
        ctx.globalAlpha = .9; ctx.fillStyle = i % 2 ? palette.dark : palette.shell;
        block(ctx, x + Math.cos(a) * r, y - lift + Math.sin(a) * r * .5, 3 + (i % 3), 3);
        drawn++;
    }

    // The shell: a flickering ring of light at the body that nothing passes. It brightens toward the break.
    const flicker = reducedMotion ? 1 : .72 + .28 * Math.sin(clock * 24 + seed);
    ctx.globalAlpha = (.35 + .45 * p) * flicker; ctx.fillStyle = palette.shell;
    const shell = reducedMotion ? 24 : 40;
    for (let i = 0; i < shell; i++) { const a = i / shell * TAU + clock; block(ctx, x + Math.cos(a) * body * 1.3, y - body * .35 + Math.sin(a) * body * .95, 3, 3); drawn++; }

    // A pillar of light climbing out of the head.
    ctx.globalAlpha = (.18 + .5 * p) * flicker;
    for (let step = 0; step < 9; step++) { ctx.fillStyle = step % 3 === 0 ? palette.core : palette.hot; block(ctx, x - 2 - (8 - step) * .2, y - body * .8 - step * (10 + p * 8), 4 + (8 - step) * .4, 8 + p * 4); }
    drawn++;

    // The break: the last tenth turns white and throws a ring far out.
    if (p > .9) {
        const t = (p - .9) / .1;
        ctx.globalAlpha = t * .55; ctx.fillStyle = palette.core;
        for (let row = -6; row <= 6; row++) { const width = Math.sqrt(36 - row * row) * body * .32 * (1 + t); block(ctx, x - width / 2, y - body * .35 + row * body * .12, width, Math.ceil(body * .12)); }
        ctx.globalAlpha = (1 - t * .4) * .9;
        for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; block(ctx, x + Math.cos(a) * body * (1.4 + t * 3.5), y + Math.sin(a) * body * (1.4 + t * 3.5) * .55, 4, 3); drawn++; }
    }
    ctx.restore();
    return drawn;
}
