// AR4-A2 neutral albedo adapter for the *existing* Hunt canvas path.
// It consumes C# AR3 preview weights and offline WF32 source pixels; no terrain, shader or shadow generation.
import { WORLD_SITE_MATERIALS, normalizeWorldSiteMaterialWeights,
    worldSiteMaterialCacheKey, worldSiteSourceBindings } from './world-site-material-binding.js';

const SOURCE_REVISION = 'wf32-p1i-soft.v1';
const SOURCE_URLS = Object.freeze({
    soil: new URL('../art/terrain/wf32/p1i/soil-world.png', import.meta.url),
    grass: new URL('../art/terrain/wf32/p1i/grass-world.png', import.meta.url),
    mud: new URL('../art/terrain/wf32/p1i/mud-world.png', import.meta.url),
});
const CACHE_LIMIT = 1;
const siteImages = new Map();
let sourceState = 'idle';
let decodedSources = null;

function rgb(hex) {
    return [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function worldSiteMaterialModeEnabled() {
    return new URLSearchParams(globalThis.location?.search ?? '').get('arenaTerrain') === 'materials';
}

/** Decode source images once for the opt-in neutral review. Missing files stay a safe flat-color fallback. */
function requestSources() {
    if (sourceState !== 'idle' || typeof document === 'undefined' || typeof Image === 'undefined') return;
    sourceState = 'loading';
    const names = Object.keys(SOURCE_URLS);
    const pending = names.map(name => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            if (image.naturalWidth % 32 !== 0 || image.naturalHeight % 32 !== 0) {
                reject(new Error('WF32 source must be native 32px-aligned'));
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
            resolve([name, context.getImageData(0, 0, canvas.width, canvas.height)]);
        };
        image.onerror = () => reject(new Error('WF32 source unavailable'));
        image.src = SOURCE_URLS[name].href;
    }));
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
        source.width >= width && source.height >= height &&
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
                const from = image ? (y * image.width + x) * 4 : 0;
                const color = image?.data ?? fallbacks[m];
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
    return { width, height, data: pixels };
}

/** Draw only when all approved soft material files are present, otherwise let AR3 semantic mode explain the site. */
export function drawWorldSiteNeutralAlbedo(ctx, geography, width, height) {
    if (!worldSiteMaterialModeEnabled() || typeof document === 'undefined') return false;
    requestSources();
    if (!decodedSources || sourceState !== 'ready') return false;
    const pixelWidth = Math.round(width), pixelHeight = Math.round(height);
    const key = worldSiteMaterialCacheKey(geography, pixelWidth, pixelHeight, SOURCE_REVISION);
    if (!key) return false;
    let texture = siteImages.get(key);
    if (!texture) {
        const pixels = composeWorldSiteNeutralAlbedo(geography, pixelWidth, pixelHeight, decodedSources);
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
