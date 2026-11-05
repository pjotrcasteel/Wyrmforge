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

/** An iron-bound post with a cup and a flickering flame; `seconds` only animates the flame. */
export function drawTorch(ctx, torch, seconds = 0) {
    const { x, y } = torch;
    // Stones piled at the foot.
    rect(ctx, '#26231f', x - 5, y - 1, 10, 2.5);
    rect(ctx, '#3b3733', x - 4.5, y - 2, 9, 2);
    rect(ctx, '#57514a', x - 3, y - 2.5, 3, 1);
    rect(ctx, '#4a3426', x - 1.5, y - 30, 3, 28);
    rect(ctx, '#6a4c37', x - 1.5, y - 30, 1, 28);
    rect(ctx, '#2e2118', x + .5, y - 28, 1, 26);
    // Iron collar and cup.
    rect(ctx, '#2b2a2e', x - 3.5, y - 32, 7, 2);
    rect(ctx, '#45434a', x - 3.5, y - 32, 7, .5);
    rect(ctx, '#34302f', x - 3, y - 34.5, 6, 2.5);
    // Flame: three frames, swaying and breathing.
    const frame = Math.floor((seconds * 9 + torch.phase) % 3);
    const sway = frame === 1 ? .5 : frame === 2 ? -.5 : 0;
    const lift = frame === 1 ? 1.5 : 0;
    rect(ctx, '#b8421e', x - 2.5 + sway, y - 40 - lift, 5, 6);
    rect(ctx, '#d65427', x - 2 + sway, y - 42.5 - lift, 4, 4);
    rect(ctx, '#ff9b39', x - 1.5 + sway, y - 40 - lift, 3, 5);
    rect(ctx, '#ffd37a', x - 1 + sway, y - 38.5 - lift, 2, 3);
    rect(ctx, '#ff9b39', x - .5 + sway * 2, y - 44.5 - lift, 1, 2.5);
}
