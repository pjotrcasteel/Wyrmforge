// WyrmForge Spellcraft ritual circle. Render-only: C# decides what is seated, known and allowed;
// this module turns that state into light. Every effect has a reduced-motion form that keeps colour and shape.

export const ELEMENTS = Object.freeze({
    fire: { core: '#ffd29a', glow: '#ff7a36', deep: '#8a2a12' },
    frost: { core: '#e6f7ff', glow: '#7fd0ff', deep: '#1d4f73' },
    storm: { core: '#fff6b8', glow: '#e3cf4f', deep: '#6b5a12' },
    arcane: { core: '#f1e2ff', glow: '#b887ff', deep: '#4b2a78' },
});

const GOLD = '#d8b46a';
const GOLD_SOFT = 'rgba(216, 180, 106, ';
const TAU = Math.PI * 2;

// Seats sit on the circle: foundation left, infusion right, the sealed third seat on top.
export const SEATS = Object.freeze({
    foundation: { angle: Math.PI, radius: 0.74 },
    infusion: { angle: 0, radius: 0.74 },
    third: { angle: -Math.PI / 2, radius: 0.74 },
});

export function elementOf(name) {
    return name ? ELEMENTS[String(name).toLowerCase()] ?? null : null;
}

export function seatPoint(seat, size) {
    const def = SEATS[seat];
    const r = size / 2;
    return { x: r + Math.cos(def.angle) * r * def.radius, y: r + Math.sin(def.angle) * r * def.radius };
}

// The centre sigil is split into one shard per required condition; known shards are lit.
export function shardArcs(needed) {
    const count = Math.max(1, Math.min(6, Math.trunc(needed) || 1));
    const gap = count === 1 ? 0 : 0.08;
    const span = TAU / count;
    return Array.from({ length: count }, (_, index) => {
        const start = -Math.PI / 2 + index * span + gap / 2;
        return { start, end: start + span - gap };
    });
}

function seeded(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

// Deterministic rune strokes so the ring reads as script, not noise.
export const RUNES = (() => {
    const random = seeded(0x5eed5);
    return Array.from({ length: 24 }, () => Array.from({ length: 3 }, () => [random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5]));
})();

function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function ring(ctx, x, y, radius, stroke, width, dash) {
    if (!(radius > 0)) return;
    ctx.beginPath();
    ctx.setLineDash(dash ?? []);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.arc(x, y, radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
}

function glow(ctx, x, y, radius, color, alpha) {
    if (!(radius > 0) || !(alpha > 0)) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, alpha));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
}

// Small emblem per element, drawn in strokes so it scales crisply at any seat size.
export function drawEmblem(ctx, element, x, y, size, alpha = 1) {
    const palette = elementOf(element);
    if (!palette) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = palette.core;
    ctx.fillStyle = rgba(palette.glow, 0.35);
    ctx.lineWidth = Math.max(1.4, size * 0.09);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 2;
    ctx.beginPath();
    switch (String(element).toLowerCase()) {
        case 'fire':
            ctx.moveTo(0, -s);
            ctx.bezierCurveTo(s * 0.7, -s * 0.2, s * 0.75, s * 0.55, 0, s * 0.85);
            ctx.bezierCurveTo(-s * 0.75, s * 0.55, -s * 0.55, -s * 0.05, -s * 0.12, -s * 0.25);
            ctx.bezierCurveTo(-s * 0.1, s * 0.15, s * 0.1, s * 0.25, 0, -s);
            ctx.fill();
            ctx.stroke();
            break;
        case 'frost':
            for (let arm = 0; arm < 6; arm++) {
                const a = arm * Math.PI / 3;
                const cx = Math.cos(a), cy = Math.sin(a);
                ctx.moveTo(0, 0);
                ctx.lineTo(cx * s, cy * s);
                const bx = cx * s * 0.55, by = cy * s * 0.55;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(a + 0.7) * s * 0.28, by + Math.sin(a + 0.7) * s * 0.28);
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.cos(a - 0.7) * s * 0.28, by + Math.sin(a - 0.7) * s * 0.28);
            }
            ctx.stroke();
            break;
        case 'storm':
            ctx.moveTo(s * 0.25, -s);
            ctx.lineTo(-s * 0.35, s * 0.08);
            ctx.lineTo(s * 0.08, s * 0.08);
            ctx.lineTo(-s * 0.2, s);
            ctx.lineTo(s * 0.45, -s * 0.18);
            ctx.lineTo(0, -s * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        default:
            for (let point = 0; point < 4; point++) {
                const a = point * Math.PI / 2 - Math.PI / 2;
                const b = a + Math.PI / 4;
                ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                ctx.lineTo(Math.cos(b) * s * 0.3, Math.sin(b) * s * 0.3);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ring(ctx, 0, 0, s * 0.62, rgba(palette.core, 0.6), Math.max(1, size * 0.04));
    }
    ctx.restore();
}

function drawRuneBand(ctx, cx, cy, radius, rotation, color, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, scale * 0.12);
    ctx.lineCap = 'round';
    for (let index = 0; index < RUNES.length; index++) {
        const angle = index / RUNES.length * TAU;
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(radius, 0);
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of RUNES[index]) {
            ctx.moveTo(x1 * scale, y1 * scale);
            ctx.lineTo(x2 * scale, y2 * scale);
        }
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawSeat(ctx, view, seat, time) {
    const { size } = view;
    const point = seatPoint(seat, size);
    const radius = size * 0.085;
    const element = seat === 'third' ? null : view[seat];
    const palette = elementOf(element);
    ctx.save();
    if (seat === 'third') {
        ring(ctx, point.x, point.y, radius, 'rgba(120, 112, 98, 0.55)', 1.5, [3, 4]);
        ctx.strokeStyle = 'rgba(150, 140, 120, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(point.x - radius * 0.28, point.y - radius * 0.05, radius * 0.56, radius * 0.42);
        ctx.moveTo(point.x - radius * 0.18, point.y - radius * 0.05);
        ctx.arc(point.x, point.y - radius * 0.05, radius * 0.18, Math.PI, 0);
        ctx.stroke();
        ctx.restore();
        return;
    }
    const breathe = view.reduced ? 1 : 0.85 + Math.sin(time * 2.1 + (seat === 'infusion' ? 1.4 : 0)) * 0.15;
    if (palette) glow(ctx, point.x, point.y, radius * 2.4, palette.glow, 0.32 * breathe);
    ctx.fillStyle = 'rgba(10, 9, 14, 0.78)';
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, TAU);
    ctx.fill();
    ring(ctx, point.x, point.y, radius, palette ? palette.glow : GOLD_SOFT + '0.55)', palette ? 2.4 : 1.5, palette ? undefined : [4, 4]);
    ring(ctx, point.x, point.y, radius * 1.18, GOLD_SOFT + '0.35)', 1);
    if (palette) drawEmblem(ctx, element, point.x, point.y, radius * 1.05);
    ctx.restore();
}

// Light streams from each seated element into the centre: the visible "combination logic".
function drawStreams(ctx, view, time) {
    const { size } = view;
    const centre = size / 2;
    for (const seat of ['foundation', 'infusion']) {
        const palette = elementOf(view[seat]);
        if (!palette) continue;
        const from = seatPoint(seat, size);
        const bend = seat === 'foundation' ? -1 : 1;
        const control = { x: (from.x + centre) / 2, y: centre + bend * size * 0.12 };
        ctx.strokeStyle = rgba(palette.glow, view.state === 'research' ? 0.38 : 0.2);
        ctx.lineWidth = size * 0.006;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, centre, centre);
        ctx.stroke();
        if (view.reduced || view.state === 'same' || view.state === 'awaiting') continue;
        for (let index = 0; index < 6; index++) {
            const t = (time * 0.35 + index / 6) % 1;
            const u = 1 - t;
            const x = u * u * from.x + 2 * u * t * control.x + t * t * centre;
            const y = u * u * from.y + 2 * u * t * control.y + t * t * centre;
            glow(ctx, x, y, size * 0.018 * (1 - t * 0.4), palette.core, 0.85 * Math.sin(t * Math.PI));
        }
    }
}

function blend(view) {
    const a = elementOf(view.foundation);
    const b = elementOf(view.infusion);
    return { a: a ?? b, b: b ?? a };
}

function drawSigil(ctx, view, time) {
    const { size } = view;
    const c = size / 2;
    const radius = size * 0.15;
    const { a, b } = blend(view);
    const hover = view.reduced ? 0 : Math.sin(time * 1.3) * size * 0.008;
    ctx.save();
    ctx.translate(c, c + hover);

    if (view.state === 'empty' || view.state === 'awaiting') {
        ring(ctx, 0, 0, radius * 0.7, GOLD_SOFT + '0.28)', 1.2, [2, 6]);
        if (a) glow(ctx, 0, 0, radius * 1.2, a.glow, 0.18);
        ctx.restore();
        return;
    }
    if (view.state === 'same') {
        const flicker = view.reduced ? 0.6 : 0.45 + Math.abs(Math.sin(time * 9)) * 0.3;
        ring(ctx, 0, 0, radius * 0.8, `rgba(226, 84, 74, ${flicker})`, 2.2, [10, 7]);
        ctx.strokeStyle = 'rgba(226, 84, 74, 0.8)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.45, -radius * 0.45);
        ctx.lineTo(radius * 0.45, radius * 0.45);
        ctx.stroke();
        ctx.restore();
        return;
    }

    // A pooled two-tone aura: the foundation's colour leads, the infusion's colour rims it.
    if (a) glow(ctx, -radius * 0.25, 0, radius * 2.1, a.glow, view.state === 'sealed' ? 0.12 : 0.3);
    if (b) glow(ctx, radius * 0.25, 0, radius * 2.1, b.glow, view.state === 'sealed' ? 0.12 : 0.3);

    if (view.state === 'sealed') {
        ctx.fillStyle = 'rgba(14, 12, 20, 0.8)';
        ctx.strokeStyle = GOLD_SOFT + '0.45)';
        ctx.lineWidth = 1.5;
        hexagon(ctx, radius);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = GOLD_SOFT + '0.75)';
        ctx.font = `600 ${Math.round(radius * 0.95)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, radius * 0.05);
        ctx.restore();
        return;
    }

    // Research: one shard per condition. Discovered: the whole sigil wakes with a slow inner rotation.
    const awake = view.stage === 'discovered' || view.stage === 'equipped';
    const arcs = shardArcs(view.needed);
    const turn = view.reduced ? 0 : time * (awake ? 0.35 : 0.08);
    for (let index = 0; index < arcs.length; index++) {
        const arc = arcs[index];
        const lit = awake || index < view.known;
        const fresh = view.freshShard === index ? view.freshGlow : 0;
        ctx.beginPath();
        ctx.moveTo(Math.cos(arc.start) * radius * 0.32, Math.sin(arc.start) * radius * 0.32);
        ctx.arc(0, 0, radius, arc.start, arc.end);
        ctx.arc(0, 0, radius * 0.32, arc.end, arc.start, true);
        ctx.closePath();
        const palette = index % 2 === 0 ? a : b;
        // Shards read as stained glass: unlit ones are a faint etched outline, lit ones hold light from within.
        if (lit) {
            const mid = (arc.start + arc.end) / 2;
            const light = ctx.createRadialGradient(Math.cos(mid) * radius * 0.6, Math.sin(mid) * radius * 0.6, 0, 0, 0, radius * 1.05);
            light.addColorStop(0, rgba(palette.core, 0.62 + fresh * 0.35));
            light.addColorStop(0.55, rgba(palette.glow, 0.34 + fresh * 0.4));
            light.addColorStop(1, rgba(palette.glow, 0.08));
            ctx.fillStyle = light;
            ctx.shadowColor = rgba(palette.glow, 0.9);
            ctx.shadowBlur = radius * (0.35 + fresh * 0.6);
        } else {
            ctx.fillStyle = 'rgba(20, 17, 28, 0.38)';
            ctx.shadowBlur = 0;
        }
        ctx.strokeStyle = lit ? rgba(palette.core, 0.95) : GOLD_SOFT + '0.4)';
        ctx.lineWidth = lit ? 1.6 : 1;
        ctx.setLineDash(lit ? [] : [3, 4]);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.rotate(turn);
    if (awake) {
        // The foundation holds the centre; the infusion orbits it like a bound familiar.
        glow(ctx, 0, 0, radius * 0.7, a.core, 0.35);
        drawEmblem(ctx, view.foundation, 0, 0, radius * 0.8, 1);
        drawEmblem(ctx, view.infusion, radius * 0.66, 0, radius * 0.42, 0.95);
        drawEmblem(ctx, view.infusion, -radius * 0.66, 0, radius * 0.42, 0.95);
    } else {
        ring(ctx, 0, 0, radius * 0.24, GOLD_SOFT + '0.5)', 1.2);
    }
    ctx.restore();
}

// The inscribed figure of the circle: a hexagram that grows brighter as understanding builds, with a node where
// each line meets the ring — the classic "drawn in chalk, lit by intent" read of a ritual circle.
function drawGeometry(ctx, view, c, size, spin, charge) {
    const radius = size * 0.3;
    const { a, b } = blend(view);
    const turn = spin * 0.03;
    const alpha = 0.1 + charge * 0.32;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(turn);
    for (let triangle = 0; triangle < 2; triangle++) {
        const palette = triangle === 0 ? a : b;
        ctx.beginPath();
        for (let corner = 0; corner < 3; corner++) {
            const angle = -Math.PI / 2 + triangle * Math.PI / 3 * 3 + corner * TAU / 3;
            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.strokeStyle = palette ? rgba(palette.core, alpha) : GOLD_SOFT + `${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    for (let node = 0; node < 6; node++) {
        const angle = -Math.PI / 2 + node * Math.PI / 3;
        const palette = node % 2 === 0 ? a : b;
        glow(ctx, Math.cos(angle) * radius, Math.sin(angle) * radius, size * 0.018, palette ? palette.glow : '#f3dca5', alpha * 1.6);
    }
    ctx.restore();
}

function hexagon(ctx, radius) {
    ctx.beginPath();
    for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3 - Math.PI / 2;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
}

const MOTES = (() => {
    const random = seeded(0xa11ce);
    return Array.from({ length: 28 }, () => ({ x: random(), y: random(), speed: 0.02 + random() * 0.05, phase: random() * TAU, size: 0.5 + random() }));
})();

function drawMotes(ctx, view, time) {
    if (view.reduced) return;
    const { size } = view;
    const { a } = blend(view);
    const color = a ? a.core : '#f3dca5';
    for (const mote of MOTES) {
        const y = ((mote.y - time * mote.speed) % 1 + 1) % 1;
        const x = mote.x + Math.sin(time * 0.6 + mote.phase) * 0.02;
        const fade = Math.sin(y * Math.PI);
        glow(ctx, x * size, y * size, size * 0.006 * mote.size + 1.5, color, 0.5 * fade);
    }
}

// The full static frame for a given state. Pulses and the test vignette draw on top.
export function drawCircle(ctx, view, time = 0) {
    const { size } = view;
    const c = size / 2;
    const state = view.state ?? 'empty';
    const charge = state === 'research' ? 0.4 + 0.6 * ((view.known ?? 0) / Math.max(1, view.needed ?? 1)) : state === 'sealed' ? 0.2 : 0.1;
    ctx.clearRect(0, 0, size, size);

    // Floor pool with element light seeping in from the seats.
    // Everything pools inside the circle; nothing may bleed to the square canvas edge.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, size * 0.5, 0, TAU);
    ctx.clip();
    const pool = ctx.createRadialGradient(c, c, size * 0.05, c, c, size * 0.5);
    pool.addColorStop(0, 'rgba(26, 22, 34, 0.92)');
    pool.addColorStop(0.82, 'rgba(10, 9, 14, 0.9)');
    pool.addColorStop(1, 'rgba(10, 9, 14, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, size, size);
    for (const seat of ['foundation', 'infusion']) {
        const palette = elementOf(view[seat]);
        if (!palette) continue;
        const point = seatPoint(seat, size);
        glow(ctx, point.x, point.y, size * 0.42, palette.glow, 0.14);
    }
    ctx.restore();

    const spin = view.reduced ? 0 : time;
    ring(ctx, c, c, size * 0.47, GOLD_SOFT + '0.55)', 2);
    ring(ctx, c, c, size * 0.44, GOLD_SOFT + '0.3)', 1);
    drawRuneBand(ctx, c, c, size * 0.455, spin * 0.05, GOLD_SOFT + `${0.35 + charge * 0.4})`, size * 0.022);
    ring(ctx, c, c, size * 0.3, GOLD_SOFT + `${0.18 + charge * 0.3})`, 1, [1, 7]);
    drawRuneBand(ctx, c, c, size * 0.32, -spin * 0.09, GOLD_SOFT + `${0.2 + charge * 0.3})`, size * 0.014);
    drawGeometry(ctx, view, c, size, spin, charge);

    drawStreams(ctx, view, time);
    for (const seat of ['third', 'foundation', 'infusion']) drawSeat(ctx, view, seat, time);
    drawSigil(ctx, view, time);
    drawMotes(ctx, view, time);
}

// Outcome pulses. Ceremony scales with weight: a snap is a ripple, an insight a shard igniting,
// a binding (stabilize) the whole circle igniting.
export const PULSES = Object.freeze({
    snap: { duration: 0.55 },
    insight: { duration: 1.3 },
    failure: { duration: 1.4 },
    incompatible: { duration: 1.5 },
    reject: { duration: 0.5 },
    stabilize: { duration: 2.2 },
});

export function drawPulse(ctx, view, pulse, age) {
    const definition = PULSES[pulse.kind];
    if (!definition) return false;
    const t = Math.min(1, age / definition.duration);
    if (t >= 1) return false;
    const { size } = view;
    const c = size / 2;
    const ease = 1 - Math.pow(1 - t, 3);
    const fade = 1 - t;
    const origin = pulse.seat ? seatPoint(pulse.seat, size) : { x: c, y: c };
    const palette = elementOf(pulse.element) ?? blend(view).a ?? ELEMENTS.arcane;
    ctx.save();
    switch (pulse.kind) {
        case 'snap':
            ring(ctx, origin.x, origin.y, size * (0.08 + ease * 0.12), rgba(palette.core, fade * 0.9), 2.5);
            glow(ctx, origin.x, origin.y, size * 0.16, palette.glow, fade * 0.5);
            break;
        case 'reject':
            ring(ctx, origin.x + Math.sin(t * 40) * size * 0.01, origin.y, size * 0.09, `rgba(226, 84, 74, ${fade})`, 3);
            break;
        case 'insight':
            glow(ctx, c, c, size * (0.18 + ease * 0.25), '#ffe3a0', fade * 0.6);
            if (!view.reduced) {
                for (let ray = 0; ray < 12; ray++) {
                    const angle = ray / 12 * TAU + t;
                    ctx.strokeStyle = `rgba(255, 227, 160, ${fade * 0.55})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(c + Math.cos(angle) * size * 0.16, c + Math.sin(angle) * size * 0.16);
                    ctx.lineTo(c + Math.cos(angle) * size * (0.2 + ease * 0.18), c + Math.sin(angle) * size * (0.2 + ease * 0.18));
                    ctx.stroke();
                }
            }
            break;
        case 'failure': {
            // The sigil cracks, then a warm clue-light shows through the crack: failure taught something.
            ctx.strokeStyle = `rgba(255, 210, 154, ${Math.min(1, t * 3) * fade})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(c - size * 0.1, c - size * 0.12);
            ctx.lineTo(c - size * 0.02, c - size * 0.02);
            ctx.lineTo(c - size * 0.06, c + size * 0.04);
            ctx.lineTo(c + size * 0.06, c + size * 0.13);
            ctx.stroke();
            glow(ctx, c, c, size * 0.2 * ease, '#ffd29a', fade * 0.45 * Math.min(1, t * 2));
            break;
        }
        case 'incompatible':
            for (let puff = 0; puff < (view.reduced ? 0 : 7); puff++) {
                const angle = puff / 7 * TAU;
                glow(ctx, c + Math.cos(angle) * size * 0.1 * ease, c - size * 0.08 * ease + Math.sin(angle) * size * 0.05, size * 0.07, '#8a8496', fade * 0.5);
            }
            ctx.strokeStyle = `rgba(200, 190, 210, ${fade * 0.85})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(c - size * 0.13, c + size * 0.13 * Math.min(1, t * 2));
            ctx.lineTo(c - size * 0.13 + size * 0.26 * Math.min(1, t * 2), c + size * 0.13 - size * 0.26 * Math.min(1, t * 2));
            ctx.stroke();
            break;
        case 'stabilize': {
            const b = elementOf(view.infusion) ?? palette;
            glow(ctx, c, c, size * (0.2 + ease * 0.4), palette.glow, fade * 0.55);
            glow(ctx, c, c, size * (0.1 + ease * 0.2), '#fff4d6', fade * 0.7);
            ring(ctx, c, c, size * (0.15 + ease * 0.33), rgba(b.core, fade), 3);
            ring(ctx, c, c, size * 0.47, `rgba(255, 228, 160, ${fade})`, 3 + fade * 3);
            if (!view.reduced) {
                for (let spark = 0; spark < 36; spark++) {
                    const angle = spark / 36 * TAU + spark * 0.37;
                    const reach = size * (0.12 + ease * (0.25 + (spark % 5) * 0.03));
                    glow(ctx, c + Math.cos(angle) * reach, c + Math.sin(angle) * reach, size * 0.012 + 2, spark % 2 ? palette.core : b.core, fade);
                }
            }
            break;
        }
    }
    ctx.restore();
    return true;
}

// A short in-circle demonstration of what the recipe does. Unstable recipes show the honest version:
// the reaction fizzles until every condition is understood.
export const VIGNETTE_SECONDS = 2.6;

export function drawVignette(ctx, view, vignette, age) {
    const t = age / VIGNETTE_SECONDS;
    if (t >= 1) return false;
    const { size } = view;
    const c = size / 2;
    const start = { x: c - size * 0.26, y: c + size * 0.02 };
    const target = { x: c + size * 0.17, y: c + size * 0.02 };
    const a = elementOf(view.foundation) ?? ELEMENTS.arcane;
    const b = elementOf(view.infusion) ?? a;
    const fadeIn = Math.min(1, t * 6), fadeOut = Math.min(1, (1 - t) * 6);
    ctx.save();
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx.fillStyle = 'rgba(8, 7, 12, 0.72)';
    ctx.beginPath();
    ctx.arc(c, c, size * 0.36, 0, TAU);
    ctx.fill();

    // Training post.
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(target.x - size * 0.012, target.y - size * 0.06, size * 0.024, size * 0.13);
    ctx.fillStyle = '#7b6650';
    ctx.beginPath();
    ctx.arc(target.x, target.y - size * 0.07, size * 0.03, 0, TAU);
    ctx.fill();

    const stable = vignette.stable;
    const impact = 0.45;
    if (t < impact) {
        const u = t / impact;
        const x = start.x + (target.x - start.x) * u;
        const y = start.y + Math.sin(u * Math.PI) * -size * 0.04;
        glow(ctx, x, y, size * 0.05, a.glow, 0.9);
        glow(ctx, x, y, size * 0.02, a.core, 1);
        if (stable || u < 0.5) glow(ctx, x - size * 0.02, y, size * 0.035, b.glow, 0.7);
        else glow(ctx, x - size * 0.03, y - size * 0.02, size * 0.03, '#8a8496', 0.5 * (1 - u));
    } else if (stable) {
        const u = (t - impact) / (1 - impact);
        if (vignette.family === 'Arcane Conduit') {
            for (let arc = 0; arc < 3; arc++) {
                const angle = -0.6 + arc * 0.6;
                const end = { x: target.x + Math.cos(angle) * size * 0.14, y: target.y + Math.sin(angle) * size * 0.14 };
                ctx.strokeStyle = rgba(b.core, 1 - u);
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(target.x, target.y - size * 0.05);
                for (let step = 1; step <= 4; step++) {
                    const k = step / 4;
                    ctx.lineTo(target.x + (end.x - target.x) * k + (step % 2 ? 4 : -4), target.y - size * 0.05 + (end.y - target.y + size * 0.05) * k);
                }
                ctx.stroke();
            }
            glow(ctx, target.x, target.y - size * 0.05, size * 0.09, a.glow, 1 - u);
        } else {
            // Freeze, then shatter.
            const freeze = Math.min(1, u * 3);
            ctx.strokeStyle = rgba(b.core, 0.9 * (1 - Math.max(0, u - 0.5) * 2));
            ctx.lineWidth = 2;
            hexagonAt(ctx, target.x, target.y - size * 0.03, size * 0.07 * freeze);
            ctx.stroke();
            if (u > 0.4) {
                const burst = (u - 0.4) / 0.6;
                for (let shard = 0; shard < 10; shard++) {
                    const angle = shard / 10 * TAU;
                    const reach = size * 0.14 * burst;
                    glow(ctx, target.x + Math.cos(angle) * reach, target.y - size * 0.03 + Math.sin(angle) * reach, size * 0.016, shard % 2 ? b.core : a.glow, 1 - burst);
                }
                glow(ctx, target.x, target.y - size * 0.03, size * 0.12, a.glow, 0.7 * (1 - burst));
            }
        }
    } else {
        const u = (t - impact) / (1 - impact);
        glow(ctx, target.x, target.y - size * 0.05, size * 0.05 * (1 - u), a.glow, 0.6 * (1 - u));
        glow(ctx, target.x, target.y - size * 0.08 - u * size * 0.06, size * 0.05, '#8a8496', 0.45 * (1 - u));
    }
    ctx.restore();
    return true;
}

function hexagonAt(ctx, x, y, radius) {
    ctx.beginPath();
    for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.closePath();
}

// ---- Live controller (browser only) ----

const circles = new WeakMap();

function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function attach(canvas, view) {
    if (!canvas || circles.has(canvas)) return update(canvas, view);
    const entry = { canvas, view: { ...view }, pulses: [], vignette: null, frame: 0, started: performance.now() };
    circles.set(canvas, entry);
    const loop = now => {
        if (!canvas.isConnected) { circles.delete(canvas); return; }
        render(entry, now);
        entry.frame = requestAnimationFrame(loop);
    };
    entry.frame = requestAnimationFrame(loop);
}

export function update(canvas, view) {
    const entry = circles.get(canvas);
    if (!entry) return;
    const previous = entry.view;
    entry.view = { ...view };
    if (view.known > (previous.known ?? 0) && view.foundation === previous.foundation && view.infusion === previous.infusion) {
        entry.view.freshShard = view.known - 1;
        entry.freshAt = performance.now();
    }
}

export function pulse(canvas, kind, seat, element) {
    const entry = circles.get(canvas);
    if (!entry) return;
    entry.pulses.push({ kind, seat, element, at: performance.now() });
    haptic(kind);
}

export function test(canvas, family, stable) {
    const entry = circles.get(canvas);
    if (!entry) return;
    entry.vignette = { family, stable, at: performance.now() };
}

export function detach(canvas) {
    const entry = circles.get(canvas);
    if (entry) cancelAnimationFrame(entry.frame);
    circles.delete(canvas);
}

const HAPTICS = { snap: [12], reject: [30, 40, 30], insight: [18, 50, 28], failure: [40], incompatible: [60], stabilize: [20, 60, 20, 60, 90] };

// Progressive enhancement only: Android Chrome vibrates, iOS Safari does not; visuals carry the full meaning.
export function haptic(kind) {
    if (prefersReducedMotion()) return false;
    const pattern = HAPTICS[kind];
    if (!pattern || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    try { return navigator.vibrate(pattern); } catch { return false; }
}

function render(entry, now) {
    const { canvas } = entry;
    const css = canvas.clientWidth || 320;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(css * ratio)) {
        canvas.width = Math.round(css * ratio);
        canvas.height = Math.round(css * ratio);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const time = (now - entry.started) / 1000;
    const view = { ...entry.view, size: css, reduced: prefersReducedMotion() };
    if (entry.freshAt) view.freshGlow = Math.max(0, 1 - (now - entry.freshAt) / 1600);
    drawCircle(ctx, view, time);
    entry.pulses = entry.pulses.filter(item => drawPulse(ctx, view, item, (now - item.at) / 1000));
    if (entry.vignette && !drawVignette(ctx, view, entry.vignette, (now - entry.vignette.at) / 1000)) entry.vignette = null;
}
