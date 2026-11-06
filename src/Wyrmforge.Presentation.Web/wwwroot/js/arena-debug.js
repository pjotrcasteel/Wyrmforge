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
        // ?bot=road walks the road from the spawn to the exit instead of kiting: the review bot for the field ambushes.
        botRoad: params.get('bot') === 'road',
        bright: params.get('bright') === '1',
        // Metric oblique (shear) camera for the Hunt GPU world; the legacy stretched camera stays the default.
        shear: params.get('shear') === '1',
        // Review lighting: sets only the ambient term of the lighting frame (e.g. `?ambient=0.9`); never touches C# state.
        ambient: Number.isFinite(Number.parseFloat(params.get('ambient') ?? '')) ? Number.parseFloat(params.get('ambient')) : null,
        // Presents the Hunt as if it lay in influence band 0..3 (Wet, Scorched, Burning, Volcanic); presentation only.
        band: /^[0-3]$/.test(params.get('band') ?? '') ? Number(params.get('band')) : null,
        // Review switch for the moon-shadow decision (?moonShadows=1): the directional moon casts GPU shadows in the lighting frame; presentation only.
        moonShadows: params.get('moonShadows') === '1',
        // Hunt 1.0 GPU surface density in pixels per world unit (`?renderScale=1` for the old 32 px/m look); null uses the terrain art scale.
        renderScale: /^[12]$/.test(params.get('renderScale') ?? '') ? Number(params.get('renderScale')) : null,
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

/** Review lighting: lets the moon's directional light cast GPU shadows (it does not by default, see NightSkyLightingProjection); never touches C# state. */
export function withMoonShadows(frame, enabled) {
    if (!enabled || !Array.isArray(frame?.lights)) return frame;
    return { ...frame, lights: frame.lights.map(light => light.id === 'sky:moon' ? { ...light, castsShadow: true } : light) };
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
const HOLD_BEFORE_CLOSING_MS = 4000;
const HUNT_STUCK_MS = 1200;
const HUNT_DETOUR_MS = 700;
const HUNT_PROGRESS_UNITS = 8;
const HUNT_STALLED_MS = 8000;
const HUNT_STALLED_MAX_FOES = 20;
const CELL = 32;
const MAX_STEP_MICROCELLS = 4;
const LAVA = 3;
const HUNTER_RADIUS = 14;

function cellIndex(frame, x, y) {
    const column = Math.min(frame.columns - 1, Math.max(0, Math.floor(x / CELL)));
    const row = Math.min(frame.rows - 1, Math.max(0, Math.floor(y / CELL)));
    return { column, row, index: row * frame.columns + column };
}

function canStep(frame, from, to) {
    // The renderer lowers the visible ground beneath 3D trunks and boulders. Navigation must use their original
    // authoritative column heights; otherwise the review bots walk straight into an apparently flat but solid tree.
    const height = index => frame.trunks?.get(index) ?? frame.boulders?.get(index) ?? frame.surface[index];
    return frame.material[to] !== LAVA && Math.abs(height(from) - height(to)) <= MAX_STEP_MICROCELLS;
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

/** A real hunter-sized walk, sampled at the same eight-world-unit spacing as C# ArenaTerrainGrid.BlocksMovement. */
export function walkableSegment(frame, from, target, props = []) {
    if (!frame) return true;
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 8));
    let previous = cellIndex(frame, from.x, from.y);
    for (let step = 1; step <= steps; step++) {
        const progress = step / steps;
        const x = from.x + (target.x - from.x) * progress, y = from.y + (target.y - from.y) * progress;
        const current = cellIndex(frame, x, y);
        const firstColumn = Math.floor((x - HUNTER_RADIUS) / CELL), lastColumn = Math.floor((x + HUNTER_RADIUS) / CELL);
        const firstRow = Math.floor((y - HUNTER_RADIUS) / CELL), lastRow = Math.floor((y + HUNTER_RADIUS) / CELL);
        if (firstColumn < 0 || firstRow < 0 || lastColumn >= frame.columns || lastRow >= frame.rows) return false;
        for (let row = firstRow; row <= lastRow; row++) {
            for (let column = firstColumn; column <= lastColumn; column++) {
                const index = row * frame.columns + column;
                if (frame.material[index] === LAVA || !canStep(frame, current.index, index)) return false;
            }
        }
        if (!canStep(frame, previous.index, current.index)) return false;
        if (props.some(prop => Math.hypot(prop.x - x, prop.y - y) <= (prop.radius ?? 16) + HUNTER_RADIUS)) return false;
        previous = current;
    }
    return true;
}

/** With only a few enemies (or a Wyrm) left, close to firing range instead of fleeing so the encounter can finish. */
export function botHuntDirection(snapshot, frame = null, range = HUNT_RANGE, maxFoes = HUNT_REMAINING) {
    const player = snapshot?.player;
    const foes = [...(snapshot?.enemies ?? []), ...(snapshot?.dragon ? [snapshot.dragon] : [])];
    if (!player || foes.length === 0 || foes.length > maxFoes) return null;
    let nearest = null, best = Number.POSITIVE_INFINITY;
    for (const foe of foes) {
        const distance = Math.hypot(foe.x - player.x, foe.y - player.y);
        if (distance < best) { best = distance; nearest = foe; }
    }
    if (best <= range) return { x: 0, y: 0 };
    return flowDirection(frame, player, nearest, snapshot.environment?.props) ?? normalized(nearest.x - player.x, nearest.y - player.y, 0);
}

export function createBotMemory() {
    return {
        bestDistance: Number.POSITIVE_INFINITY, progressAt: 0, detourUntil: 0, detour: { x: 0, y: 0 }, holdSince: null,
        huntClosing: false, huntPosition: null, huntProgressAt: 0, lastKillCount: null, lastKillAt: null,
    };
}

/** The CI bot must not stay pinned against cover while the last enemy remains alive. */
function unstuckHuntDirection(player, heading, memory, now) {
    if (!memory.huntPosition || Math.hypot(player.x - memory.huntPosition.x, player.y - memory.huntPosition.y) >= HUNT_PROGRESS_UNITS) {
        memory.huntPosition = { x: player.x, y: player.y };
        memory.huntProgressAt = now;
    } else if (now - memory.huntProgressAt >= HUNT_STUCK_MS && now >= memory.detourUntil) {
        const side = memory.detour.x * -heading.y + memory.detour.y * heading.x < 0 ? 1 : -1;
        memory.detour = normalized(-heading.y * side, heading.x * side, 0);
        memory.detourUntil = now + HUNT_DETOUR_MS;
        memory.huntProgressAt = now;
    }
    return now < memory.detourUntil ? memory.detour : heading;
}

/** Forked world sites expose exitPorts, not the legacy single exit; follow the closest real portal. */
function nearestExitPort(player, ports) {
    let nearest = null, bestDistance = Number.POSITIVE_INFINITY;
    for (const port of ports ?? []) {
        const distance = Math.hypot(port.x - player.x, port.y - player.y);
        if (distance < bestDistance) { nearest = port; bestDistance = distance; }
    }
    return nearest;
}

/** Walk short segments of the C# road; a safe centreline avoids cutting corners through adjacent cliffs. */
export function roadWalkDirection(snapshot, frame) {
    const player = snapshot?.player, road = frame?.road;
    if (!player || !road?.length) return null;
    const at = index => ({ x: road[index] / 16 * CELL, y: road[index + 1] / 16 * CELL });
    let nearest = 0, best = Number.POSITIVE_INFINITY;
    for (let i = 0; i + 1 < road.length; i += 2) {
        const point = at(i), distance = Math.hypot(point.x - player.x, point.y - player.y);
        if (distance < best) { best = distance; nearest = i; }
    }
    if (best > CELL * 2) {
        const nearestPoint = at(nearest);
        const flow = flowDirection(frame, player, nearestPoint, snapshot.environment?.props);
        if (flow && (flow.x !== 0 || flow.y !== 0)) return flow;
        if (walkableSegment(frame, player, nearestPoint, snapshot.environment?.props))
            return normalized(nearestPoint.x - player.x, nearestPoint.y - player.y, 0);
        // A displaced hunter should at least head back into the interior instead of following the end of the road
        // through an unreachable cliff. Once it is back in range, the short centreline segments take over.
        return normalized((snapshot.world?.width ?? frame.columns * CELL) / 2 - player.x,
            (snapshot.world?.height ?? frame.rows * CELL) / 2 - player.y, 0);
    }
    // The route is already protected by the C# generator. Prefer its nearby centreline to a shortest-path shortcut
    // across a cliff, and use the flow field only where a real obstructing prop prevents a straight segment.
    for (const step of [2, 4, 6, 8]) {
        const target = at(Math.min(road.length - 2, nearest + step));
        if (Math.hypot(target.x - player.x, target.y - player.y) < 6) continue;
        if (walkableSegment(frame, player, target, snapshot.environment?.props))
            return normalized(target.x - player.x, target.y - player.y, 0);
        const heading = flowDirection(frame, player, target, snapshot.environment?.props);
        if (heading && (heading.x !== 0 || heading.y !== 0)) return heading;
    }
    const ahead = at(Math.min(road.length - 2, nearest + 8));
    return normalized(ahead.x - player.x, ahead.y - player.y, 6);
}

/** Kite until the exit opens, then walk to it, sidestepping when props or rock pin the straight line. */
export function botMovement(snapshot, memory, now, frame = null) {
    const player = snapshot?.player;
    if (!player || snapshot.paused || snapshot.ended) return { x: 0, y: 0 };
    const exit = snapshot.exit ?? snapshot.extraction ?? nearestExitPort(player, snapshot.exitPorts);
    if (!exit) {
        memory.bestDistance = Number.POSITIVE_INFINITY;
        // In terrain Hunts the last few enemies can be stranded across a ridge or clearing while a pure kiting bot
        // circles forever. After real combat stops producing kills, switch to terrain-aware pursuit for a small pack.
        const kills = Number(snapshot.hud?.kills ?? 0);
        if (memory.lastKillCount !== kills || memory.lastKillAt == null) {
            memory.lastKillCount = kills;
            memory.lastKillAt = now;
        }
        const stalled = now - memory.lastKillAt >= HUNT_STALLED_MS;
        const maxFoes = stalled || memory.huntClosing ? HUNT_STALLED_MAX_FOES : HUNT_REMAINING;
        // Once an enemy survives sustained fire, keep pursuing it instead of alternating between a brief step and another hold.
        // A zero-range pursuit also handles cover inside the old 60-unit stopping distance.
        let hunt = botHuntDirection(snapshot, frame, memory.huntClosing ? 0 : HUNT_RANGE, maxFoes);
        if (!hunt) {
            memory.huntClosing = false;
            memory.huntPosition = null;
            memory.holdSince = null;
            return botKiteDirection(snapshot);
        }
        if (hunt.x === 0 && hunt.y === 0 && !memory.huntClosing) {
            memory.holdSince ??= now;
            if (now - memory.holdSince >= HOLD_BEFORE_CLOSING_MS) {
                memory.huntClosing = true;
                hunt = botHuntDirection(snapshot, frame, 0, maxFoes);
            }
        } else {
            memory.holdSince = null;
        }
        if (!memory.huntClosing || (hunt.x === 0 && hunt.y === 0)) return hunt;
        return unstuckHuntDirection(player, hunt, memory, now);
    }
    if (memory.huntClosing) {
        memory.detourUntil = 0;
        memory.detour = { x: 0, y: 0 };
    }
    memory.huntClosing = false;
    memory.huntPosition = null;
    memory.holdSince = null;
    const dx = exit.x - player.x, dy = exit.y - player.y, distance = Math.hypot(dx, dy);
    // On the single-exit terrain trail, the protected authored road leads to that exit. A direct goal flow can
    // instead send the bot across a cliff and trap it at the far boundary of the map.
    if (snapshot.exit && frame?.road?.length && distance >= 40) {
        const road = roadWalkDirection(snapshot, frame);
        if (road && (road.x !== 0 || road.y !== 0)) return road;
    }
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
