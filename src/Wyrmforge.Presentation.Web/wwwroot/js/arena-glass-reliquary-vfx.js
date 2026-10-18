// Frost F4c: the Reliquary of Glass. C# owns the pylons, the tethers' hit test, the false forms, the prisons and every hit;
// this module only draws what the snapshot reports, at the reported size. Fire's Reliquary pressures in crimson and gilt; the
// glass one boxes in with pale light: burning tethers between crystal pylons, cages of ice rising round the hunter, and a veil
// in which only the true body keeps its lanterns lit. Anything that hurts keeps the red danger edge.
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const DANGER = 'rgba(226, 84, 74, 0.9)';
export const GLASS_RELIQUARY_KIND = 18;
export const CRYSTAL_WARD_KIND = 19;
export const GLASS_FALSE_FORM_KIND = 20;
// Where the true body's four lanterns hang on the sprite (kind 18, scale 1), relative to its anchor: the veil's one honest
// tell. The false forms (kind 20) carry the same lanterns, dead.
export const LANTERN_OFFSETS = [{ x: -28, y: -10 }, { x: -18, y: -2 }, { x: 18, y: -2 }, { x: 28, y: -10 }];
export const PRISON_SPIKES = 14;

const TELEGRAPHS = new Set(['glass-ward', 'glass-veil', 'glass-prison', 'glass-shatter', 'glass-exposed']);

export function isGlassTelegraph(kind) {
    return TELEGRAPHS.has(kind);
}

export function drawGlassTelegraph(ctx, enemy, telegraph) {
    const p = clamp01(telegraph.progress);
    const r = Math.max(8, Number(telegraph.radius) || 0);
    if (telegraph.kind === 'glass-prison') {
        drawPrisonGathering(ctx, telegraph.targetX, telegraph.targetY, r, p);
        return;
    }
    ctx.save();
    ctx.translate(telegraph.targetX, telegraph.targetY);
    if (telegraph.kind === 'glass-ward') {
        // Three pylon sites brighten around the caster: support, so a cool hue, never the red edge.
        ctx.strokeStyle = 'rgba(170, 230, 255, 0.55)';
        ctx.lineWidth = 1.25;
        ctx.setLineDash?.([4, 5]);
        ellipse(ctx, r);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.fillStyle = `rgba(214, 246, 255, ${0.35 + 0.6 * p})`;
        for (let i = 0; i < 3; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
            diamond(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.5, 3 + 4 * p);
        }
    } else if (telegraph.kind === 'glass-veil') {
        // Mirror shards gather on the ring the false forms will take.
        ctx.strokeStyle = `rgba(200, 236, 255, ${0.35 + 0.45 * p})`;
        ctx.lineWidth = 1.5;
        const shards = 9;
        for (let i = 0; i < shards; i++) {
            const a = i * Math.PI * 2 / shards + p * 0.8;
            const d = r * (1.3 - 0.3 * p);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.5 - 6);
            ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d * 0.5 + 6);
            ctx.stroke();
        }
    } else if (telegraph.kind === 'glass-shatter') {
        ctx.strokeStyle = `rgba(236, 248, 255, ${0.5 + 0.4 * p})`;
        ctx.lineWidth = 2;
        ellipse(ctx, r * (0.6 + 0.4 * p));
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + 0.3;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(Math.cos(a) * r * p, Math.sin(a) * r * 0.5 * p - 14);
            ctx.stroke();
        }
    } else if (telegraph.kind === 'glass-exposed') {
        // The veil broke: a gilt opening ring, the window to strike.
        ctx.strokeStyle = `rgba(255, 214, 120, ${0.85 - 0.5 * p})`;
        ctx.lineWidth = 2;
        ellipse(ctx, r * (1 + 0.25 * p));
        ctx.stroke();
    }
    ctx.restore();
}

export function drawGlassReliquaryGround(ctx, snapshot, seconds = 0) {
    if (!snapshot) return;
    for (const prison of snapshot.glassPrisons ?? []) drawPrisonFloor(ctx, prison);
    for (const tether of snapshot.glassTethers ?? []) drawTether(ctx, tether, seconds);
}

export function drawGlassReliquaryAir(ctx, snapshot, seconds = 0) {
    if (!snapshot) return;
    for (const prison of snapshot.glassPrisons ?? []) drawPrisonWall(ctx, prison);
    if (snapshot.reliquary?.variant === 'glass' && snapshot.reliquary.veiled) {
        const boss = (snapshot.enemies ?? []).find(enemy => enemy.kind === GLASS_RELIQUARY_KIND);
        if (boss) drawLanternTell(ctx, boss, seconds);
    }
}

/** A pylon's tether: a faint dashed thread while it kindles, then a burning beam with the danger edge once it can cut. */
export function drawTether(ctx, tether, seconds = 0) {
    const lit = clamp01(tether.lit);
    const half = Math.max(2, Number(tether.halfWidth) || 0);
    ctx.save();
    ctx.lineCap = 'round';
    if (lit < 1) {
        ctx.setLineDash?.([3, 5]);
        ctx.strokeStyle = `rgba(200, 236, 255, ${0.3 + 0.4 * lit})`;
        ctx.lineWidth = 1 + lit;
        line(ctx, tether);
        ctx.setLineDash?.([]);
        ctx.restore();
        return;
    }
    const flicker = 0.85 + 0.15 * Math.sin((Number(seconds) || 0) * 11 + (tether.x1 || 0) * 0.05);
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = half * 2 + 2;
    ctx.globalAlpha = 0.45 * flicker;
    line(ctx, tether);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(190, 236, 255, ${0.7 * flicker})`;
    ctx.lineWidth = half * 2 - 2;
    line(ctx, tether);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.5;
    line(ctx, tether);
    ctx.restore();
}

/** The cage's exact footprint: a closing mark while it rises, then the wall band that costs a hit to cross. */
export function drawPrisonFloor(ctx, prison) {
    const r = Math.max(8, Number(prison.radius) || 0);
    ctx.save();
    ctx.translate(prison.x, prison.y);
    if (!prison.risen) {
        const p = clamp01(prison.rise);
        ctx.setLineDash?.([5, 4]);
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.fillStyle = 'rgba(150, 214, 245, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        // The closing arc: when it meets itself, the cage stands.
        ctx.strokeStyle = 'rgba(214, 246, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.stroke();
        ctx.restore();
        return;
    }
    const life = clamp01(prison.life);
    ctx.globalAlpha = 0.4 + 0.6 * Math.min(1, life * 4);
    if (prison.trapped) {
        ctx.fillStyle = 'rgba(120, 190, 230, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(190, 232, 252, 0.55)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = 1.25;
    for (const edge of [r - 8, r + 8]) {
        ctx.beginPath();
        ctx.arc(0, 0, edge, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

/** The bars of ice: spikes on the circumference that grow as the cage rises and stand while it holds. */
export function drawPrisonWall(ctx, prison) {
    const r = Math.max(8, Number(prison.radius) || 0);
    const height = prison.risen ? 22 : 22 * clamp01(prison.rise) * 0.45;
    if (height <= 0.5) return;
    ctx.save();
    ctx.globalAlpha = prison.risen ? 0.4 + 0.6 * Math.min(1, clamp01(prison.life) * 4) : 0.7;
    for (let i = 0; i < PRISON_SPIKES; i++) {
        const a = i * Math.PI * 2 / PRISON_SPIKES;
        const x = prison.x + Math.cos(a) * r;
        const y = prison.y + Math.sin(a) * r;
        const w = 4 + (i % 3);
        const h = height * (0.75 + (i % 4) * 0.1);
        ctx.fillStyle = 'rgba(214, 244, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(110, 170, 210, 0.7)';
        ctx.fillRect(x, y - h * 0.7, 1, h * 0.6);
    }
    ctx.restore();
}

/** Under the veil every body looks the same but one: the true Reliquary's lanterns still burn with crystal light. */
export function drawLanternTell(ctx, boss, seconds = 0) {
    const flicker = 0.75 + 0.25 * Math.sin((Number(seconds) || 0) * 9);
    const scale = Math.max(0.62, Math.min(1.9, (Number(boss.radius) || 27) / 27));
    ctx.save();
    for (const offset of LANTERN_OFFSETS) {
        const x = boss.x + offset.x * scale;
        const y = boss.y + offset.y * scale;
        ctx.fillStyle = `rgba(150, 224, 255, ${0.3 * flicker})`;
        ctx.beginPath();
        ctx.arc(x, y, 7 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(240, 252, 255, ${0.9 * flicker})`;
        ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
}

function drawPrisonGathering(ctx, x, y, r, p) {
    // It tracks the hunter while it gathers: the ring follows them and closes wherever they stand at the end.
    ctx.save();
    ctx.translate(x, y);
    ctx.setLineDash?.([3, 5]);
    ctx.strokeStyle = DANGER;
    ctx.globalAlpha = 0.35 + 0.5 * p;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.strokeStyle = 'rgba(214, 246, 255, 0.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + p * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, a, a + 0.35 * p);
        ctx.stroke();
    }
    ctx.restore();
}

function line(ctx, tether) {
    ctx.beginPath();
    ctx.moveTo(tether.x1, tether.y1);
    ctx.lineTo(tether.x2, tether.y2);
    ctx.stroke();
}

function ellipse(ctx, r) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2);
}

function diamond(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size * 0.4);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.fill();
}
