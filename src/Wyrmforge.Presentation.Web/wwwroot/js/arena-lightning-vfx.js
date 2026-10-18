// Storm chain lightning. C# reports each arc as a straight segment with a life; this module only makes it read
// like lightning: a jagged midpoint-displaced bolt with a glow underlay, a white-hot core, short forks and a spark
// where it bites (the Diablo / Risk of Rain chain-lightning read). The shape is seeded from the segment and re-rolled
// every 40 ms for flicker, so it is deterministic per frame and perfectly still under reduced motion.

const FLICKER_SECONDS = 0.04;
const FADE_SECONDS = 0.12;

export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function lightningSeed(trace, seconds = 0, reducedMotion = false) {
    const frame = reducedMotion ? 0 : Math.floor((Number(seconds) || 0) / FLICKER_SECONDS);
    let hash = 2166136261;
    for (const value of [trace.fromX, trace.fromY, trace.toX, trace.toY, frame]) {
        hash ^= Math.round(Number(value) || 0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

// Midpoint displacement: endpoints stay exactly where C# put them; each level halves the sideways jitter.
export function lightningBoltPath(fromX, fromY, toX, toY, random, roughness = 0.2) {
    const length = Math.hypot(toX - fromX, toY - fromY);
    if (!(length > 0)) return [{ x: fromX, y: fromY }, { x: toX, y: toY }];
    const levels = Math.max(2, Math.min(6, Math.ceil(Math.log2(length / 9))));
    const nx = -(toY - fromY) / length;
    const ny = (toX - fromX) / length;
    let points = [{ x: fromX, y: fromY }, { x: toX, y: toY }];
    let offset = length * roughness;
    for (let level = 0; level < levels; level++) {
        const next = [points[0]];
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1];
            const b = points[index];
            const shift = (random() * 2 - 1) * offset;
            next.push({ x: (a.x + b.x) / 2 + nx * shift, y: (a.y + b.y) / 2 + ny * shift }, b);
        }
        points = next;
        offset *= 0.5;
    }
    return points;
}

// One or two short forks peeling off interior points, angled forward along the bolt.
export function lightningForks(points, random) {
    if (points.length < 5) return [];
    const forks = [];
    const count = 1 + (random() < 0.45 ? 1 : 0);
    const start = points[0];
    const end = points[points.length - 1];
    const heading = Math.atan2(end.y - start.y, end.x - start.x);
    const span = Math.hypot(end.x - start.x, end.y - start.y);
    for (let fork = 0; fork < count; fork++) {
        const origin = points[1 + Math.floor(random() * (points.length - 2))];
        const angle = heading + (random() < 0.5 ? -1 : 1) * (0.45 + random() * 0.55);
        const length = Math.min(34, span * (0.18 + random() * 0.16));
        forks.push(lightningBoltPath(origin.x, origin.y, origin.x + Math.cos(angle) * length, origin.y + Math.sin(angle) * length, random, 0.3));
    }
    return forks;
}

function stroke(ctx, points, width, color) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x, points[index].y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
}

export function drawLightningTrace(ctx, trace, seconds = 0, reducedMotion = false) {
    if (!trace) return;
    const alpha = Math.max(0, Math.min(1, (Number(trace.life) || 0) / FADE_SECONDS));
    if (alpha <= 0) return;
    const random = mulberry32(lightningSeed(trace, seconds, reducedMotion));
    const bolt = lightningBoltPath(Number(trace.fromX), Number(trace.fromY), Number(trace.toX), Number(trace.toY), random);
    const forks = lightningForks(bolt, random);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if ('globalCompositeOperation' in ctx) ctx.globalCompositeOperation = 'lighter';
    stroke(ctx, bolt, 8, `rgba(120, 150, 255, ${0.16 * alpha})`);
    stroke(ctx, bolt, 4, `rgba(255, 222, 110, ${0.55 * alpha})`);
    for (const fork of forks) stroke(ctx, fork, 1.6, `rgba(255, 230, 140, ${0.6 * alpha})`);
    stroke(ctx, bolt, 1.6, `rgba(255, 255, 245, ${alpha})`);
    const end = bolt[bolt.length - 1];
    ctx.fillStyle = `rgba(255, 246, 200, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 2.5 + 2 * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return { bolt, forks };
}
