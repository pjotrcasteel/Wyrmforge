// G4 town migration contract. Navigation polygons are authoritative for feet and
// foreground masking, NOT evidence of building height, surface normals or lighting.
// Art-derived receiver/caster geometry must be authored and reviewed separately.
const polygon = (points, label) => {
    if (!Array.isArray(points) || points.length < 3 ||
        points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
        throw new TypeError(`Invalid town polygon: ${label}`);
    return points.map(p => ({ x: p.x, y: p.y }));
};

export function townRelightableContract(navigation) {
    if (!navigation || !Number.isFinite(navigation.width) || !Number.isFinite(navigation.height) ||
        navigation.width <= 0 || navigation.height <= 0) throw new TypeError('Invalid town dimensions');
    const entries = (key, shape) => {
        if (!Array.isArray(navigation[key])) throw new TypeError(`Missing town ${key}`);
        const ids = new Set();
        return navigation[key].map(item => {
            if (typeof item.id !== 'string' || !item.id || ids.has(item.id))
                throw new TypeError(`Duplicate or missing town ${key} ID`);
            ids.add(item.id);
            return { id: item.id, polygon: polygon(item[shape], item.id),
                ...(key === 'occluders' ? { depthY: item.depthY, legacyArtwork: item.artwork } : {}) };
        });
    };
    return {
        sourceSize: { width: navigation.width, height: navigation.height },
        walkable: entries('walkable', 'points'),
        collision: entries('obstacles', 'footprint'),
        foreground: entries('occluders', 'clip'),
        // The navigation metadata does not define the physical light geometry.
        // Never synthesize world-space shadows from these collision polygons.
        lightingGeometry: [],
        migration: 'awaiting-authored-relightable-layers'
    };
}

export async function loadTownRelightableContract(url = new URL('../../art/town/night-navigation.json', import.meta.url)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Town navigation unavailable: HTTP ${response.status}`);
    return townRelightableContract(await response.json());
}
