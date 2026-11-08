// Hunt 1.0 roadside torches. The posts are decoration placed by C# (`terrain.torches`, 1/16 cell units, one every nine cells or so along the
// road); their light is the C# lighting emitter `terrain:torch:<index>`, which the shared lighting engine renders. Nothing here lights anything:
// the flame is only the sprite. Drawn in world units in half-unit (one art pixel) steps like the rest of the Hunt 1.0 terrain art.
import { forestKit, spriteSource } from './forest-kit.js';
import { torchVariant, torchSprites, burnFrame, drawTorchCell } from './arena-torch-sprites.js';

const FACE = 32;

/** Every torch of a terrain frame as world positions, cached on the frame. */
export function collectTorches(frame) {
    if (!frame?.torches?.length) return [];
    if (frame.torchList) return frame.torchList;
    const torches = [];
    for (let i = 0; i + 1 < frame.torches.length; i += 2)
        torches.push({ key: `torch:${i / 2}`, x: frame.torches[i] / 16 * FACE, y: frame.torches[i + 1] / 16 * FACE, phase: ((i * 2654435761) >>> 0) / 4294967296 * 9,
            variant: torchVariant(i / 2) });
    frame.torchList = torches;
    return torches;
}

/** Depth layers for the torches inside (or just outside) the camera window. */
export function torchLayers(frame, camera, width, height) {
    const layers = [];
    for (const torch of collectTorches(frame)) {
        if (torch.x < camera.x - 64 || torch.x > camera.x + width + 64 || torch.y < camera.y - 32 || torch.y - 64 > camera.y + height) continue;
        // `art` flips when the authored sprites finish loading, which invalidates the post's reused capture.
        layers.push({ kind: 'torch', depth: torch.y + 2, torch, art: torchSprites(torch.variant) !== null }, { kind: 'torchFlame', depth: torch.y + 2.5, torch });
    }
    return layers;
}

const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

/** Stand-in flame (before the kit has loaded): a tapering, swaying tongue in four stepped layers. */
function flameFallback(ctx, x, baseY, frame) {
    const rise = [12, 14, 11][frame % 3], sway = [0, .8, -.8][frame % 3];
    for (const [color, base, reach] of [['#b8421e', 4.6, 1], ['#ff9b39', 3.5, .82], ['#ffc65a', 2.3, .6], ['#fff0b0', 1.2, .36]])
        for (let i = 0; i < rise * reach; i++) {
            const t = i / (rise * reach);
            rect(ctx, color, x - Math.max(.5, base * (1 - t) ** .85) + sway * t * t * 2, baseY - i - 1, Math.max(.5, base * (1 - t) ** .85) * 2, 1);
        }
}

/**
 * A road torch. With the authored set loaded (arena-torch-sprites.js) the post is the unlit fixture and the flame is the burn loop's flame pixels;
 * until then (or if the set fails to load) a code-drawn timber post and the Pixel Crawler fire stand in. `seconds` only animates the flame.
 */
export function drawTorch(ctx, torch, seconds = 0, part = 'all') {
    const { x, y } = torch;
    const sprites = torchSprites(torch.variant);
    if (part !== 'flame') {
        // A compact stepped contact shadow plants the authored fixture at its C# collision foot.
        // It belongs to the post capture, not the emissive flame and never follows the camera.
        rect(ctx, 'rgba(8,6,6,.42)', x - 7, y - 1, 14, 2);
        rect(ctx, 'rgba(8,6,6,.24)', x - 5, y + 1, 10, 1);
        if (sprites) drawTorchCell(ctx, sprites.post, x, y);
        else drawPost(ctx, x, y);
    }
    if (part === 'post') return;
    if (sprites) drawTorchCell(ctx, sprites.flames[burnFrame(seconds, torch.phase)], x, y); else drawFlame(ctx, torch, seconds);
}

function drawPost(ctx, x, y) {
    // A small cairn at the foot.
    rect(ctx, '#1c1a18', x - 6, y - .5, 12, 2);
    rect(ctx, '#2f2c29', x - 5, y - 2, 10, 2);
    rect(ctx, '#46413b', x - 4, y - 3.5, 4, 1.5);
    rect(ctx, '#3a3631', x + .5, y - 3.5, 3.5, 1.5);
    // Timber post with a lit left edge and two iron bands.
    rect(ctx, '#3d2b20', x - 1.5, y - 24, 3, 22);
    rect(ctx, '#5a4030', x - 1.5, y - 24, 1, 22);
    rect(ctx, '#251912', x + .5, y - 24, 1, 22);
    rect(ctx, '#232227', x - 2, y - 9, 4, 1.5);
    rect(ctx, '#232227', x - 2, y - 17, 4, 1.5);
    // Iron cup flaring to the rim, black pitch heaped in it with a glowing seam.
    rect(ctx, '#232227', x - 3, y - 25.5, 6, 2);
    rect(ctx, '#2d2c32', x - 4, y - 27.5, 8, 2);
    rect(ctx, '#3a3941', x - 5, y - 29, 10, 1.5);
    rect(ctx, '#18161a', x - 4, y - 30.5, 8, 1.5);
    rect(ctx, '#8f2a0d', x - 3, y - 30.5, 6, .5);
}

function drawFlame(ctx, torch, seconds) {
    const { x, y } = torch;
    const index = Math.floor(seconds * 9 + torch.phase) % 4;
    const loaded = forestKit(), sprite = loaded?.sprites[`torch.flame.${index}`];
    if (!sprite) { flameFallback(ctx, x, y - 30, index); return; }
    ctx.drawImage(loaded.image, ...spriteSource(sprite), Math.round(x - sprite.ax), Math.round(y - 29.5 - sprite.ay), sprite.w, sprite.h);
}