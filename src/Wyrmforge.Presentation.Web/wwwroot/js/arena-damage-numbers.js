// Damage numbers are UI annotations of authoritative C# damage snapshots.
// They do not emit lights, change enemy animation, or invent critical hits.
export const DAMAGE_NUMBER_MODES = Object.freeze(['off', 'minimal', 'full']);
export const DAMAGE_NUMBER_STORAGE_KEY = 'wyrmforge.damage-numbers.v1';

const SCHOOL_COLORS = Object.freeze({
    fire: '#ffb87a',
    frost: '#a1e3fa',
    storm: '#d8b9ff',
    arcane: '#e8d8ff',
    necromancer: '#9eddad',
    death: '#9eddad',
    summoner: '#d7c49b',
    binding: '#d7c49b',
});

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
        // Storage can be disabled in private browsing. The in-memory setting still works.
    }
}

export function presentDamageNumber(number, mode = 'full', reducedMotion = false) {
    mode = normalizeDamageNumberMode(mode);
    if (mode === 'off' || (mode === 'minimal' && number?.periodic)) return null;
    if (!number || !Number.isFinite(number.amount) || number.amount <= 0 ||
        !Number.isFinite(number.x) || !Number.isFinite(number.y)) return null;

    const progress = Math.max(0, Math.min(1, Number(number.progress) || 0));
    if (progress >= 1) return null;
    const prominent = Boolean(number.finisher || number.empowered);
    const intensity = mode === 'minimal' ? 0.8 : 1;
    const size = Math.round((prominent ? 17 : number.periodic ? 11 : 13) * intensity);
    const sequence = Number(number.sequence) || 0;
    const lane = ((sequence % 5) + 5) % 5 - 2;
    const stagger = reducedMotion ? 0 : lane * 4 * progress;
    const rise = reducedMotion ? 0 : (prominent ? 41 : 29) * (1 - (1 - progress) ** 2);
    const bounce = reducedMotion ? 1 : 1 + (prominent ? .28 : .12) * Math.max(0, 1 - progress * 8);
    const opacity = Math.min(1, (1 - progress) * (prominent ? 3.5 : 3));
    const school = String(number.school || '').toLowerCase();
    const color = number.finisher ? '#ffe6aa' : number.empowered ? '#f5d49b' :
        SCHOOL_COLORS[school] ?? '#ece6e3';

    const amount = number.amount < 1
        ? Number(number.amount.toFixed(2)).toString()
        : Math.round(number.amount).toLocaleString('en-US');
    return {
        text: number.finisher ? `${amount}!` : amount,
        x: number.x + stagger,
        y: number.y - rise,
        fontSize: size * bounce,
        color,
        opacity,
        prominent,
    };
}

export function drawDamageNumbers(ctx, numbers, mode = 'full', reducedMotion = false, viewport = null) {
    if (normalizeDamageNumberMode(mode) === 'off' || !numbers?.length) return 0;
    let painted = 0;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const number of numbers) {
        const item = presentDamageNumber(number, mode, reducedMotion);
        if (!item) continue;
        if (viewport && (item.x < viewport.x - 35 || item.x > viewport.x + viewport.width + 35 ||
            item.y < viewport.y - 35 || item.y > viewport.y + viewport.height + 35)) continue;
        ctx.globalAlpha = item.opacity;
        ctx.font = `900 ${Math.round(item.fontSize)}px system-ui, sans-serif`;
        ctx.lineWidth = item.prominent ? 3.5 : 3;
        ctx.strokeStyle = '#0b0910';
        ctx.strokeText(item.text, item.x, item.y);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
        painted++;
    }
    ctx.restore();
    return painted;
}
