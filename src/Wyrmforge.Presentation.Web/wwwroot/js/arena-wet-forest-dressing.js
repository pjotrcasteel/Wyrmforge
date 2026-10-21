// Wet Forest visual-only layers. These never invent blockers, loot, collision or attack effects.
// Baked ground texture is deterministic; actor contact is drawn only for visible moving entities.
import { createWetForestRootVeins, createWetForestUnderstory, drawWetForestRootVeins,
    wetForestTreeFireState } from './arena-wet-forest-vegetation.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function randomStream(seed) {
    let s = (seed | 0) ^ 0x6da91c23;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
const pixel = value => Math.round(value / 2) * 2;

// Small ground-level histories tied to EXISTING destructible C# ruins. Broken
// stone chips, blackened timber and churned loam are never upright fake blockers.
export function createWetForestRuinTraces(seed, props = [], width = 950, height = 1550) {
    const marks = [];
    const ruins = new Set(['camp-remains', 'grave-marker', 'waystone', 'broken-cart', 'fallen-log']);
    const colors = {
        'camp-remains': ['#261e1b', '#594332', '#3e332a'],
        'grave-marker': ['#333830', '#5a5b4d', '#3c413a'],
        waystone: ['#363a35', '#545747', '#383e37'],
        'broken-cart': ['#33251e', '#614a35', '#47352a'],
        'fallen-log': ['#292520', '#504031', '#364031'],
    };
    for (const prop of props) {
        if (!ruins.has(prop.kind)) continue;
        const centerX = pixel(prop.x * width), centerY = pixel(prop.y * height);
        const palette = colors[prop.kind];
        const count = prop.kind === 'broken-cart' || prop.kind === 'camp-remains' ? 18 : 10;
        const radius = prop.kind === 'broken-cart' ? 67 : prop.kind === 'fallen-log' ? 52 : 41;
        for (let i = 0; i < count; i++) {
            const a = (i * 2.39996 + prop.id * .41);
            const r = radius * (.42 + .58 * randomHash(seed, prop.id, i));
            const x = pixel(centerX + Math.cos(a) * r);
            const y = pixel(centerY + Math.sin(a) * r * .41);
            const w = i % 4 === 0 ? 10 : i % 3 === 0 ? 6 : 4;
            if (x < 0 || y < 0 || x + w > width || y + 2 > height) continue;
            marks.push({ id: prop.id, x, y, width: w, color: palette[i % palette.length] });
        }
    }
    return marks;
}

function randomHash(seed, id, index) {
    let value = (seed | 0) ^ Math.imul(id | 0, 0x9e3779b1) ^ Math.imul(index | 0, 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

export function createWetForestDressingPlan(seed, props = [], width = 950, height = 1550) {
    const next = randomStream(seed);
    const litter = [];
    // Clumps are tied to local soil and understory, not a uniform particle field.
    const centers = [];
    for (let i = 0; i < 185; i++) {
        const x = next() * width, y = next() * height;
        const count = 3 + Math.floor(next() * 7);
        const radius = 8 + next() * 27;
        const variant = next();
        centers.push({ x: pixel(x), y: pixel(y), radius, variant });
        for (let j = 0; j < count; j++) {
            const angle = next() * Math.PI * 2;
            const dist = Math.sqrt(next()) * radius;
            litter.push({
                x: pixel(x + Math.cos(angle) * dist), y: pixel(y + Math.sin(angle) * dist * .54),
                length: 2 + Math.floor(next() * 4) * 2, kind: variant < .4 ? 'twig' : variant < .73 ? 'leaf' : 'grass',
            });
        }
    }
    const roots = props.filter(p => ['pine', 'dead-tree', 'stump', 'moss-rock', 'fallen-log'].includes(p.kind))
        .map(p => ({ x: pixel(p.x * width), y: pixel(p.y * height), radius: p.radius,
            kind: p.kind, id: p.id }));
    return { litter, roots, ruinTraces: createWetForestRuinTraces(seed, props, width, height),
        rootVeins: createWetForestRootVeins(seed, roots),
        understory: createWetForestUnderstory(seed, roots) };
}

export function drawWetForestDressing(ctx, scene, props, width, height) {
    if (!scene?.wetForest) return;
    const plan = createWetForestDressingPlan(scene.seed, props, width, height);
    ctx.save();
    // Uneven leaf and root contact gives vegetation weight; no new solid geometry is depicted.
    for (const root of plan.roots) {
        const scale = root.kind === 'pine' || root.kind === 'dead-tree' ? 1.5 : 1;
        ctx.fillStyle = '#0d1a19';
        ctx.globalAlpha = .2;
        ctx.beginPath(); ctx.ellipse(root.x + 5, root.y + 3, root.radius * scale + 13, 8, -.16, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#302b25'; ctx.globalAlpha = .27;
        ctx.beginPath(); ctx.ellipse(root.x, root.y, root.radius + 7, 5, 0, 0, 2 * Math.PI); ctx.fill();
        if (root.kind === 'pine' || root.kind === 'dead-tree') {
            // The 70px-tall approved tree now casts a broad, low-contrast canopy shadow
            // across the actual ground. It never reads as an impassable raised wall.
            ctx.fillStyle = '#071413'; ctx.globalAlpha = .17;
            ctx.beginPath(); ctx.ellipse(root.x + 22, root.y + 13, 34, 10, -.23, 0, 2 * Math.PI); ctx.fill();
            ctx.fillStyle = '#314339'; ctx.globalAlpha = .28;
            for (const side of [-1, 1]) {
                ctx.fillRect(root.x + side * (root.radius + 12), root.y - 3, 8, 3);
                ctx.fillRect(root.x + side * (root.radius + 18), root.y + 1, 4, 2);
            }
        }
    }
    // Debris belongs to real physical graves, camps, carts and fallen timber.
    // Flat mineral/wood traces never imply collision beyond those real objects.
    ctx.globalAlpha = .64;
    for (const mark of plan.ruinTraces) {
        ctx.fillStyle = mark.color;
        ctx.fillRect(mark.x, mark.y, mark.width, 2);
    }
    ctx.globalAlpha = 1;
    // Roots and low moss are baked from the SAME C# prop feet, and remain only ground material.
    drawWetForestRootVeins(ctx, plan.rootVeins, plan.understory);
    // Three earthy material families repeat in restrained clusters; every mark is pixel-aligned.
    for (const mark of plan.litter) {
        if (mark.x < 0 || mark.y < 0 || mark.x >= width || mark.y >= height) continue;
        const color = mark.kind === 'twig' ? '#77624a' : mark.kind === 'grass' ? '#516950' : '#665039';
        ctx.fillStyle = color;
        ctx.globalAlpha = mark.kind === 'grass' ? .26 : .22;
        if (mark.kind === 'grass') {
            ctx.fillRect(mark.x, mark.y - 4, 2, 6);
            ctx.fillRect(mark.x + 4, mark.y - 2, 2, 4);
        } else if (mark.kind === 'twig') {
            ctx.fillRect(mark.x, mark.y, mark.length, 2);
            ctx.fillRect(mark.x + mark.length / 2, mark.y - 2, 2, 2);
        } else {
            ctx.fillRect(mark.x, mark.y, mark.length, 3);
            ctx.fillRect(mark.x + 2, mark.y - 2, 2, 2);
        }
    }
    ctx.restore();
}


/**
 * Projected, low-angle ground shadows make EXISTING physical forest props read
 * as upright silhouettes. Rendering is tied to the current C# props snapshot,
 * so a destroyed prop immediately loses its shadow. No new walk blockers.
 */
export function createWetForestCastShadowPlan(seed, props = [], width = 950, height = 1550) {
    const sizes = { pine: 78, 'dead-tree': 66, stump: 22, 'moss-rock': 17,
        'grave-marker': 26, waystone: 38, 'camp-remains': 22, 'broken-cart': 35,
        'fallen-log': 21 };
    const shapes = [];
    for (const prop of props) {
        const length = sizes[prop.kind];
        if (!length) continue;
        const x = pixel(prop.x * width), y = pixel(prop.y * height);
        const jitter = randomHash(seed ^ 0x32e9c14, prop.id, 1);
        const run = pixel(length * (.87 + jitter * .23));
        const rise = pixel(run * (.36 + jitter * .10));
        const girth = prop.kind === 'pine' ? 17 : prop.kind === 'dead-tree' ? 11 :
            Math.min(15, 6 + prop.radius * .15);
        const widthAtRoot = pixel(girth);
        const points = [
            [x - widthAtRoot, y + 1], [x + widthAtRoot, y + 1],
            [x + run * .63, y + rise * .69 + 6],
            [x + run + 4, y + rise + 1],
            [x + run - 6, y + rise + 7],
            [x + run * .55, y + rise * .69 + 9],
        ].map(([px, py]) => [pixel(px), pixel(py)]);
        if (x < 0 || y < 0 || x > width || y > height) continue;
        shapes.push({ id: prop.id, points, alpha: prop.kind === 'pine' ? .29 : .25 });
        // Sparse projected branch cuts make a tree read as tall, not a flat oval.
        if (prop.kind === 'pine' || prop.kind === 'dead-tree') {
            for (const [index, t] of [.32, .64].entries()) {
                const fx = pixel(x + run * t);
                const fy = pixel(y + rise * t + 2);
                shapes.push({ id: prop.id, points: [
                    [fx - 14 + index * 4, fy - 5], [fx + 12, fy + 2],
                    [fx + 26 - index * 4, fy + 10], [fx + 8, fy + 6],
                ].map(([px, py]) => [pixel(px), pixel(py)]), alpha: .13 });
            }
        }
    }
    return shapes;
}

export function drawWetForestCastShadows(ctx, seed, props, width, height) {
    const shadows = createWetForestCastShadowPlan(seed, props, width, height);
    if (!shadows.length) return;
    ctx.save();
    ctx.fillStyle = '#08120f';
    for (const shadow of shadows) {
        ctx.globalAlpha = shadow.alpha;
        ctx.beginPath();
        ctx.moveTo(...shadow.points[0]);
        for (let i = 1; i < shadow.points.length; i++) ctx.lineTo(...shadow.points[i]);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}


/**
 * Reference-grade night lighting must come from a real burning object. This plan
 * is entirely derived from authoritative C# trees, so no imaginary fireplaces,
 * global orange wash, or lighting lingering where a tree was destroyed.
 */
export function createWetForestFirelightPlan(environment, width, height) {
    if (!environment || environment.generatorPreview !== true ||
        environment.habitat !== 'WetForest' || environment.element !== 'fire' ||
        width <= 0 || height <= 0) return [];
    const influence = clamp(Number(environment.corruption) || 0, 0, 1);
    if (influence < .15) return [];
    const seed = environment.seed | 0;
    const lights = [];
    for (const prop of environment.props ?? []) {
        const state = wetForestTreeFireState(prop.kind, prop.id, seed, influence, 'fire');
        if (state !== 'burning' && state !== 'split-glowing') continue;
        const id = prop.id | 0;
        const variant = randomHash(seed ^ 0x45a9d2, id, 1);
        lights.push({ id, x: pixel(prop.x * width), y: pixel(prop.y * height),
            radius: pixel(state === 'split-glowing' ? 104 + variant * 18 : 78 + variant * 28),
            intensity: state === 'split-glowing' ? .30 : .23, state,
        });
    }
    // Upper bound for predictable mobile work, keeping strong fires visually distributed.
    if (lights.length <= 24) return lights;
    const stride = lights.length / 24;
    return Array.from({ length: 24 }, (_, i) => lights[Math.floor(i * stride)]);
}

let wetForestLightSprite = null;
function firelightSprite() {
    if (wetForestLightSprite || typeof document === 'undefined') return wetForestLightSprite;
    const bitmap = document.createElement('canvas');
    bitmap.width = bitmap.height = 192;
    const ctx = bitmap.getContext('2d');
    if (!ctx) return null;
    const glow = ctx.createRadialGradient(96, 96, 2, 96, 96, 96);
    glow.addColorStop(0, 'rgba(246,142,59,.69)');
    glow.addColorStop(.21, 'rgba(226,115,37,.40)');
    glow.addColorStop(.58, 'rgba(158,69,23,.17)');
    glow.addColorStop(1, 'rgba(102,37,15,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 192, 192);
    wetForestLightSprite = bitmap;
    return bitmap;
}

/** Warm pools on soil, stone and roots under actors; the actual flame stays on the tree. */
export function drawWetForestFirelight(ctx, environment, width, height, seconds = 0) {
    const sprite = firelightSprite();
    if (!sprite) return false;
    const lights = createWetForestFirelightPlan(environment, width, height);
    if (!lights.length) return false;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.imageSmoothingEnabled = true;
    for (const light of lights) {
        const flicker = .95 + .045 * Math.sin(seconds * 6.7 + light.id * 2.1) +
            .025 * Math.sin(seconds * 13.9 + light.id);
        ctx.globalAlpha = light.intensity * flicker;
        ctx.drawImage(sprite, light.x - light.radius, light.y - light.radius * .57,
            light.radius * 2, light.radius * 1.14);
    }
    ctx.restore();
    return true;
}

// Contact shadow and wet footprint belong to the exact position supplied by authoritative C#.
// They must remain subtle and BELOW the approved mage/monster sprite; no fake combat telegraphs.
export function drawWetForestActorContact(ctx, x, y, radius, moving = false, phase = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const r = clamp(Number(radius) || 12, 8, 22);
    const px = pixel(x), py = pixel(y);
    ctx.save();
    ctx.fillStyle = '#0e1615';
    ctx.globalAlpha = .46;
    ctx.beginPath(); ctx.ellipse(px, py + 2, r * 1.12, 4, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#526258';
    ctx.globalAlpha = .15;
    ctx.fillRect(px - r + 2, py - 1, r * 1.5, 2);
    if (moving) {
        ctx.fillStyle = '#242d28';
        ctx.globalAlpha = .3;
        const stagger = phase % 2 === 0 ? -1 : 1;
        ctx.fillRect(px - 6, py + 3 + stagger, 5, 2);
        ctx.fillRect(px + 3, py + 2 - stagger, 5, 2);
    }
    ctx.restore();
}

/** Bounded, presentation-only footprint stamps from real authoritative movement. */
export function appendWetForestFootprint(tracks, entityId, x, y, seconds, variant = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(seconds)) return tracks;
    const existing = tracks.findLast(track => track.id === entityId);
    if (!existing || Math.hypot(existing.x - x, existing.y - y) >= 17)
        tracks.push({ id: entityId, x: pixel(x), y: pixel(y), time: seconds, variant });
    // Constant upper bound even during long-running mobile playtests.
    while (tracks.length > 64 || (tracks.length && seconds - tracks[0].time > 3.2)) tracks.shift();
    return tracks;
}

export function drawWetForestFootprints(ctx, tracks, seconds) {
    ctx.save();
    for (const track of tracks) {
        const fade = clamp(1 - (seconds - track.time) / 3.2, 0, 1);
        if (!fade) continue;
        ctx.globalAlpha = .16 * fade;
        ctx.fillStyle = track.variant === 2 ? '#332720' : '#182421';
        ctx.fillRect(track.x - 4, track.y + 1, 4, 2);
        ctx.fillRect(track.x + 2, track.y - 1, 4, 2);
    }
    ctx.restore();
}
