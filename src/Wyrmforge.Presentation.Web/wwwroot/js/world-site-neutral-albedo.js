// AR4-A2 neutral albedo adapter for the *existing* Hunt canvas path.
// It consumes C# AR3 preview weights and offline WF32 source pixels; no terrain, shader or shadow generation.
import { WORLD_SITE_MATERIALS, normalizeWorldSiteMaterialWeights,
    worldSiteMaterialCacheKey, worldSiteSourceBindings } from './world-site-material-binding.js';
import { PIXEL32_ATLAS, PIXEL32_QUIET_ATLAS, PIXEL32_WORLD, composeWorldSitePixel32Albedo } from './world-site-pixel32-albedo.js';

const SOURCE_REVISION = 'wf32-p1i-soft.seed1387.1024x1568.v1';
const SOURCE_BANDS = Object.freeze([
    Object.freeze({ suffix: 'top', originY: 0, height: 800 }),
    Object.freeze({ suffix: 'bottom', originY: 800, height: 768 }),
]);
const SOURCE_FAMILIES = Object.freeze(['soil', 'grass', 'mud']);
const SOURCE_HEIGHT = SOURCE_BANDS.reduce((total, band) => total + band.height, 0);
const CACHE_LIMIT = 1;
const siteImages = new Map();
let sourceState = 'idle';
let decodedSources = null;
let pixel32State = 'idle';
let decodedPixel32 = null;
let quietPixelState = 'idle';
let decodedQuietPixel = null;
let worldPixelState = 'idle';
let decodedWorldPixels = null;

function rgb(hex) {
    return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function worldSiteMaterialModeEnabled() {
    return ['materials', 'source32', 'source32b', 'source32c'].includes(
        new URLSearchParams(globalThis.location?.search ?? '').get('arenaTerrain'));
}

export function worldSitePixel32ModeEnabled() {
    return ['source32', 'source32b', 'source32c'].includes(
        new URLSearchParams(globalThis.location?.search ?? '').get('arenaTerrain'));
}

/** The quiet-grass/road study is opt-in and independent of both P1i and original #429 v2. */
export function worldSiteQuietPixelModeEnabled() {
    return ['source32b', 'source32c'].includes(
        new URLSearchParams(globalThis.location?.search ?? '').get('arenaTerrain'));
}

export function worldSiteWorldPixelModeEnabled() {
    return new URLSearchParams(globalThis.location?.search ?? '').get('arenaTerrain') === 'source32c';
}

/** The exact #429 v2 atlas is reviewed separately; it is not an approved world-source bank. */
function requestPixel32Atlas() {
    if (pixel32State !== 'idle' || typeof document === 'undefined' || typeof Image === 'undefined') return;
    pixel32State = 'loading';
    const image = new Image();
    image.onload = () => {
        if (image.naturalWidth !== PIXEL32_ATLAS.width || image.naturalHeight !== PIXEL32_ATLAS.height) {
            pixel32State = 'unavailable';
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
            pixel32State = 'unavailable';
            return;
        }
        context.drawImage(image, 0, 0);
        decodedPixel32 = context.getImageData(0, 0, canvas.width, canvas.height);
        pixel32State = 'ready';
    };
    image.onerror = () => { pixel32State = 'unavailable'; };
    image.src = new URL('../art/terrain/wf32/prototype32/atlas.png', import.meta.url).href;
}

/** Extra source-authored offline frames for the quiet-grass / road seam experiment. */
function requestQuietPixelAtlas() {
    if (quietPixelState !== 'idle' || typeof document === 'undefined' || typeof Image === 'undefined') return;
    quietPixelState = 'loading';
    const image = new Image();
    image.onload = () => {
        if (image.naturalWidth !== PIXEL32_QUIET_ATLAS.width ||
            image.naturalHeight !== PIXEL32_QUIET_ATLAS.height) {
            quietPixelState = 'unavailable';
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) { quietPixelState = 'unavailable'; return; }
        context.drawImage(image, 0, 0);
        decodedQuietPixel = context.getImageData(0, 0, canvas.width, canvas.height);
        quietPixelState = 'ready';
    };
    image.onerror = () => { quietPixelState = 'unavailable'; };
    image.src = new URL('../art/terrain/wf32/ar4b-quiet/atlas.png', import.meta.url).href;
}

/** Full world-coordinate source windows are authored offline and decoded once. */
function requestWorldPixelSources() {
    if (worldPixelState !== 'idle' || typeof document === 'undefined' || typeof Image === 'undefined') return;
    worldPixelState = 'loading';
    Promise.all(['grass', 'road'].map(family => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            if (image.naturalWidth !== PIXEL32_WORLD.width ||
                image.naturalHeight !== PIXEL32_WORLD.height) {
                reject(new Error('AR4-B world source dimensions mismatch'));
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) { reject(new Error('Cannot decode AR4-B world source')); return; }
            context.drawImage(image, 0, 0);
            resolve([family, context.getImageData(0, 0, canvas.width, canvas.height)]);
        };
        image.onerror = () => reject(new Error('AR4-B world source unavailable'));
        image.src = new URL(`../art/terrain/wf32/ar4b-world/${family}-world.png`, import.meta.url).href;
    }))).then(entries => {
        decodedWorldPixels = Object.fromEntries(entries);
        worldPixelState = 'ready';
    }).catch(() => {
        decodedWorldPixels = null;
        worldPixelState = 'unavailable';
    });
}

/** Reassemble contiguous offline-authored world windows, preserving their absolute 32px source phase. */
export function stitchWorldSiteSourceBands(bands) {
    if (!Array.isArray(bands) || bands.length !== SOURCE_BANDS.length) return null;
    const width = bands[0]?.width;
    if (!Number.isInteger(width) || width < 32 || width % 32 !== 0) return null;
    const height = SOURCE_BANDS.reduce((total, spec) => total + spec.height, 0);
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < bands.length; index++) {
        const band = bands[index];
        if (band?.width !== width || band.height !== SOURCE_BANDS[index].height ||
            band.data?.length !== width * band.height * 4) return null;
        data.set(band.data, SOURCE_BANDS[index].originY * width * 4);
    }
    return { width, height, data };
}

/** Decode source images once for opt-in review; source generation never runs in the frame loop. */
function requestSources() {
    if (sourceState !== 'idle' || typeof document === 'undefined' || typeof Image === 'undefined') return;
    sourceState = 'loading';
    const pending = SOURCE_FAMILIES.map(async family => {
        const images = await Promise.all(SOURCE_BANDS.map(band => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                if (image.naturalWidth % 32 !== 0 || image.naturalHeight !== band.height) {
                    reject(new Error('WF32 source must retain its native 32px band dimensions'));
                    return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                if (!context) {
                    reject(new Error('Cannot decode WF32 canvas'));
                    return;
                }
                context.drawImage(image, 0, 0);
                resolve(context.getImageData(0, 0, canvas.width, canvas.height));
            };
            image.onerror = () => reject(new Error('WF32 source unavailable'));
            image.src = new URL(`../art/terrain/wf32/p1i/${family}-world-${band.suffix}.png`, import.meta.url).href;
        })));
        const stitched = stitchWorldSiteSourceBands(images);
        if (!stitched) throw new Error('WF32 source bands do not share a continuous world grid');
        return [family, stitched];
    });
    Promise.all(pending).then(entries => {
        decodedSources = Object.fromEntries(entries);
        sourceState = 'ready';
    }).catch(() => {
        decodedSources = null;
        sourceState = 'unavailable';
    });
}

function validSource(source, width, height) {
    return source && Number.isInteger(source.width) && Number.isInteger(source.height) &&
        source.width >= width && (source.height >= height ||
            (height > SOURCE_HEIGHT && source.height === SOURCE_HEIGHT)) &&
        source.width % 32 === 0 && source.height % 32 === 0 &&
        source.data?.length === source.width * source.height * 4;
}

/** Pure CPU one-time *composition* of offline source pixels at fixed site coordinates.
 * No source texture is generated or repeated here; undersized files are rejected to avoid stamped tiles.
 */
export function composeWorldSiteNeutralAlbedo(geography, width, height, sources) {
    const preview = geography?.landscape?.elevation;
    if (!preview || !Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0 || width > 2048 || height > 3072 ||
        !Number.isInteger(preview.columns) || !Number.isInteger(preview.rows) ||
        preview.columns < 2 || preview.rows < 2 ||
        !Array.isArray(preview.samples) || preview.samples.length !== preview.columns * preview.rows)
        return null;
    const bindings = worldSiteSourceBindings(geography);
    const sourceForIndex = bindings.map(binding =>
        binding.sourceApproved && validSource(sources?.[binding.sourceFamily], width, height)
            ? sources[binding.sourceFamily] : null);
    // AR4-A2 needs each approved *soft* source to be present. Rock, water and ice stay diagnostic colors.
    if ([0, 1, 3].some(index => !sourceForIndex[index])) return null;

    const grid = preview.samples.map(normalizeWorldSiteMaterialWeights);
    if (grid.some(weights => !weights)) return null;
    const specNames = WORLD_SITE_MATERIALS.map(spec => spec.name);
    const fallbacks = bindings.map(binding => rgb(binding.fallback));
    const pixels = new Uint8ClampedArray(width * height * 4);
    const columns = preview.columns;
    const rows = preview.rows;
    for (let y = 0; y < height; y++) {
        const v = (y + .5) / height * (rows - 1);
        const top = Math.floor(v), bottom = Math.min(rows - 1, top + 1);
        const fy = v - top;
        for (let x = 0; x < width; x++) {
            const u = (x + .5) / width * (columns - 1);
            const left = Math.floor(u), right = Math.min(columns - 1, left + 1);
            const fx = u - left;
            const tl = grid[top * columns + left], tr = grid[top * columns + right];
            const bl = grid[bottom * columns + left], br = grid[bottom * columns + right];
            const pixel = (y * width + x) * 4;
            let red = 0, green = 0, blue = 0;
            for (let m = 0; m < specNames.length; m++) {
                const name = specNames[m];
                const weight = tl[name] * (1 - fx) * (1 - fy) + tr[name] * fx * (1 - fy) +
                    bl[name] * (1 - fx) * fy + br[name] * fx * fy;
                if (weight <= 0) continue;
                const image = sourceForIndex[m];
                // Never stretch, stamp or repeat the authored 32px world window. Outside
                // its coverage, show the declared semantic diagnostic color.
                const authored = image && y < image.height;
                const from = authored ? (y * image.width + x) * 4 : 0;
                const color = authored ? image.data : fallbacks[m];
                red += color[from] * weight;
                green += color[from + 1] * weight;
                blue += color[from + 2] * weight;
            }
            pixels[pixel] = Math.round(red);
            pixels[pixel + 1] = Math.round(green);
            pixels[pixel + 2] = Math.round(blue);
            pixels[pixel + 3] = 255;
        }
    }
    return { width, height, data: pixels,
        sourceCoverage: Math.min(1, SOURCE_HEIGHT / height) };
}

/** The browser-review diagnostics report actual decoded source coverage, never implied complete art. */
export function worldSiteNeutralSourceCoverage(width, height) {
    if (worldSitePixel32ModeEnabled()) {
        if (pixel32State !== 'ready' || !decodedPixel32 || !(width > 0 && height > 0) ||
            (worldSiteQuietPixelModeEnabled() && (quietPixelState !== 'ready' || !decodedQuietPixel)) ||
            (worldSiteWorldPixelModeEnabled() && (worldPixelState !== 'ready' || !decodedWorldPixels))) return null;
        return Object.freeze({ complete: true, width, height, fraction: 1,
            prototypeOnly: true, repeatedTiles: !worldSiteWorldPixelModeEnabled() });
    }
    const source = decodedSources?.soil;
    if (sourceState !== 'ready' || !source || !(width > 0 && height > 0)) return null;
    const coveredWidth = Math.min(width, source.width);
    const coveredHeight = Math.min(height, source.height);
    return Object.freeze({
        complete: coveredWidth === width && coveredHeight === height,
        width: coveredWidth, height: coveredHeight,
        fraction: (coveredWidth / width) * (coveredHeight / height),
    });
}

/** Draw only when all approved soft material files are present, otherwise let AR3 semantic mode explain the site. */
export function drawWorldSiteNeutralAlbedo(ctx, geography, width, height) {
    if (!worldSiteMaterialModeEnabled() || typeof document === 'undefined') return false;
    const prototype = worldSitePixel32ModeEnabled();
    const quiet = worldSiteQuietPixelModeEnabled();
    const world = worldSiteWorldPixelModeEnabled();
    if (prototype) requestPixel32Atlas();
    else requestSources();
    if (quiet) requestQuietPixelAtlas();
    if (world) requestWorldPixelSources();
    if (quiet && (quietPixelState !== 'ready' || !decodedQuietPixel)) return false;
    if (world && (worldPixelState !== 'ready' || !decodedWorldPixels)) return false;
    if (prototype ? pixel32State !== 'ready' || !decodedPixel32
        : sourceState !== 'ready' || !decodedSources) return false;
    const pixelWidth = Math.round(width), pixelHeight = Math.round(height);
    const key = worldSiteMaterialCacheKey(geography, pixelWidth, pixelHeight,
        prototype ? (world ? PIXEL32_WORLD.revision
            : quiet ? PIXEL32_QUIET_ATLAS.revision : PIXEL32_ATLAS.revision) : SOURCE_REVISION);
    if (!key) return false;
    let texture = siteImages.get(key);
    if (!texture) {
        const pixels = prototype
            ? composeWorldSitePixel32Albedo(geography, pixelWidth, pixelHeight, decodedPixel32,
                quiet ? decodedQuietPixel : null,
                world ? decodedWorldPixels : null)
            : composeWorldSiteNeutralAlbedo(geography, pixelWidth, pixelHeight, decodedSources);
        if (!pixels) return false;
        texture = document.createElement('canvas');
        texture.width = pixelWidth;
        texture.height = pixelHeight;
        const target = texture.getContext('2d');
        if (!target) return false;
        target.putImageData(new ImageData(pixels.data, pixelWidth, pixelHeight), 0, 0);
        siteImages.set(key, texture);
        while (siteImages.size > CACHE_LIMIT) siteImages.delete(siteImages.keys().next().value);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(texture, 0, 0, width, height);
    ctx.restore();
    return true;
}
