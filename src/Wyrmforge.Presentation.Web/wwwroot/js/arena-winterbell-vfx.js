// The Bell of Winter (Frost F4b). Where the Fire Bell Warden's marks are bronze lanes to outrun, the winter bell's marks are
// ground and walls: permafrost scars that stay on the floor, toll rings that can only be crossed through their open lanes, and
// marked icicles called down onto the scars. C# owns every timing, lane angle and hit; this module draws exactly what the
// snapshot reports. Hits keep the shared red danger edge; the scars are footing (black ice), so they get a cold edge instead,
// and the open lanes glow pale so the eye finds the way out before the wall (Hades / Gungeon readability rule).

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const DANGER = 'rgba(226, 84, 74, 0.9)';
// Must match RunSimulation.WinterRingThickness: the drawn band is the band that can hurt.
export const WINTER_RING_THICKNESS = 24;
// How high an icicle hangs above its mark before it drops; purely visual.
export const ICICLE_DROP_HEIGHT = 140;

export function isWinterBellTelegraph(kind) {
    return kind === 'winter-slam' || kind === 'winter-toll' || kind === 'winter-recall' || kind === 'winter-rime';
}

export function drawWinterBellTelegraph(ctx, enemy, telegraph) {
    const p = clamp01(telegraph.progress);
    const x = Number(telegraph.targetX) || 0, y = Number(telegraph.targetY) || 0;
    const r = Math.max(4, Number(telegraph.radius) || 0);
    ctx.save();
    if (telegraph.kind === 'winter-slam') {
        // The crater, cracking outward as the bell rises: crystal spokes grow from the edge toward the centre.
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 214, 240, 0.14)';
        ctx.fill();
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r * p, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(210, 242, 255, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(220, 244, 255, 0.55)';
        ctx.lineWidth = 1.25;
        for (let spoke = 0; spoke < 6; spoke++) {
            const angle = spoke * Math.PI / 3 + 0.3;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            ctx.lineTo(x + Math.cos(angle) * r * (1 - 0.6 * p), y + Math.sin(angle) * r * (1 - 0.6 * p));
            ctx.stroke();
        }
    } else if (telegraph.kind === 'winter-toll') {
        // The farthest reach of the rings, closing like frost on glass as the toll gathers.
        ctx.setLineDash?.([4, 7]);
        ctx.strokeStyle = 'rgba(226, 84, 74, 0.55)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.strokeStyle = 'rgba(200, 238, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 50 + 20 * p, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.stroke();
    } else if (telegraph.kind === 'winter-recall') {
        drawIcicleMark(ctx, { x, y, radius: r, progress: p * 0.5 });
    } else {
        // The rime: a cold white ring closing over the bell. Not an attack: no red edge; a free window.
        ctx.setLineDash?.([2, 6]);
        ctx.strokeStyle = 'rgba(235, 248, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash?.([]);
        ctx.beginPath();
        ctx.arc(x, y, r * (1 - 0.7 * p), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 244, 255, ${0.08 + 0.18 * p})`;
        ctx.fill();
    }
    ctx.restore();
}

export function drawWinterBellGround(ctx, snapshot, seconds = 0) {
    if (!snapshot) return;
    for (const scar of snapshot.permafrostScars ?? []) drawPermafrostScar(ctx, scar, seconds);
    for (const ring of snapshot.winterRings ?? []) drawWinterRing(ctx, ring);
    for (const icicle of snapshot.icicles ?? []) if (!icicle.fallen) drawIcicleMark(ctx, icicle);
}

// Overhead pass: hanging icicles drop onto their marks, then burst into shards.
export function drawWinterBellAir(ctx, snapshot) {
    for (const icicle of snapshot?.icicles ?? []) {
        if (icicle.fallen) drawIcicleShatter(ctx, icicle);
        else drawHangingIcicle(ctx, icicle);
    }
}

// A frozen fissure: a jagged dark band of exactly the hurting width, a pale rim, and shards standing in it (the shards the
// recall will call down). It thaws by dimming its shine, never by shrinking, so the footing hazard never lies.
export function drawPermafrostScar(ctx, scar, seconds = 0) {
    const x1 = Number(scar.x1) || 0, y1 = Number(scar.y1) || 0, x2 = Number(scar.x2) || 0, y2 = Number(scar.y2) || 0;
    const half = Math.max(2, Number(scar.halfWidth) || 0);
    const life = clamp01(scar.life);
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 1) return;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.4 + 0.6 * Math.min(1, life * 4);
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.6);
    const teeth = Math.max(3, Math.round(length / 28));
    for (let tooth = 1; tooth <= teeth; tooth++) ctx.lineTo(length * tooth / teeth, (tooth % 2 ? -half : -half * 0.7));
    for (let tooth = teeth; tooth >= 0; tooth--) ctx.lineTo(length * tooth / teeth, (tooth % 2 ? half * 0.7 : half));
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 30, 46, 0.78)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 228, 250, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // A bright vein runs down the middle, its glint travelling outward from the crater.
    const glint = ((Number(seconds) || 0) * 0.5) % 1;
    ctx.strokeStyle = `rgba(230, 248, 255, ${0.2 + 0.5 * life})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();
    ctx.fillStyle = `rgba(240, 252, 255, ${0.5 * life})`;
    ctx.fillRect(length * glint - 6, -1, 12, 2);
    // The shards: one at the middle, one at the tip, the exact points a recall will strike.
    for (const at of [0.5, 1]) drawShardSpike(ctx, length * at, 0, half * 0.9);
    ctx.restore();
}

// A toll ring. Charging rings wait in the bell as a gathering halo. A rolling ring is drawn as its hurting band broken by its
// open lanes; each lane is lit as a pale wedge from the bell to the ring's farthest reach, so the way through reads at once.
export function drawWinterRing(ctx, ring) {
    const x = Number(ring.x) || 0, y = Number(ring.y) || 0;
    const radius = Math.max(1, Number(ring.radius) || 0);
    const max = Math.max(radius, Number(ring.maxRadius) || 0);
    const thickness = Math.max(2, Number(ring.thickness) || WINTER_RING_THICKNESS);
    const charge = clamp01(ring.charge);
    const gaps = Array.isArray(ring.gapAngles) ? ring.gapAngles.map(Number) : [];
    const half = Math.max(0, Number(ring.gapHalfAngle) || 0);
    ctx.save();
    if (charge < 1) {
        ctx.strokeStyle = `rgba(200, 238, 255, ${0.25 + 0.4 * charge})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius * (0.5 + 0.5 * charge), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
    }
    // Lanes must read on pale snow as well as dark stone: a cool tint between dashed steel-blue sides.
    for (const gap of gaps) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, max, gap - half, gap + half);
        ctx.closePath();
        ctx.fillStyle = 'rgba(110, 196, 236, 0.14)';
        ctx.fill();
        ctx.setLineDash?.([5, 6]);
        ctx.strokeStyle = 'rgba(52, 120, 168, 0.6)';
        ctx.lineWidth = 1.25;
        for (const side of [gap - half, gap + half]) {
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(side) * radius, y + Math.sin(side) * radius);
            ctx.lineTo(x + Math.cos(side) * max, y + Math.sin(side) * max);
            ctx.stroke();
        }
        ctx.setLineDash?.([]);
    }
    const sorted = [...gaps].sort((a, b) => a - b);
    const segments = sorted.length === 0
        ? [[0, Math.PI * 2]]
        : sorted.map((gap, index) => [gap + half, (index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + Math.PI * 2) - half]);
    for (const [from, to] of segments) {
        if (to <= from) continue;
        ctx.strokeStyle = 'rgba(96, 166, 210, 0.5)';
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.arc(x, y, radius, from, to);
        ctx.stroke();
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 1.5;
        for (const edge of [-thickness / 2, thickness / 2]) {
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, radius + edge), from, to);
            ctx.stroke();
        }
    }
    ctx.restore();
}

// Where an icicle will land: a red-edged circle at the exact hit radius whose shadow darkens and tightens as it drops.
export function drawIcicleMark(ctx, icicle) {
    const x = Number(icicle.x) || 0, y = Number(icicle.y) || 0;
    const r = Math.max(4, Number(icicle.radius) || 0);
    const p = clamp01(icicle.progress);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150, 214, 240, 0.1)';
    ctx.fill();
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.3 + 0.6 * p), r * (0.15 + 0.3 * p), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(10, 20, 34, ${0.2 + 0.4 * p})`;
    ctx.fill();
    ctx.restore();
}

function drawHangingIcicle(ctx, icicle) {
    const p = clamp01(icicle.progress);
    const x = Number(icicle.x) || 0;
    const y = (Number(icicle.y) || 0) - ICICLE_DROP_HEIGHT * (1 - p * p);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * p;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 30);
    ctx.lineTo(x + 7, y - 30);
    ctx.lineTo(x + 2, y - 6);
    ctx.lineTo(x, y);
    ctx.lineTo(x - 2, y - 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214, 240, 252, 0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 150, 190, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawIcicleShatter(ctx, icicle) {
    const x = Number(icicle.x) || 0, y = Number(icicle.y) || 0;
    const r = Math.max(4, Number(icicle.radius) || 0);
    const fade = clamp01(icicle.fade);
    ctx.save();
    ctx.globalAlpha = 1 - fade;
    ctx.strokeStyle = 'rgba(230, 248, 255, 0.9)';
    ctx.lineWidth = 2;
    for (let shard = 0; shard < 8; shard++) {
        const angle = shard * Math.PI / 4 + 0.2;
        const inner = r * (0.2 + 0.5 * fade), outer = r * (0.5 + 0.6 * fade);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner * 0.6);
        ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer * 0.6);
        ctx.stroke();
    }
    ctx.restore();
}

function drawShardSpike(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y + size * 0.2);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size * 0.35, y + size * 0.2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214, 240, 252, 0.85)';
    ctx.fill();
}
