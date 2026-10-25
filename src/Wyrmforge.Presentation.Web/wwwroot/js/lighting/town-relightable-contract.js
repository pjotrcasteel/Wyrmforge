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

// Convert only explicitly authored world geometry. The approved panorama and
// navigation masks are not promoted into fake mesh geometry.
export function buildTownLightingSnapshot(contract, layers, emitters = [], environment = { ambient: 0 }) {
    if (!contract || contract.migration !== 'awaiting-authored-relightable-layers')
        throw new TypeError('Invalid town migration contract');
    if (!Array.isArray(layers) || !Array.isArray(emitters)) throw new TypeError('Invalid town scene inputs');
    const ids = new Set(), materials = new Map();
    const objects = layers.map(layer => {
        if (!layer || !layer.id || ids.has(layer.id) || !layer.geometry || !layer.material ||
            !Array.isArray(layer.position) || layer.position.length !== 3 ||
            layer.position.some(value => !Number.isFinite(value)))
            throw new TypeError('Invalid or duplicate authored town layer');
        ids.add(layer.id);
        if (!layer.material.id) throw new TypeError('Town layer material must have an ID');
        const previous = materials.get(layer.material.id);
        if (previous && JSON.stringify(previous) !== JSON.stringify(layer.material))
            throw new TypeError(`Conflicting town material: ${layer.material.id}`);
        materials.set(layer.material.id, layer.material);
        return { id: layer.id, ownerId: layer.id, geometry: layer.geometry,
            material: layer.material.id, position: [...layer.position],
            scale: [...(layer.scale ?? [1, 1, 1])],
            rotation: [...(layer.rotation ?? [0, 0, 0])],
            receivesLight: layer.receivesLight !== false,
            receivesShadow: layer.receivesShadow !== false,
            castsShadow: layer.castsShadow !== false };
    });
    return { version: 1, time: 0, objects, materials: [...materials.values()],
        lights: emitters.map(light => ({ ...light })), environment: { ...environment } };
}

export async function loadTownRelightableContract(url = new URL('../../art/town/night-navigation.json', import.meta.url)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Town navigation unavailable: HTTP ${response.status}`);
    return townRelightableContract(await response.json());
}
