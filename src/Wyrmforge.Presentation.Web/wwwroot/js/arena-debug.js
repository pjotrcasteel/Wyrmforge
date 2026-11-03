// Debug and automation switches, all opt-in by URL (`?speed=8&god=1&bot=1`) so CI, designers and agents can drive a Hunt
// without UI scripting. They never change authoritative rules: `speed` runs more fixed C# ticks per frame, `god` tops health up,
// and `bot` only supplies movement input like a player would.
export const MAX_DEBUG_SPEED = 20;

export function readArenaDebugFlags(search = globalThis.location?.search ?? '') {
    const params = new URLSearchParams(search);
    const speed = Number.parseInt(params.get('speed') ?? '1', 10);
    return {
        speed: Number.isFinite(speed) ? Math.min(MAX_DEBUG_SPEED, Math.max(1, speed)) : 1,
        god: params.get('god') === '1',
        bot: params.get('bot') === '1',
        bright: params.get('bright') === '1',
        // Metric oblique (shear) camera for the Hunt GPU world; the legacy stretched camera stays the default.
        shear: params.get('shear') === '1',
        // Review lighting: sets only the ambient term of the lighting frame (e.g. `?ambient=0.9`); never touches C# state.
        ambient: Number.isFinite(Number.parseFloat(params.get('ambient') ?? '')) ? Number.parseFloat(params.get('ambient')) : null,
        // Presents the Hunt as if it lay in influence band 0..3 (Wet, Scorched, Burning, Volcanic); presentation only.
        band: /^[0-3]$/.test(params.get('band') ?? '') ? Number(params.get('band')) : null,
    };
}

export const DEBUG_BRIGHT_AMBIENT = 10;
export const DEBUG_BRIGHT_COLOR = '#e6ecff';

/** Debug inspection light: raises only the ambient term of a lighting frame so terrain can be reviewed; never touches C# state. */
export function withDebugAmbient(frame, bright, ambient = null) {
    if (ambient !== null && ambient !== undefined && !bright && frame?.environment) return { ...frame, environment: { ...frame.environment, ambient } };
    if (!bright || !frame?.environment) return frame;
    return { ...frame, environment: { ...frame.environment, ambient: Math.max(frame.environment.ambient ?? 0, DEBUG_BRIGHT_AMBIENT), color: DEBUG_BRIGHT_COLOR } };
}

const KITE_RADIUS = 260;
const EDGE_MARGIN = 160;

function normalized(x, y, deadZone = 0.3) {
    const length = Math.hypot(x, y);
    // Never emit NaN: it cannot cross the .NET interop boundary and would stop the whole frame loop.
    return length === 0 || length < deadZone ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** Flee nearby enemies, avoid the arena edge and drift toward open centre while auto-aim does the killing. */
export function botKiteDirection(snapshot) {
    const player = snapshot?.player;
    if (!player) return { x: 0, y: 0 };
    const world = snapshot.world ?? { width: 1024, height: 1920 };
    let vx = (world.width / 2 - player.x) * 0.002, vy = (world.height / 2 - player.y) * 0.002;
    vx += Math.max(0, EDGE_MARGIN - player.x) / 20 - Math.max(0, player.x - (world.width - EDGE_MARGIN)) / 20;
    vy += Math.max(0, EDGE_MARGIN - player.y) / 20 - Math.max(0, player.y - (world.height - EDGE_MARGIN)) / 20;
    for (const enemy of snapshot.enemies ?? []) {
        const dx = player.x - enemy.x, dy = player.y - enemy.y, distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < KITE_RADIUS) {
            vx += dx / distance * (KITE_RADIUS - distance) / 40;
            vy += dy / distance * (KITE_RADIUS - distance) / 40;
        }
    }
    return normalized(vx, vy, 0.4);
}

export const HUNT_REMAINING = 3;
const HUNT_RANGE = 200;
const CLOSE_RANGE = 60;
const HOLD_BEFORE_CLOSING_MS = 4000;
const CELL = 32;
const MAX_STEP_MICROCELLS = 4;
const LAVA = 3;

function cellIndex(frame, x, y) {
    const column = Math.min(frame.columns - 1, Math.max(0, Math.floor(x / CELL)));
    const row = Math.min(frame.rows - 1, Math.max(0, Math.floor(y / CELL)));
    return { column, row, index: row * frame.columns + column };
}

function canStep(frame, from, to) {
    return frame.material[to] !== LAVA && Math.abs(frame.surface[from] - frame.surface[to]) <= MAX_STEP_MICROCELLS;
}

const PLAYER_CLEARANCE = 20;

/** Solid salvage props the terrain grid cannot see: cells they cover (plus hunter clearance) are blocked for the walk. */
function blockedByProps(frame, props) {
    const blocked = new Uint8Array(frame.columns * frame.rows);
    for (const prop of props ?? []) {
        const reach = (prop.radius ?? 16) + PLAYER_CLEARANCE;
        const first = cellIndex(frame, prop.x - reach, prop.y - reach), last = cellIndex(frame, prop.x + reach, prop.y + reach);
        for (let row = first.row; row <= last.row; row++)
            for (let column = first.column; column <= last.column; column++)
                if (Math.hypot((column + 0.5) * CELL - prop.x, (row + 0.5) * CELL - prop.y) <= reach + CELL / 2)
                    blocked[row * frame.columns + column] = 1;
    }
    return blocked;
}

/**
 * Walking direction toward a world point over the streamed terrain, using the same step and lava rules the C# navigation
 * applies, plus solid props. Breadth-first from the target, then one step downhill from the hunter. Null when unreachable.
 */
export function flowDirection(frame, from, target, props = []) {
    if (!frame) return null;
    const start = cellIndex(frame, from.x, from.y), goal = cellIndex(frame, target.x, target.y);
    const blocked = blockedByProps(frame, props);
    blocked[start.index] = 0;
    blocked[goal.index] = 0;
    const distance = new Int32Array(frame.columns * frame.rows).fill(-1);
    const queue = [goal.index];
    distance[goal.index] = 0;
    for (let head = 0; head < queue.length; head++) {
        const current = queue[head];
        if (current === start.index) break;
        const column = current % frame.columns, row = Math.floor(current / frame.columns);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = column + dc, nr = row + dr;
            if (nc < 0 || nr < 0 || nc >= frame.columns || nr >= frame.rows) continue;
            const next = nr * frame.columns + nc;
            if (distance[next] !== -1 || blocked[next] || !canStep(frame, current, next)) continue;
            distance[next] = distance[current] + 1;
            queue.push(next);
        }
    }
    if (distance[start.index] === -1) return null;
    if (start.index === goal.index) return normalized(target.x - from.x, target.y - from.y, 6);
    let best = null;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = start.column + dc, nr = start.row + dr;
        if (nc < 0 || nr < 0 || nc >= frame.columns || nr >= frame.rows) continue;
        const next = nr * frame.columns + nc;
        if (distance[next] !== -1 && distance[next] < distance[start.index] && (!best || distance[next] < distance[best.index]))
            best = { index: next, column: nc, row: nr };
    }
    if (!best) return null;
    return normalized((best.column + 0.5) * CELL - from.x, (best.row + 0.5) * CELL - from.y, 0);
}

/** With only a few enemies (or a Wyrm) left, close to firing range instead of fleeing so the encounter can finish. */
export function botHuntDirection(snapshot, frame = null, range = HUNT_RANGE) {
    const player = snapshot?.player;
    const foes = [...(snapshot?.enemies ?? []), ...(snapshot?.dragon ? [snapshot.dragon] : [])];
    if (!player || foes.length === 0 || foes.length > HUNT_REMAINING) return null;
    let nearest = null, best = Number.POSITIVE_INFINITY;
    for (const foe of foes) {
        const distance = Math.hypot(foe.x - player.x, foe.y - player.y);
        if (distance < best) { best = distance; nearest = foe; }
    }
    if (best <= range) return { x: 0, y: 0 };
    return flowDirection(frame, player, nearest, snapshot.environment?.props) ?? normalized(nearest.x - player.x, nearest.y - player.y, 0);
}

export function createBotMemory() {
    return { bestDistance: Number.POSITIVE_INFINITY, progressAt: 0, detourUntil: 0, detour: { x: 0, y: 0 }, holdSince: null };
}

/** Kite until the exit opens, then walk to it, sidestepping when props or rock pin the straight line. */
export function botMovement(snapshot, memory, now, frame = null) {
    const player = snapshot?.player;
    if (!player || snapshot.paused || snapshot.ended) return { x: 0, y: 0 };
    const exit = snapshot.exit ?? snapshot.extraction;
    if (!exit) {
        memory.bestDistance = Number.POSITIVE_INFINITY;
        // A foe that survives a few seconds in range is probably behind cover: keep closing until it is in the open.
        const hold = memory.holdSince != null && now - memory.holdSince > HOLD_BEFORE_CLOSING_MS;
        const hunt = botHuntDirection(snapshot, frame, hold ? CLOSE_RANGE : HUNT_RANGE);
        memory.holdSince = hunt && hunt.x === 0 && hunt.y === 0 ? (memory.holdSince ?? now) : null;
        return hunt ?? botKiteDirection(snapshot);
    }
    const dx = exit.x - player.x, dy = exit.y - player.y, distance = Math.hypot(dx, dy);
    const flow = frame ? flowDirection(frame, player, exit, snapshot.environment?.props) : null;
    const heading = flow && distance >= 40 ? flow : normalized(dx, dy, 6);
    if (distance < memory.bestDistance - 2) { memory.bestDistance = distance; memory.progressAt = now; }
    else if (now - memory.progressAt > 1200 && (heading.x !== 0 || heading.y !== 0)) {
        // Props the terrain grid cannot see can pin the walk: sidestep perpendicular to the heading, alternating sides.
        const side = memory.detour.x === 0 && memory.detour.y === 0 || memory.detour.x * -heading.y + memory.detour.y * heading.x < 0 ? 1 : -1;
        memory.detour = normalized(-heading.y * side, heading.x * side, 0);
        memory.detourUntil = now + 700;
        memory.progressAt = now;
        memory.bestDistance = Number.POSITIVE_INFINITY;
    }
    if (now < memory.detourUntil) return memory.detour;
    return heading;
}
