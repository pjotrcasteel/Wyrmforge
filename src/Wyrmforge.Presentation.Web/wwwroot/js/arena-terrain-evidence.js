// One-shot, opt-in terrain evidence: never edits simulation, game cache or the displayed canvas.
// A cropped independent paint and the actual cached canvas are compared at the SAME C# terrain revision.

/** Compare two RGBA samples pixel-for-pixel. Alpha is significant; result is pure/testable. */
export function compareTerrainPixels(actual, expected, width) {
    if (!Number.isInteger(width) || width < 1 || actual.length !== expected.length ||
        actual.length % (width * 4) !== 0) throw new RangeError('Terrain images must have identical RGBA dimensions');
    let mismatched = 0, maxDelta = 0;
    const first = [];
    let x0 = width, y0 = actual.length / (width * 4), x1 = -1, y1 = -1;
    for (let i = 0; i < actual.length; i += 4) {
        const delta = Math.max(Math.abs(actual[i] - expected[i]), Math.abs(actual[i + 1] - expected[i + 1]),
            Math.abs(actual[i + 2] - expected[i + 2]), Math.abs(actual[i + 3] - expected[i + 3]));
        if (!delta) continue;
        const pixel = i / 4, x = pixel % width, y = Math.floor(pixel / width);
        mismatched++;
        maxDelta = Math.max(maxDelta, delta);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        if (first.length < 16) first.push({ x, y, delta });
    }
    return {
        mismatched, total: actual.length / 4, maxDelta,
        bounds: mismatched ? { x0, y0, x1, y1 } : null, first
    };
}

/**
 * Compare the full C# data pulled after capture with the JS-merged terrain data.
 * Comparison is valid only at the SAME revision. Wood/boulder columns are intentionally
 * presented as low mounds and must not count as incorrect C# terrain.
 */
export function compareFullTerrainFrame(local, server) {
    if (!server) return { status: 'unavailable' };
    if (local?.revision !== server.revision)
        return { status: 'revision-mismatch', localRevision: local?.revision ?? null, serverRevision: server.revision };
    if (!local?.fine || !Array.isArray(server.fine))
        return { status: 'invalid-frame', localRevision: local?.revision ?? null };
    const mismatches = [], serverFine = new Map(server.fine.map(block => [block.index, block]));
    const count = local.columns * local.rows;
    for (let i = 0; i < count; i++) {
        const originalMaterial = server.material[i];
        if (originalMaterial >= 4) continue; // Tree and boulder draw as a low mound.
        if (server.surface[i] !== local.surface[i] || server.material[i] !== local.material[i]) {
            if (mismatches.length < 32) mismatches.push({ index: i, kind: 'coarse',
                local: [local.surface[i], local.material[i]], server: [server.surface[i], server.material[i]] });
        }
    }
    for (const index of new Set([...serverFine.keys(), ...local.fine.keys()])) {
        const a = local.fine.get(index), b = serverFine.get(index);
        if (!a || !b || a.stoneTop !== b.stoneTop || a.topsoil !== b.topsoil ||
            !numberArraysEqual(a.heights, b.heights) || !numberArraysEqual(a.wear, b.wear)) {
            if (mismatches.length < 32) mismatches.push({ index, kind: 'fine',
                local: a ? { topsoil: a.topsoil, stoneTop: a.stoneTop, heights: a.heights, wear: a.wear } : null,
                server: b ?? null });
        }
    }
    return { status: mismatches.length ? 'mismatch' : 'match',
        localRevision: local.revision, serverRevision: server.revision,
        localFine: local.fine.size, serverFine: serverFine.size, mismatchSamples: mismatches };
}

function numberArraysEqual(a, b) {
    if (a == null || b == null) return a == null && b == null;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/** Retain full diagnostic provenance for the changed blocks without dumping every undamaged tile. */
function frameSummary(frame) {
    const changed = frame.changed ?? [];
    return {
        revision: frame.revision, visualSeed: frame.visualSeed, columns: frame.columns, rows: frame.rows,
        changed: changed.slice(0, 200), changedCount: changed.length,
        fullFineCount: frame.fine?.size ?? 0, visualDeltaComplete: frame.visualDeltaComplete,
        // The C# frame is sparse. Keep each changed fine microcolumn so missed deltas are inspectable.
        changedFine: changed.slice(0, 32).map(index => ({ index, ...(frame.fine?.get(index) ?? {}) }))
    };
}

function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    return canvas;
}

function safeDataUrl(canvas) {
    try { return canvas.toDataURL('image/png'); }
    catch (error) { return { error: String(error) }; }
}

/**
 * Render source and independent reference into two SMALL view-sized canvases,
 * never a second full-size multi-megabyte arena cache. Neither writes to the
 * original cached raster. Original painter order is retained for source columns.
 */
export function captureTerrainViewport(cache, frame, camera, band, paintTerrainCell, units, scale) {
    if (!cache?.canvas || !frame?.fine) throw new Error('Terrain frame or raster cache not ready');
    const width = Math.max(1, Math.ceil(camera.width * scale));
    const height = Math.max(1, Math.ceil(camera.height * scale));
    const actual = makeCanvas(width, height), fresh = makeCanvas(width, height);
    const a = actual.getContext('2d', { willReadFrequently: true });
    const b = fresh.getContext('2d', { willReadFrequently: true });
    a.imageSmoothingEnabled = false;
    b.imageSmoothingEnabled = false;
    a.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
    cache.draw(a, camera);

    // The cache's art is rasterized at 'scale' and blitted without its vertical
    // padding. Reproduce the same projection directly into visible coordinates.
    b.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
    const independentFrame = { ...frame, kindMaps: new Map() };
    const firstColumn = Math.max(0, Math.floor(camera.x / units) - 5);
    const lastColumn = Math.min(frame.columns - 1, Math.ceil((camera.x + camera.width) / units) + 5);
    for (let row = 0; row < frame.rows; row++)
        for (let column = firstColumn; column <= lastColumn; column++)
            paintTerrainCell(b, independentFrame, band, column, row);

    const rgbaA = a.getImageData(0, 0, width, height).data;
    const rgbaB = b.getImageData(0, 0, width, height).data;
    return { pixelComparison: compareTerrainPixels(rgbaA, rgbaB, width),
        cachedPng: safeDataUrl(actual), independentlyPaintedPng: safeDataUrl(fresh),
        viewport: { ...camera, scale, pixelWidth: width, pixelHeight: height } };
}

/** One user gesture captures the faulty view BEFORE any rebuilding or new toggle. */
export async function captureTerrainEvidence(options) {
    const { sceneCanvas, terrainCache, frame, camera, band, paintTerrainCell,
        worldUnitsPerCell, artScale, readServerFrame, layerState, diagnostics } = options;
    const timestamp = new Date().toISOString(), started = performance.now();
    const evidence = {
        schema: 'wyrmforge-terrain-evidence-v1', timestamp,
        platform: { userAgent: navigator.userAgent, pixelRatio: devicePixelRatio },
        layerState, diagnostics, frame: frameSummary(frame),
        visibleGamePng: safeDataUrl(sceneCanvas)
    };
    // Start read-only authoritative fetch immediately; compare only if its revision
    // equals the captured JS frame (otherwise identify the race, never guess).
    let server;
    try { server = Promise.resolve(readServerFrame()).then(value => ({ value })).catch(error => ({ error: String(error) })); }
    catch (error) { server = Promise.resolve({ error: String(error) }); }
    try {
        const image = captureTerrainViewport(terrainCache, frame, camera, band,
            paintTerrainCell, worldUnitsPerCell, artScale);
        evidence.pixelComparison = image.pixelComparison;
        evidence.cachedPng = image.cachedPng;
        evidence.independentlyPaintedPng = image.independentlyPaintedPng;
        evidence.viewport = image.viewport;
    } catch (error) {
        evidence.captureError = String(error?.stack ?? error);
    }
    const full = await server;
    evidence.authoritativeComparison = full.error ? { status: 'fetch-error', error: full.error }
        : compareFullTerrainFrame(frame, full.value);
    evidence.captureMilliseconds = Math.round(performance.now() - started);
    return evidence;
}
