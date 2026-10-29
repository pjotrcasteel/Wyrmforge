// A single budgeted visual adapter for authoritative C# combat feedback.
// Never infers damage/crit mechanics, emits lights, or animates game actors.
export const DAMAGE_NUMBER_MODES = Object.freeze(['off', 'minimal', 'full']);
export const DAMAGE_NUMBER_STORAGE_KEY = 'wyrmforge.damage-numbers.v1';

const SCHOOL_COLORS = Object.freeze({
    fire: '#ffb87a',
    frost: '#a1e3fa',
    storm: '#d8b9ff',
    arcane: '#e8d8ff',
    necromancer: '#a7d5ac',
    death: '#a7d5ac',
    summoner: '#d7c49b',
    binding: '#d7c49b',
});

const TICK_PALETTES = Object.freeze({
    burn: '#ff9252',
    scorch: '#ef6c44',
    frost: '#a6e8f6',
    storm: '#c2b1ff',
    necrotic: '#a2c68e',
    periodic: '#c9c0c9',
});

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const easingOut = p => 1 - (1 - p) * (1 - p);

export function normalizeDamageNumberMode(mode) {
    return DAMAGE_NUMBER_MODES.includes(mode) ? mode : 'full';
}

export function loadDamageNumberMode(storage) {
    try {
        return normalizeDamageNumberMode(storage?.getItem(DAMAGE_NUMBER_STORAGE_KEY));
    } catch {
        return 'full';
    }
}

export function saveDamageNumberMode(storage, mode) {
    try {
        storage?.setItem(DAMAGE_NUMBER_STORAGE_KEY, normalizeDamageNumberMode(mode));
    } catch {
        // Storage may be inaccessible in private browsing. Current-session choice still applies.
    }
}

function tickFamily(number) {
    if (!number.periodic) return 'impact';
    const requested = String(number.flavor ?? '').toLowerCase();
    if (Object.hasOwn(TICK_PALETTES, requested)) return requested;
    // Future C# periodic schools can plug into the same renderer without a duplicate effect pipeline.
    const school = String(number.school ?? '').toLowerCase();
    if (school === 'fire') return 'burn';
    if (school === 'frost') return 'frost';
    if (school === 'storm') return 'storm';
    if (school === 'death' || school === 'necromancer') return 'necrotic';
    return 'periodic';
}

function getMotion(family, progress, lane, reducedMotion, prominent) {
    const offset = lane * (family === 'impact' ? 9 : 7);
    if (reducedMotion) return { dx: offset, dy: 0, scale: 1 };
    const rise = easingOut(progress);
    const spring = Math.exp(-10 * progress) * Math.sin(20 * progress);
    switch (family) {
        case 'burn':
            return {
                dx: offset + 3.5 * Math.sin(progress * 13 + lane) * (1 - progress),
                dy: -21 * rise - 4 * spring,
                scale: 1 + 0.24 * spring,
            };
        case 'scorch':
            return {
                dx: offset + 4 * Math.sin(progress * 10 + lane * 1.5) * (1 - progress),
                dy: -17 * rise - 2.5 * spring,
                scale: 1 + 0.18 * spring,
            };
        case 'frost':
            return {
                dx: offset + 2.2 * Math.sin(progress * 18 + lane) * (1 - progress),
                dy: -22 * rise,
                scale: 1 + 0.13 * spring,
            };
        case 'storm':
            return {
                dx: offset + 3 * Math.sin(progress * 27 + lane) * (1 - progress),
                dy: -25 * rise - 2 * Math.max(0, spring),
                scale: 1 + 0.28 * spring,
            };
        case 'necrotic':
            return {
                dx: offset + 2 * Math.sin(progress * 8 + lane),
                dy: 3 * rise - 7 * Math.max(0, spring),
                scale: 1 + 0.17 * spring,
            };
        case 'periodic':
            return { dx: offset + spring * 2, dy: -20 * rise, scale: 1 + 0.19 * spring };
        default:
            return {
                dx: offset + lane * 3 * progress,
                dy: -(prominent ? 40 : 28) * rise,
                scale: 1 + (prominent ? 0.3 : 0.14) * Math.exp(-12 * progress) * Math.cos(18 * progress),
            };
    }
}

export function presentDamageNumber(number, mode = 'full', reducedMotion = false) {
    mode = normalizeDamageNumberMode(mode);
    if (mode === 'off' || (mode === 'minimal' && number?.periodic)) return null;
    if (!number || !Number.isFinite(number.amount) || number.amount <= 0 ||
        !Number.isFinite(number.x) || !Number.isFinite(number.y)) return null;

    const progress = clamp(Number(number.progress) || 0, 0, 1);
    if (progress >= 1) return null;
    const periodic = Boolean(number.periodic);
    const family = tickFamily(number);
    const prominent = Boolean(number.finisher || number.empowered || number.heavy);
    const school = String(number.school ?? '').toLowerCase();
    const lane = ((Number(number.sequence) || 0) % 5 + 5) % 5 - 2;
    const motion = getMotion(family, progress, lane, reducedMotion, prominent);
    const size = periodic ? 11 : prominent ? 18 : 13;
    const intensity = mode === 'minimal' ? 0.85 : 1;
    const amount = number.amount < 1
        ? Number(number.amount.toFixed(2)).toString()
        : Math.round(number.amount).toLocaleString('en-US');

    // Finishers have strong typographic weight but no punctuation. A periodic finishing
    // tick keeps its heat/shiver/decay motion, never masquerading as a projectile impact.
    const color = number.finisher ? '#ffe5b1' :
        !periodic && (number.empowered || number.heavy) ? '#f3d4a4' :
        periodic ? TICK_PALETTES[family] : SCHOOL_COLORS[school] ?? '#ece6e3';
    const opacity = clamp((1 - progress) * (periodic ? 2.9 : prominent ? 3.8 : 3.2), 0, 1);
    const fontSize = clamp(size * intensity * motion.scale * (number.finisher && periodic ? 1.16 : 1), 9, 26);

    return {
        text: amount,
        x: number.x + motion.dx,
        y: number.y + motion.dy,
        fontSize,
        color,
        opacity,
        prominent,
        periodic,
        family,
    };
}

function drawMicroAccent(ctx, item) {
    if (!ctx.fillRect) return;
    // Two dark-Gothic ink flecks rather than additional emitters or light bloom.
    const x = Math.round(item.x);
    const y = Math.round(item.y);
    const a = item.opacity * (item.periodic ? 0.6 : 0.45);
    if (a <= 0) return;
    if (item.family === 'burn' || item.family === 'scorch') {
        ctx.fillStyle = item.family === 'burn' ? '#ffd48b' : '#f58b63';
        ctx.globalAlpha = a;
        ctx.fillRect(x - 12, y + 2, 2, 2);
        ctx.fillRect(x + 11, y - 4, 1, 2);
    } else if (item.family === 'frost') {
        ctx.fillStyle = '#d8f5ff';
        ctx.globalAlpha = a;
        ctx.fillRect(x - 12, y - 2, 2, 1);
        ctx.fillRect(x + 12, y + 1, 2, 1);
    } else if (item.family === 'storm') {
        ctx.fillStyle = '#d9d1ff';
        ctx.globalAlpha = a;
        ctx.fillRect(x - 10, y + 2, 2, 2);
    } else if (item.family === 'necrotic') {
        ctx.fillStyle = '#9ebf7d';
        ctx.globalAlpha = a;
        ctx.fillRect(x + 11, y + 5, 2, 1);
    }
}

export function drawDamageNumbers(ctx, numbers, mode = 'full', reducedMotion = false, viewport = null) {
    if (normalizeDamageNumberMode(mode) === 'off' || !numbers?.length) return 0;
    let painted = 0;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // C# caps active feedback at 48. Viewport rejection makes offscreen mobs free.
    for (const number of numbers) {
        const item = presentDamageNumber(number, mode, reducedMotion);
        if (!item) continue;
        if (viewport && (item.x < viewport.x - 35 || item.x > viewport.x + viewport.width + 35 ||
            item.y < viewport.y - 35 || item.y > viewport.y + viewport.height + 35)) continue;
        ctx.globalAlpha = item.opacity;
        ctx.font = `${item.periodic ? 700 : 900} ${Math.round(item.fontSize)}px system-ui, sans-serif`;
        ctx.lineWidth = item.periodic ? 2.25 : item.prominent ? 3.5 : 3;
        ctx.strokeStyle = '#0b0910';
        ctx.strokeText(item.text, item.x, item.y);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
        if (!reducedMotion) drawMicroAccent(ctx, item);
        painted++;
    }
    ctx.restore();
    return painted;
}
