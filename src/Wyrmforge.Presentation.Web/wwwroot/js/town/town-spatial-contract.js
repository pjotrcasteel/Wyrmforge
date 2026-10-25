// Town T3: renderer- and AI-independent spatial queries derived from authored 3D collider meshes.
// The navigation service computes space/paths ONLY. It never chooses NPC or enemy behavior.
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const distanceToSegment = (x, y, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len)) : 0;
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
};
function convexHull(points) {
    const sorted = [...new Map(points.map(p => [p.join(","), p])).values()]
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3) throw new TypeError("3D collider has no ground footprint");
    const lower = [], upper = [];
    for (const p of sorted) {
        while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
        lower.push(p);
    }
    for (const p of [...sorted].reverse()) {
        while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
        upper.push(p);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function withinPolygon(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a[1] > y) !== (b[1] > y) &&
            x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
}
function nearPolygon(poly, x, y, radius) {
    if (withinPolygon(poly, x, y)) return true;
    return poly.some((a, i) => distanceToSegment(x, y, a, poly[(i + 1) % poly.length]) <= radius);
}
function hasGroundMargin(poly, x, y, radius) {
    if (!withinPolygon(poly, x, y)) return false;
    return poly.every((a, i) =>
        distanceToSegment(x, y, a, poly[(i + 1) % poly.length]) >= radius);
}

// A mesh group can contain multiple disconnected physical objects. AABB of an entire
// group would incorrectly seal the open World Gate between its pillars.
function connectedMeshShells(group, allVertices) {
    const parent = new Map();
    const root = value => {
        if (!parent.has(value)) parent.set(value, value);
        let cur = value;
        while (parent.get(cur) !== cur) cur = parent.get(cur);
        while (parent.get(value) !== value) {
            const next = parent.get(value);
            parent.set(value, cur);
            value = next;
        }
        return cur;
    };
    for (const tri of group.triangles) {
        const leader = root(tri[0]);
        for (const id of tri.slice(1)) parent.set(root(id), leader);
    }
    const components = new Map();
    for (const id of parent.keys()) {
        const key = root(id);
        if (!components.has(key)) components.set(key, new Set());
        components.get(key).add(id);
    }
    return [...components.values()].map(indices => [...indices].map(i => allVertices[i]));
}

export function buildTownSpatialIndex(scene, parsed, {cellSize = .25, standingHeight = 1.65} = {}) {
    if (!scene || !Array.isArray(scene.nodes) || !(parsed?.groups instanceof Map) ||
        !Array.isArray(parsed.vertices) || !Number.isFinite(cellSize) || cellSize < .1 || cellSize > 1 ||
        !Number.isFinite(standingHeight) || standingHeight <= 0)
        throw new TypeError("Invalid Town spatial scene or indexing resolution");
    const colliders = [], walkable = [];
    for (const node of scene.nodes) {
        if (!node.meshId) continue;
        const group = parsed.groups.get(node.meshId.split("#")[1]);
        if (!group) throw new TypeError(`Missing Town spatial mesh: ${node.id}`);
        // This first metric sample uses identity mesh transforms. Reject unhandled transforms:
        // silently flattening a translated/rotated 3D obstacle would break future NPC paths.
        const t = node.transform;
        if (t.position.some(n => n !== 0) || t.rotationDegrees.some(n => n !== 0) ||
            t.scale.some(n => n !== 1))
            throw new Error(`Nonidentity Town collider transform requires world-space baking: ${node.id}`);
        const shells = connectedMeshShells(group, parsed.vertices);
        for (const [index, vertices] of shells.entries()) {
            const minZ = Math.min(...vertices.map(v => v[2]));
            const maxZ = Math.max(...vertices.map(v => v[2]));
            if (maxZ < 0) continue;
            const hull = convexHull(vertices.map(([x, y]) => [x, y]));
            if (node.tags.includes("navigation")) {
                walkable.push({id: `${node.id}#${index}`, footprint: hull});
            } else if (node.roles.includes("collider") && minZ < standingHeight) {
                colliders.push({id: `${node.id}#${index}`, footprint: hull, minZ, maxZ});
            }
        }
    }
    if (!walkable.length) throw new TypeError("Town scene lacks an authored navigable ground surface");
    const bounds = {
        minX: Math.min(...walkable.flatMap(x => x.footprint.map(p => p[0]))),
        maxX: Math.max(...walkable.flatMap(x => x.footprint.map(p => p[0]))),
        minY: Math.min(...walkable.flatMap(x => x.footprint.map(p => p[1]))),
        maxY: Math.max(...walkable.flatMap(x => x.footprint.map(p => p[1])))
    };
    const anchors = new Map(scene.nodes.filter(n => n.roles.includes("anchor"))
        .map(n => [n.id, [...n.transform.position]]));
    const isWalkable = (x, y, radius = .15, dynamicObstacles = []) => {
        if (![x, y, radius].every(Number.isFinite) || radius < 0 || radius > 1)
            throw new RangeError("Invalid Town footpoint or actor clearance");
        if (!walkable.some(p => hasGroundMargin(p.footprint, x, y, radius))) return false;
        return ![...colliders, ...dynamicObstacles].some(p => nearPolygon(p.footprint, x, y, radius));
    };
    const route = (from, to, {radius = .15, dynamicObstacles = [], maxExplored = 5000} = {}) => {
        if (![from?.x, from?.y, to?.x, to?.y].every(Number.isFinite))
            throw new RangeError("Invalid Town route endpoints");
        if (!isWalkable(from.x, from.y, radius, dynamicObstacles) ||
            !isWalkable(to.x, to.y, radius, dynamicObstacles)) return null;
        const cols = Math.floor((bounds.maxX - bounds.minX) / cellSize) + 1;
        const rows = Math.floor((bounds.maxY - bounds.minY) / cellSize) + 1;
        const ix = x => Math.max(0, Math.min(cols - 1, Math.round((x - bounds.minX) / cellSize)));
        const iy = y => Math.max(0, Math.min(rows - 1, Math.round((y - bounds.minY) / cellSize)));
        const at = (cx, cy) => ({x: bounds.minX + cx * cellSize, y: bounds.minY + cy * cellSize});
        const key = (cx, cy) => cy * cols + cx;
        const start = key(ix(from.x), iy(from.y)), end = key(ix(to.x), iy(to.y));
        const queue = [{key: start, cost: 0, f: 0}];
        const parent = new Map(), best = new Map([[start, 0]]), closed = new Set();
        const distance = k => Math.hypot(k % cols - end % cols, Math.floor(k / cols) - Math.floor(end / cols));
        for (let explored = 0; queue.length && explored < maxExplored; explored++) {
            queue.sort((a, b) => a.f - b.f || a.key - b.key);
            const current = queue.shift();
            if (closed.has(current.key)) { explored--; continue; }
            closed.add(current.key);
            if (current.key === end) {
                const path = [];
                let k = current.key;
                while (k !== start) {
                    path.push(at(k % cols, Math.floor(k / cols)));
                    k = parent.get(k);
                }
                path.push(from);
                path.reverse();
                path.push(to);
                return path;
            }
            const cx = current.key % cols, cy = Math.floor(current.key / cols);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const nk = key(nx, ny), p = at(nx, ny);
                if (closed.has(nk) || !isWalkable(p.x, p.y, radius, dynamicObstacles)) continue;
                if (dx && dy) {
                    const hx = at(nx, cy), hy = at(cx, ny);
                    if (!isWalkable(hx.x, hx.y, radius, dynamicObstacles) ||
                        !isWalkable(hy.x, hy.y, radius, dynamicObstacles)) continue;
                }
                const cost = best.get(current.key) + Math.hypot(dx, dy);
                if (cost >= (best.get(nk) ?? Infinity)) continue;
                best.set(nk, cost); parent.set(nk, current.key);
                queue.push({key: nk, cost, f: cost + distance(nk)});
            }
        }
        return null;
    };
    return {cellSize, bounds, colliders, walkable, anchors, isWalkable, route};
}
