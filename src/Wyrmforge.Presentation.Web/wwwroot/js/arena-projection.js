// Oblique 2.5D metric contract (owner decision, 1 November 2026): one block is 1 m^3 with a 32x32 pixel top face
// and a 32x32 pixel front face. 1 m of height moves 32 px up the screen. World units equal CSS pixels at 1x camera.
// Heights come from the C# terrain as metres or 12.5 cm microcells; presentation never invents them.
export const UNITS_PER_METER = 32;
export const FACE_PIXELS = 32;
export const MICROCELLS_PER_METER = 8;
export const MICROCELL_UNITS = UNITS_PER_METER / MICROCELLS_PER_METER;

/** Ground position plus height in world units to screen space; the draw anchor, not the depth-sort key. */
export function groundToScreen(x, y, z = 0) {
    return { x, y: y - z };
}

export function screenToGround(screenX, screenY, z = 0) {
    return { x: screenX, y: screenY + z };
}

/** Actors sort by their ground-plane feet position, never by their raised screen position. */
export function depthKey(actor) {
    return actor.y + (actor.radius || 0);
}

export function microcellsToUnits(microcells) {
    return microcells * MICROCELL_UNITS;
}

export function metersToUnits(meters) {
    return meters * UNITS_PER_METER;
}

/** The 32x32 top face of a terrain column at the given surface height, in world pixels. */
export function blockTopRect(column, row, surfaceMicrocells) {
    return { x: column * FACE_PIXELS, y: row * FACE_PIXELS - microcellsToUnits(surfaceMicrocells), width: FACE_PIXELS, height: FACE_PIXELS };
}

/**
 * The visible front (south) face: it hangs from the top face's lower edge down to the neighbour in front.
 * Returns null when the neighbour is as high or higher, because nothing is exposed.
 */
export function blockFrontRect(column, row, surfaceMicrocells, frontSurfaceMicrocells) {
    const exposed = surfaceMicrocells - frontSurfaceMicrocells;
    if (exposed <= 0) return null;
    return {
        x: column * FACE_PIXELS,
        y: (row + 1) * FACE_PIXELS - microcellsToUnits(surfaceMicrocells),
        width: FACE_PIXELS,
        height: microcellsToUnits(exposed),
    };
}

/** Terrain rows draw back to front; a row's depth is the ground position of its front edge. */
export function terrainRowDepth(row) {
    return (row + 1) * FACE_PIXELS;
}

/** Native-pixel snap for world-anchored terrain so faces never straddle device pixels. */
export function pixelSnap(value, pixelRatio = 1) {
    return Math.round(value * pixelRatio) / pixelRatio;
}

/** Screen-space top-left of the camera-visible terrain row/column window, for viewport-cropped drawing. */
export function visibleColumnRange(cameraX, viewWidth, columns, margin = 1) {
    return {
        first: Math.max(0, Math.floor(cameraX / FACE_PIXELS) - margin),
        last: Math.min(columns - 1, Math.floor((cameraX + viewWidth) / FACE_PIXELS) + margin),
    };
}

export function visibleRowRange(cameraY, viewHeight, rows, tallestSurfaceMicrocells = 0, margin = 1) {
    // Raised columns draw higher on screen, so rows below the view can still reach into it.
    const lift = Math.max(0, microcellsToUnits(tallestSurfaceMicrocells));
    return {
        first: Math.max(0, Math.floor(cameraY / FACE_PIXELS) - margin),
        last: Math.min(rows - 1, Math.floor((cameraY + viewHeight + lift) / FACE_PIXELS) + margin),
    };
}

/** The draw copy of an actor: raised by its C# terrain height. Ground position (and therefore depth) is unchanged on the original. */
export function raisedActor(actor) {
    const z = Number(actor?.z);
    return Number.isFinite(z) && z !== 0 ? { ...actor, y: actor.y - z } : actor;
}
