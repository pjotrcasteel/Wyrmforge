// Hunt 1.0 torch sprites: the authored high-fidelity set in art/source/environment/torches (three fixtures, 64 x 80 px native cells at the
// terrain's 64 px/m, foot anchor (32, 76), 36 frames each). The hardware is identical in every frame, so the lit frames minus the unlit
// frame 0 are exactly the flame, core and embers: the post is frame 0, the flame is that difference. That keeps the post a lit surface and
// the flame its own glowing layer without a second authored atlas. Only the "Burn Loop" tag is played; Ignite, Wind Gust and Extinguish
// wait for C# events that do not exist yet.
export const TORCH_VARIANTS = ['rusted-iron-beacon', 'ancient-oak-torch', 'ruined-gothic-watch'];
export const TORCH_CELL = { width: 64, height: 80, footX: 32, footY: 76 };
export const BURN_LOOP = { from: 6, frames: 16, milliseconds: 80 };

/** A fixture for a torch by its position along the road, so neighbours differ and a seed always looks the same. */
export function torchVariant(index) {
    return TORCH_VARIANTS[(Math.imul(index + 1, 2654435761) >>> 8) % TORCH_VARIANTS.length];
}

/** The burn-loop frame (0 to 15) for a time in seconds; `phase` (0 to 9) offsets each torch so they do not flicker in step. */
export function burnFrame(seconds, phase = 0) {
    return Math.floor((seconds * 1000 + phase * 130) / BURN_LOOP.milliseconds) % BURN_LOOP.frames;
}

/** Pixels of a lit frame that differ from the unlit frame 0 (RGBA buffers of one cell); everything else is transparent. Pure. */
export function splitFlameFrame(unlit, lit) {
    const out = new Uint8ClampedArray(lit.length);
    for (let i = 0; i < lit.length; i += 4) {
        if (lit[i] === unlit[i] && lit[i + 1] === unlit[i + 1] && lit[i + 2] === unlit[i + 2] && lit[i + 3] === unlit[i + 3]) continue;
        out[i] = lit[i]; out[i + 1] = lit[i + 1]; out[i + 2] = lit[i + 2]; out[i + 3] = lit[i + 3];
    }
    return out;
}

const loaded = new Map(), requested = new Set();

async function load(variant) {
    const image = new Image();
    image.src = new URL(`../art/environment/torches/${variant}.albedo.png`, import.meta.url).href;
    await image.decode();
    const { width, height } = TORCH_CELL;
    const strip = document.createElement('canvas');
    strip.width = image.naturalWidth; strip.height = image.naturalHeight;
    const g = strip.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0);
    const cell = frame => g.getImageData(frame * width, 0, width, height);
    const toCanvas = imageData => {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        return canvas;
    };
    const unlit = cell(0);
    const flames = Array.from({ length: BURN_LOOP.frames }, (_, index) =>
        toCanvas(new ImageData(splitFlameFrame(unlit.data, cell(BURN_LOOP.from + index).data), width, height)));
    return { post: toCanvas(unlit), flames };
}

/** `{ post, flames }` canvases for a fixture, or null while it is still downloading (or failed: the code-drawn stand-in then shows). */
export function torchSprites(variant) {
    const ready = loaded.get(variant);
    if (ready) return ready;
    if (!requested.has(variant) && typeof Image !== 'undefined' && typeof document !== 'undefined') {
        requested.add(variant);
        load(variant).then(sprites => loaded.set(variant, sprites)).catch(() => { });
    }
    return null;
}

/** Draws one native cell with its foot on the torch's ground point, on the half-unit (one art pixel) grid. */
export function drawTorchCell(ctx, canvas, x, y) {
    const unit = 1 / 2;
    ctx.drawImage(canvas, Math.round(x / unit) * unit - TORCH_CELL.footX * unit, Math.round(y / unit) * unit - TORCH_CELL.footY * unit,
        TORCH_CELL.width * unit, TORCH_CELL.height * unit);
}
