// Town T1: renderer-independent coordinate and stable semantic identity contracts.
// Pure functions: no scene mutations, NPC behavior, renderer, or GPU dependency.
export const TOWN_DISTRICTS = Object.freeze(["west", "center", "east"]);
export const TOWN_SCENE_IDS = Object.freeze({
    gate: "town.center.world-gate",
    well: "town.center.well",
    noticeboard: "town.center.noticeboard",
    arcaneNexus: "town.arcane-nexus",
    blacksmith: "town.blacksmith",
    codex: "town.codex",
    hallOfFame: "town.hall-of-fame"
});

export function townDistrictIndex(district) {
    const index = TOWN_DISTRICTS.indexOf(district);
    if (index < 0) throw new RangeError(`Unknown Town district: ${district}`);
    return index;
}

// The current production panorama is 1672 x 941, split into three camera districts.
// This is an explicit legacy *reference* frame, not the future 3D mesh coordinate system.
export const LEGACY_TOWN_FRAME = Object.freeze({width: 1672, height: 941, districts: 3});

export function legacyTownToNormalized(x, y, frame = LEGACY_TOWN_FRAME) {
    if (![x, y, frame.width, frame.height].every(Number.isFinite) || frame.width <= 0 || frame.height <= 0)
        throw new RangeError("Invalid Town coordinates or frame dimensions");
    return {u: x / frame.width, v: y / frame.height};
}

export function normalizedToLegacyTown(u, v, frame = LEGACY_TOWN_FRAME) {
    if (![u, v, frame.width, frame.height].every(Number.isFinite) || frame.width <= 0 || frame.height <= 0)
        throw new RangeError("Invalid Town coordinates or frame dimensions");
    return {x: u * frame.width, y: v * frame.height};
}

export function townDistrictFromNormalizedU(u) {
    if (!Number.isFinite(u) || u < 0 || u > 1) throw new RangeError("Town u must be within [0, 1]");
    return TOWN_DISTRICTS[Math.min(2, Math.floor(u * 3))];
}
