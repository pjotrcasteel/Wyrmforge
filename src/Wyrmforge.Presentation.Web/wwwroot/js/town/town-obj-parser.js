// T1/T2 geometry importer for authored OBJ groups. No renderer, lighting or AI dependencies.
// Each g <semantic-id> is a mesh identifier in the scene graph; face data are local metres.
const VALID_GROUP = /^town\.[a-z0-9.-]+$/;

export function parseTownObj(source) {
    if (typeof source !== "string" || source.length > 10_000_000)
        throw new TypeError("Expected bounded OBJ text");
    const vertices = [];
    const groups = new Map();
    let groupId = null;
    let materialId = null;
    let faces = 0;
    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const parts = line.split(/\s+/);
        switch (parts[0]) {
            case "v": {
                if (parts.length !== 4) throw new TypeError("Expected three OBJ vertex coordinates");
                const v = parts.slice(1).map(Number);
                if (v.some(n => !Number.isFinite(n))) throw new TypeError("Nonfinite OBJ vertex");
                vertices.push(v);
                break;
            }
            case "g": {
                groupId = parts[1];
                if (parts.length !== 2 || !VALID_GROUP.test(groupId) || groups.has(groupId))
                    throw new TypeError(`Invalid or duplicate Town OBJ group ${groupId}`);
                groups.set(groupId, {id: groupId, materialId: null, triangles: [], positions: []});
                break;
            }
            case "usemtl":
                materialId = parts[1];
                if (parts.length !== 2 || !materialId || !groupId)
                    throw new TypeError("OBJ material must follow a group");
                if (groups.get(groupId).materialId && groups.get(groupId).materialId !== materialId)
                    throw new TypeError(`Mixed materials in Town group ${groupId}`);
                groups.get(groupId).materialId = materialId;
                break;
            case "f": {
                const group = groups.get(groupId);
                if (!group || !materialId || parts.length < 4 || parts.length > 5)
                    throw new TypeError("OBJ face requires a semantic group, material and 3-4 vertices");
                const indices = parts.slice(1).map(ref => {
                    if (!/^\d+(?:\/\d*){0,2}$/.test(ref)) throw new TypeError("Invalid OBJ face reference");
                    const index = Number(ref.split("/")[0]) - 1;
                    if (!Number.isSafeInteger(index) || index < 0 || index >= vertices.length)
                        throw new RangeError("OBJ face references a missing vertex");
                    return index;
                });
                for (let i = 1; i < indices.length - 1; i++) {
                    const tri = [indices[0], indices[i], indices[i + 1]];
                    const [a, b, c] = tri.map(idx => vertices[idx]);
                    const ab = b.map((n, axis) => n - a[axis]);
                    const ac = c.map((n, axis) => n - a[axis]);
                    const cross = [ab[1]*ac[2]-ab[2]*ac[1],
                        ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
                    if (Math.hypot(...cross) < 1e-8) throw new RangeError("Degenerate Town OBJ triangle");
                    group.triangles.push(tri);
                    group.positions.push(...a, ...b, ...c);
                    if (++faces > 200_000) throw new RangeError("Town OBJ triangle budget exceeded");
                }
                break;
            }
            default:
                // OBJ metadata including mtllib is not executable and cannot modify geometry.
                if (!["mtllib", "o", "s", "vn", "vt"].includes(parts[0]))
                    throw new TypeError(`Unsupported Town OBJ command ${parts[0]}`);
        }
    }
    if (!groups.size || [...groups.values()].some(g => !g.materialId || !g.triangles.length))
        throw new TypeError("Town OBJ must include nonempty, material-bound semantic groups");
    return {vertices, groups, triangleCount: faces};
}
