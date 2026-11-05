// Hunt 1.0 roadside torches. The posts are decoration placed by C# (`terrain.torches`, 1/16 cell units, one every nine cells or so along the
// road); their light is the C# lighting emitter `terrain:torch:<index>`, which the shared lighting engine renders. Nothing here lights anything:
// the flame is only the sprite. Drawn in world units in half-unit (one art pixel) steps like the rest of the Hunt 1.0 terrain art.
const FACE = 32;

/** Every torch of a terrain frame as world positions, cached on the frame. */
export function collectTorches(frame) {
    if (!frame?.torches?.length) return [];
    if (frame.torchList) return frame.torchList;
    const torches = [];
    for (let i = 0; i + 1 < frame.torches.length; i += 2)
        torches.push({ key: `torch:${i / 2}`, x: frame.torches[i] / 16 * FACE, y: frame.torches[i + 1] / 16 * FACE, phase: ((i * 2654435761) >>> 0) / 4294967296 * 9 });
    frame.torchList = torches;
    return torches;
}

/** Depth layers for the torches inside (or just outside) the camera window. */
export function torchLayers(frame, camera, width, height) {
    const layers = [];
    for (const torch of collectTorches(frame)) {
        if (torch.x < camera.x - 64 || torch.x > camera.x + width + 64 || torch.y < camera.y - 32 || torch.y - 64 > camera.y + height) continue;
        layers.push({ kind: 'torch', depth: torch.y + 2, torch });
    }
    return layers;
}

const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

/** One flame frame: a tapering, swaying tongue in four stepped layers (dark red, orange, yellow, white-hot core) rising from `baseY`. */
function flame(ctx, x, baseY, frame, phase) {
    const rise = [12, 14, 11][frame], sway = [0, .8, -.8][frame];
    const layers = [['#b8421e', 4.6, 1], ['#ff9b39', 3.5, .82], ['#ffc65a', 2.3, .6], ['#fff0b0', 1.2, .36]];
    for (const [color, base, reach] of layers)
        for (let i = 0; i < rise * reach; i++) {
            const t = i / (rise * reach);
            const half = Math.max(.5, base * (1 - t) ** .85) + (i < 2 ? .5 : 0);
            rect(ctx, color, x - half + sway * t * t * 2, baseY - i - 1, half * 2, 1);
        }
    // A side tongue licking out of the basket and a rising spark or two.
    rect(ctx, '#ff9b39', x + (frame === 1 ? 3.5 : -4) , baseY - 3.5 - frame, 1, 2.5);
    rect(ctx, '#ffd37a', x + sway * 2.5 + (phase > .5 ? 1.5 : -1.5), baseY - rise - 1.5 - frame * 1.5, .5, .5);
}

/** A road torch: a stone-footed timber post with iron bands that carries a barred fire basket full of burning pitch; `seconds` only animates the flame. */
export function drawTorch(ctx, torch, seconds = 0) {
    const { x, y } = torch;
    // Stones piled at the foot.
    rect(ctx, '#26231f', x - 6, y - 1, 12, 2.5);
    rect(ctx, '#3b3733', x - 5, y - 2.5, 10, 2);
    rect(ctx, '#57514a', x - 4, y - 3, 3, 1);
    rect(ctx, '#48433c', x + 1, y - 3, 3, 1);
    // Timber post, a little thicker at the foot, with two iron bands.
    rect(ctx, '#4a3426', x - 2, y - 28, 4, 26);
    rect(ctx, '#6a4c37', x - 2, y - 28, 1, 26);
    rect(ctx, '#2e2118', x + 1, y - 28, 1, 26);
    rect(ctx, '#2b2a2e', x - 2.5, y - 9, 5, 1.5);
    rect(ctx, '#2b2a2e', x - 2.5, y - 20, 5, 1.5);
    // Iron brackets and the basket: wider at the rim than at the base, with glowing gaps between the bars.
    rect(ctx, '#2b2a2e', x - 3.5, y - 28.5, 7, 1.5);
    for (const [row, half] of [[30, 3.5], [32, 4.5], [34, 5.5], [36, 6]])
        rect(ctx, '#1f1e22', x - half, y - row, half * 2, 2);
    for (const [row, half] of [[30, 3], [32, 4], [34, 5], [36, 5.5]]) {
        rect(ctx, '#8f2a0d', x - half + .5, y - row, half * 2 - 1, 2);
        for (let bar = -half + 1; bar < half; bar += 2) rect(ctx, '#34323a', x + bar - .5, y - row, 1, 2);
    }
    rect(ctx, '#45434a', x - 6.5, y - 36.5, 13, 1);
    // Burning pitch heaped above the rim.
    rect(ctx, '#d9561a', x - 5, y - 37.5, 10, 1.5);
    rect(ctx, '#ffb347', x - 3.5, y - 38, 7, 1);
    flame(ctx, x, y - 38, Math.floor((seconds * 9 + torch.phase) % 3), (torch.phase * 7) % 1);
}