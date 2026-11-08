// Hollowed H3: earth-contact presentation only. The puff frames come from the
// user's CC0 PVFX Foundry dust-puff strict atlas, recolored to Wyrmforge's
// subdued soil, ash and stone palettes. All walking distance comes from the
// existing authoritative snapshot-driven Hollowed gait. Nothing repaints terrain.
const ATLAS_URL = new URL('../art/vfx/hollowed-ground-dust-h3.png', import.meta.url);
export const HOLLOW_GROUND = Object.freeze({ width: 36, height: 20, frames: 8,
    halfStride: 16.64, life: .42, maxPuffs: 40 });
let atlas = null;
let loading = null;

export function preloadHollowGroundVfx() {
    if (atlas) return Promise.resolve(true);
    if (loading) return loading;
    if (typeof Image === 'undefined') return Promise.resolve(false);
    loading = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const valid = image.naturalWidth === HOLLOW_GROUND.width * HOLLOW_GROUND.frames &&
                image.naturalHeight === HOLLOW_GROUND.height * 3;
            if (valid) atlas = image;
            else loading = null;
            resolve(valid);
        };
        image.onerror = () => { loading = null; resolve(false); };
        image.src = ATLAS_URL.href;
    });
    return loading;
}

// Read-only top material from the existing C# terrain frame. 0=Soil, 1=Ash,
// 2=Stone, 3=Lava, 4=Wood, 5=Boulder (arena-terrain-canvas.js).
// The Enemy Lab has no terrain frame, so a neutral soil puff is correct there.
export function hollowGroundMaterial(frame, x, y) {
    if (!frame?.material || !Number.isFinite(x) || !Number.isFinite(y) ||
        !Number.isInteger(frame.columns) || !Number.isInteger(frame.rows)) return 'soil';
    const col = Math.floor(x / 32), row = Math.floor(y / 32);
    if (col < 0 || row < 0 || col >= frame.columns || row >= frame.rows) return 'soil';
    switch (frame.material[row * frame.columns + col]) {
        case 1: return 'ash';
        case 2: case 4: case 5: return 'stone';
        case 3: return 'lava';
        default: return 'soil';
    }
}

export function createHollowGroundState() {
    return { lastClock: 0, walkers: new Map(), puffs: [], footfalls: 0 };
}

const FACING = Object.freeze({ E: 0, SE: Math.PI / 4, S: Math.PI / 2,
    SW: Math.PI * 3 / 4, W: Math.PI, NW: -Math.PI * 3 / 4,
    N: -Math.PI / 2, NE: -Math.PI / 4 });

// Called after updateHollowSprites. A duplicate render snapshot does not
// advance pose.distance, and therefore cannot spawn another footstep.
export function updateHollowGroundVfx(state, snapshot, hollow, terrainFrame) {
    const clock = Number(hollow?.clock) || 0;
    if (clock < state.lastClock) {
        state.walkers.clear();
        state.puffs.length = 0;
        state.footfalls = 0;
    }
    state.lastClock = clock;
    state.puffs = state.puffs.filter(puff => clock - puff.at < HOLLOW_GROUND.life);
    const present = new Set();
    for (const enemy of snapshot?.enemies ?? []) {
        if (Number(enemy.kind) !== 0 || !Number.isSafeInteger(enemy.entityId)) continue;
        const id = enemy.entityId;
        present.add(id);
        const pose = hollow?.entities?.get(id);
        if (!pose || !Number.isFinite(pose.distance)) continue;
        const stepIndex = Math.floor((pose.distance + .00001) / HOLLOW_GROUND.halfStride);
        const prior = state.walkers.get(id);
        if (!prior || pose.distance < prior.distance || enemy.emergeProgress != null) {
            state.walkers.set(id, { distance: pose.distance, stepIndex });
            continue;
        }
        if (stepIndex > prior.stepIndex && !snapshot.paused && !snapshot.ended &&
            !enemy.frozen && pose.clip === 'walk' && FACING[pose.direction] !== undefined) {
            const angle = FACING[pose.direction];
            const radius = Math.max(6, Number(enemy.radius) || 11);
            const side = (stepIndex % 2 ? 1 : -1) * radius * .31;
            const back = radius * .16;
            const x = enemy.x - Math.cos(angle) * back - Math.sin(angle) * side;
            const y = enemy.y - Math.sin(angle) * back * .45 + Math.cos(angle) * side * .35 - (Number(enemy.z) || 0);
            const material = hollowGroundMaterial(terrainFrame, enemy.x, enemy.y);
            if (material !== 'lava') {
                state.puffs.push({ entityId: id, x, y, at: clock, material, stepIndex });
                state.footfalls++;
                if (state.puffs.length > HOLLOW_GROUND.maxPuffs) state.puffs.shift();
            }
        }
        prior.distance = pose.distance;
        prior.stepIndex = stepIndex;
    }
    for (const id of state.walkers.keys()) if (!present.has(id)) state.walkers.delete(id);
}

const MATERIAL = Object.freeze({soil: 0, ash: 1, stone: 2});
function alphaFor(material, band, emerging) {
    if (material === 'lava') return 0;
    const base = material === 'stone' ? .34 : material === 'ash' ? .65 : band === 0 ? .42 : .57;
    return base * (emerging ? .86 : 1);
}

function drawPuff(ctx, material, x, y, frame, width, alpha) {
    if (!atlas || alpha <= 0 || MATERIAL[material] === undefined) return false;
    const height = Math.round(width * HOLLOW_GROUND.height / HOLLOW_GROUND.width);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, frame * HOLLOW_GROUND.width, MATERIAL[material] * HOLLOW_GROUND.height,
        HOLLOW_GROUND.width, HOLLOW_GROUND.height,
        Math.round(x - width / 2), Math.round(y - height * .85), width, height);
    ctx.restore();
    return true;
}

// Draw under the source-authored character, inside the SAME depth-sorted GPU/Canvas
// actor layer and terrain-occlusion pass. RaisedActor already projected its feet.
export function drawHollowGroundVfx(ctx, enemy, state, terrainFrame, band = 0, reducedMotion = false) {
    if (!atlas || Number(enemy?.kind) !== 0) return 0;
    const radius = Math.max(6, Number(enemy.radius) || 11);
    let drawn = 0;
    const progress = enemy.emergeProgress;
    if (Number.isFinite(progress) && progress >= .13 && progress < .77) {
        const material = hollowGroundMaterial(terrainFrame, enemy.x, enemy.y + (Number(enemy.z) || 0));
        const duration = (progress - .13) / .64;
        const frame = reducedMotion ? 3 : Math.min(HOLLOW_GROUND.frames - 1, Math.floor(duration * HOLLOW_GROUND.frames));
        if (!reducedMotion || progress < .3)
            drawn += Number(drawPuff(ctx, material, enemy.x, enemy.y, frame, Math.round(radius * 3.3),
                alphaFor(material, band, true) * (1 - duration * .4)));
        // The two approved crawl clips and the existing C# emergence chips remain untouched.
        return drawn;
    }
    for (const puff of state.puffs) {
        if (puff.entityId !== enemy.entityId) continue;
        const elapsed = state.lastClock - puff.at;
        if (elapsed < 0 || elapsed >= HOLLOW_GROUND.life) continue;
        if (reducedMotion && elapsed > .10) continue;
        const frame = reducedMotion ? 2 : Math.min(HOLLOW_GROUND.frames - 1,
            Math.floor(elapsed / HOLLOW_GROUND.life * HOLLOW_GROUND.frames));
        const alpha = alphaFor(puff.material, band, false) * (1 - elapsed / HOLLOW_GROUND.life);
        drawn += Number(drawPuff(ctx, puff.material, puff.x, puff.y, frame,
            Math.round(radius * 2.1), alpha));
    }
    return drawn;
}

export function hollowGroundDiagnostics(state) {
    return { footfalls: state.footfalls, activePuffs: state.puffs.length,
        trackedHollowed: state.walkers.size, atlasReady: Boolean(atlas) };
}
