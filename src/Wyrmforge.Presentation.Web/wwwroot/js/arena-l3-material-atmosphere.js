// L3 light-reactive materials and restrained night air, review-only.
// Uses the ORIGINAL approved material IDs and C#-portable cell-space plan.
// No extra ground asset, tile recolor, global glow or gameplay collision.
import { CELL } from './arena-materials.js';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const wet = new Set([1, 2, 5]); // mud, paving, marsh; not dirt, grass or scorched.
const hash = (x, y, seed) => {
    let n = (seed | 0) ^ Math.imul(x + 17, 0x9e3779b1) ^ Math.imul(y + 31, 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
};

export function litWetMaterialPlan(board, columns, rows, sources, seed = 1204) {
    if (!board || board.length !== columns * rows || !Number.isInteger(columns) ||
        !Number.isInteger(rows) || columns <= 0 || rows <= 0) return [];
    const result = [];
    for (const light of sources ?? []) {
        if (!Number.isFinite(light?.x) || !Number.isFinite(light?.y) ||
            !Number.isFinite(light?.radius) || light.radius <= 0) continue;
        const lowX = Math.max(0, Math.floor((light.x - light.radius) / CELL));
        const highX = Math.min(columns - 1, Math.ceil((light.x + light.radius) / CELL));
        const lowY = Math.max(0, Math.floor((light.y - light.radius) / CELL));
        const highY = Math.min(rows - 1, Math.ceil((light.y + light.radius) / CELL));
        // Select one in four approved cells, using deterministic material
        // and seed information. Never create a checkerboard or global detail wash.
        for (let row = lowY; row <= highY && result.length < 48; row += 2)
            for (let col = lowX; col <= highX && result.length < 48; col += 2) {
                const material = board[row * columns + col];
                if (!wet.has(material)) continue;
                const jitter = hash(col, row, seed);
                if (jitter < .30) continue;
                const x = (col + .25 + jitter * .5) * CELL;
                const y = (row + .35) * CELL;
                const d = Math.hypot(x - light.x, y - light.y) / light.radius;
                if (d >= .82) continue;
                const power = clamp(Number(light.relief) || 0, 0, 1);
                const alpha = clamp((1 - d) * (1 - d) * power * (material === 2 ? .21 : .15), 0, .16);
                if (alpha < .012) continue;
                result.push({ x, y, alpha, width: material === 2 ? 8 : 4, material });
            }
    }
    return result;
}

export function drawLitWetMaterial(ctx, plan) {
    if (!ctx || !plan?.length) return 0;
    ctx.save();
    for (const glint of plan) {
        ctx.fillStyle = 'rgba(242,185,112,' + glint.alpha.toFixed(3) + ')';
        ctx.fillRect(glint.x - glint.width / 2, glint.y, glint.width, 1);
    }
    ctx.restore();
    return plan.length;
}

export function drawLocalNightMist(ctx, sources, enabled = true) {
    if (!ctx || !enabled) return 0;
    let count = 0;
    ctx.save();
    for (const light of sources ?? []) {
        if (!Number.isFinite(light?.x) || !Number.isFinite(light?.y) ||
            !Number.isFinite(light?.radius) || light.radius <= 0) continue;
        const radius = clamp(light.radius * .85, 22, 230);
        const gradient = ctx.createRadialGradient(light.x, light.y - 24, 0,
            light.x, light.y - 24, radius);
        const fog = clamp((Number(light.relief) || 0) * .07, 0, .07);
        gradient.addColorStop(0, 'rgba(156,162,151,' + fog.toFixed(3) + ')');
        gradient.addColorStop(.55, 'rgba(104,122,113,' + (fog * .44).toFixed(3) + ')');
        gradient.addColorStop(1, 'rgba(58,76,71,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(light.x - radius, light.y - 24 - radius, radius * 2, radius * 2);
        count++;
    }
    ctx.restore();
    return count;
}
