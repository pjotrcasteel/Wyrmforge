import { artReady, drawArtFrame } from './art-atlas.js';

// Territory walls rendered from the generated masonry atlas. Collision stays with the
// exact C# rectangles; this only projects them as short 2.5D curtain walls whose front face
// rises from the footprint's south edge, so depth sorting by foot line is correct.
const CAP = { w: 32, h: 10 }, FACE = { w: 32, h: 16 }, FOOT = { h: 6 }, RUNE = 14;
const TOP_FILL = { valley: '#2b332f', ash: '#2e2522', ridge: '#2a2e33', snow: '#8193a3' };
export const TERRITORY_WALL_RISE = FACE.h;

export function territoryWallStyle(biome) {
    return biome === 'ash' || biome === 'ridge' || biome === 'snow' ? biome : 'valley';
}

export function territoryRuneSchool(element) {
    return ['fire', 'frost', 'storm', 'arcane'].includes(element) ? element : 'arcane';
}

export function createTerritoryWallLayers(environment, plan, width, height, seconds = 0) {
    if (!environment || plan?.story?.cloister || !artReady()) return [];
    const style = territoryWallStyle(plan?.biome);
    const school = territoryRuneSchool(environment.element);
    return (environment.barriers ?? []).filter(barrier => !barrier.open && barrier.width > 0 && barrier.height > 0)
        .map(barrier => ({ kind: 'masonry', style: 'territory', depth: (barrier.y + barrier.height) * height,
            barrier, width, height, wallStyle: style, school, seconds }));
}

// Each mounted rune keeps a slow deterministic failure rhythm: mostly lit, occasionally guttering.
export function runeLit(index, seconds, seed = 0) {
    const phase = Math.sin(seconds * .9 + index * 2.39 + seed * .013) + Math.sin(seconds * 2.3 + index * 1.7) * .35;
    return phase > -.95;
}

export function drawTerritoryWall(ctx, layer) {
    const { barrier, width, height, wallStyle, school, seconds } = layer;
    if (!barrier || barrier.open) return false;
    const x = Math.round(barrier.x * width), y = Math.round(barrier.y * height);
    const w = Math.round(barrier.width * width), h = Math.round(barrier.height * height);
    if (!(w > 0 && h > 0)) return false;
    const foot = y + h;
    const faceTop = foot - FACE.h;
    const capTop = y - FACE.h;
    ctx.save();
    // Clip to the projected silhouette so the tile courses end exactly at the collision edges.
    ctx.beginPath();
    ctx.rect(x, capTop, w, foot - capTop + FOOT.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(3,6,8,.42)';
    ctx.fillRect(x + 5, foot, w, FOOT.h + 2);
    // Thick walls: a calm dark walkway top with faint coursing, finished by one crisp cap row.
    const interior = faceTop - capTop - CAP.h;
    if (interior > 0) {
        ctx.fillStyle = TOP_FILL[wallStyle] ?? TOP_FILL.valley;
        ctx.fillRect(x, capTop, w, interior);
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        for (let ty = capTop + 9; ty < capTop + interior; ty += 11) ctx.fillRect(x, ty, w, 1);
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fillRect(x, capTop, w, 2);
    }
    const capRow = Math.max(capTop, faceTop - CAP.h);
    for (let tx = x; tx < x + w; tx += CAP.w) drawArtFrame(ctx, 'environment', `wall.${wallStyle}.cap`, tx, capRow);
    for (let tx = x; tx < x + w; tx += FACE.w) drawArtFrame(ctx, 'environment', `wall.${wallStyle}.face`, tx, faceTop);
    for (let tx = x; tx < x + w; tx += FACE.w) drawArtFrame(ctx, 'environment', `wall.${wallStyle}.foot`, tx, foot);
    // A crisp lip separates the walkable-looking cap from the vertical face.
    ctx.fillStyle = 'rgba(214,206,186,.16)';
    ctx.fillRect(x, faceTop - 1, w, 1);
    ctx.restore();

    ctx.save();
    if (barrier.kind === 'gate') {
        // A sealed crossing: iron portcullis spans the gap, flanked by its two warding runes.
        const pw = 16, inset = Math.min(18, w * .2);
        for (let tx = x + inset; tx < x + w - inset; tx += pw) drawArtFrame(ctx, 'environment', 'wall.portcullis', Math.min(tx, x + w - inset - pw), faceTop);
        [x + inset - RUNE - 1, x + w - inset + 1].forEach((runeX, i) =>
            drawArtFrame(ctx, 'environment', `rune.${school}.${runeLit(i + 7, seconds, x) ? 'lit' : 'dim'}`, Math.round(runeX), faceTop + 1));
    } else {
        const spacing = 88;
        const count = Math.max(0, Math.floor((w - 24) / spacing));
        const start = x + (w - (count - 1) * spacing) / 2 - RUNE / 2;
        for (let i = 0; i < count; i++)
            drawArtFrame(ctx, 'environment', `rune.${school}.${runeLit(i, seconds, x + y) ? 'lit' : 'dim'}`, Math.round(start + i * spacing), faceTop + 1);
    }
    ctx.restore();
    return true;
}

// Broken portcullis remains where a gate opened: a persistent trace, never a collider.
export function drawOpenedGateRubble(ctx, barrier, width, height) {
    if (!artReady()) return false;
    const x = barrier.x * width, y = barrier.y * height, w = barrier.width * width, h = barrier.height * height;
    drawArtFrame(ctx, 'environment', 'wall.rubble', Math.round(x - 12), Math.round(y + h - 12));
    drawArtFrame(ctx, 'environment', 'wall.rubble', Math.round(x + w - 36), Math.round(y + h - 12));
    return true;
}
