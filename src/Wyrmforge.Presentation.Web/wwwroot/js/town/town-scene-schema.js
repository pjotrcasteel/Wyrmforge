// Town T1 authoritative scene data contracts. Renderer and AI independent.
// Units: metres; +X east, +Y north, +Z up; transforms are parent-relative.
export const TOWN_SCENE_SCHEMA_VERSION = 1;
export const TOWN_WORLD_AXES = Object.freeze({east: "+x", north: "+y", up: "+z", units: "m"});

const ROLES = new Set(["visual", "collider", "occluder", "emitter", "anchor"]);
const TAGS = new Set(["building", "entrance", "interaction", "navigation", "landmark", "fixture", "terrain"]);

function vector3(value, label) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite))
        throw new TypeError(`${label} must be a finite 3-element vector`);
    return [...value];
}

export function validateTownScene(scene) {
    if (!scene || scene.version !== TOWN_SCENE_SCHEMA_VERSION || !Array.isArray(scene.nodes))
        throw new TypeError("Unsupported Town scene schema");
    const ids = new Set();
    for (const node of scene.nodes) {
        if (typeof node.id !== "string" || !/^town\.[a-z0-9.-]+$/.test(node.id) || ids.has(node.id))
            throw new TypeError(`Invalid or duplicate Town node ID: ${node.id}`);
        ids.add(node.id);
        if (node.parentId != null && (typeof node.parentId !== "string" || node.parentId === node.id))
            throw new TypeError(`Invalid parent for ${node.id}`);
        if (!Array.isArray(node.roles) || !node.roles.length || node.roles.some(role => !ROLES.has(role)))
            throw new TypeError(`Invalid roles for ${node.id}`);
        if (!Array.isArray(node.tags) || node.tags.some(tag => !TAGS.has(tag)))
            throw new TypeError(`Invalid tags for ${node.id}`);
        vector3(node.transform?.position, `${node.id}.position`);
        vector3(node.transform?.rotationDegrees, `${node.id}.rotationDegrees`);
        const scale = vector3(node.transform?.scale, `${node.id}.scale`);
        if (scale.some(component => component <= 0)) throw new RangeError(`Invalid scale for ${node.id}`);
        if (node.materialId != null && typeof node.materialId !== "string")
            throw new TypeError(`Invalid material ID for ${node.id}`);
        if (node.meshId != null && typeof node.meshId !== "string")
            throw new TypeError(`Invalid mesh ID for ${node.id}`);
    }
    for (const node of scene.nodes) {
        if (node.parentId != null && !ids.has(node.parentId))
            throw new TypeError(`Missing parent ${node.parentId} for ${node.id}`);
        const visited = new Set([node.id]);
        let current = node;
        while (current.parentId != null) {
            if (visited.has(current.parentId)) throw new TypeError(`Town hierarchy cycle at ${node.id}`);
            visited.add(current.parentId);
            current = scene.nodes.find(candidate => candidate.id === current.parentId);
        }
    }
    return scene;
}
