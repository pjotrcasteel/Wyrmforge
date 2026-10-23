// Nexus-only school palette. The approved town painting stays authoritative.
// We recolor its already-painted violet magic pixels without recoloring stone,
// drawing replacement architecture, or altering any other building.
export const NEXUS_VARIANTS = Object.freeze({
    fire: Object.freeze({ hue: 2, label: 'Fire' }),
    frost: Object.freeze({ hue: 194, label: 'Frost' }),
    storm: Object.freeze({ hue: 52, label: 'Storm' }),
    arcane: Object.freeze({ hue: 270, label: 'Arcane' }),
    death: Object.freeze({ hue: 104, label: 'Death' }),
    binding: Object.freeze({ hue: 166, label: 'Binding' }),
});

const SOURCE_WIDTH = 1672;
const SOURCE_HEIGHT = 941;
// All the Nexus' glass, crystals and portal are inside this rectangle.
// The rest of the panorama (including other buildings) is never sampled or painted.
const NEXUS_MAGIC_BOUNDS = Object.freeze({ x: 58, y: 36, width: 498, height: 368 });
const readyScenes = new WeakMap();

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const difference = max - min;
    const lightness = (max + min) / 2;
    if (difference === 0) return { hue: 0, saturation: 0, lightness };
    const saturation = difference / (1 - Math.abs(2 * lightness - 1));
    let hue = max === r ? ((g - b) / difference) % 6
        : max === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
    hue = (hue * 60 + 360) % 360;
    return { hue, saturation, lightness };
}

function hslToRgb(hue, saturation, lightness) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
    const offset = lightness - chroma / 2;
    const segments = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x],
        [0, x, chroma], [x, 0, chroma], [chroma, 0, x]];
    return segments[Math.floor(hue / 60)].map(channel => Math.round((channel + offset) * 255));
}

// Color-sensitive selection: ambient wood, sky, masonry, windows and NPCs retain
// their source pixels. Selecting across the complete Nexus emitter region catches
// scattered crystal highlights that two approximate CSS radial masks miss.
export function isNexusMagicPixel(r, g, b, x, y) {
    const bounds = NEXUS_MAGIC_BOUNDS;
    if (x < bounds.x || y < bounds.y ||
        x >= bounds.x + bounds.width || y >= bounds.y + bounds.height) return false;
    const { hue, saturation, lightness } = rgbToHsl(r, g, b);
    return hue >= 242 && hue <= 331 && saturation >= 0.26 &&
        lightness >= 0.16 && r > g * 1.12 && b > g * 1.13;
}

// Exported for deterministic Node tests. Every selected pixel retains its original
// lightness/detail, with low mastery deliberately dimmer than invested mastery.
export function recolorNexusPixel(r, g, b, school, points = 0, x = 0, y = 0) {
    if (!(school in NEXUS_VARIANTS) || school === 'arcane' ||
        !isNexusMagicPixel(r, g, b, x, y)) return null;
    const source = rgbToHsl(r, g, b);
    const progress = Math.sqrt(Math.min(24, Math.max(0, points)) / 24);
    const lightness = Math.min(1, source.lightness * (0.64 + 0.36 * progress));
    return hslToRgb(NEXUS_VARIANTS[school].hue, source.saturation, lightness);
}

function paintSchool(canvas, source, school, points) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.clearRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
    if (school === 'arcane') return true; // Exact original purple painting.

    const bounds = NEXUS_MAGIC_BOUNDS;
    const scratch = document.createElement('canvas');
    scratch.width = bounds.width;
    scratch.height = bounds.height;
    const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
    if (!scratchContext) return false;
    scratchContext.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height,
        0, 0, bounds.width, bounds.height);
    const sourcePixels = scratchContext.getImageData(0, 0, bounds.width, bounds.height);
    const result = context.createImageData(bounds.width, bounds.height);
    for (let y = 0; y < bounds.height; y++) {
        for (let x = 0; x < bounds.width; x++) {
            const index = (y * bounds.width + x) * 4;
            const rgb = recolorNexusPixel(sourcePixels.data[index], sourcePixels.data[index + 1],
                sourcePixels.data[index + 2], school, points, x + bounds.x, y + bounds.y);
            if (!rgb) continue;
            result.data[index] = rgb[0];
            result.data[index + 1] = rgb[1];
            result.data[index + 2] = rgb[2];
            result.data[index + 3] = sourcePixels.data[index + 3];
        }
    }
    context.putImageData(result, bounds.x, bounds.y);
    return true;
}

export async function syncNexusVariant(selector) {
    const scene = document.querySelector(selector);
    if (!scene) return;
    const canvas = scene.querySelector('[data-nexus-pixels]');
    const source = scene.querySelector('.refuge-town-night-base');
    if (!canvas || !source) return;

    const school = scene.dataset.nexusSchool;
    if (!Object.hasOwn(NEXUS_VARIANTS, school)) return;
    const points = Number(scene.dataset.nexusMasteryPoints) || 0;
    const key = school + ':' + points;
    if (readyScenes.get(scene) === key) return;
    if (!source.complete || source.naturalWidth === 0) await source.decode();
    if (!scene.isConnected || source.naturalWidth !== SOURCE_WIDTH ||
        source.naturalHeight !== SOURCE_HEIGHT) return;
    if (!paintSchool(canvas, source, school, points)) return;
    readyScenes.set(scene, key);
    // The original radial color blend is a fallback only until pixel art is ready.
    scene.dataset.nexusPixelsReady = 'true';
}
