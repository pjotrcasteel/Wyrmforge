// Hand-authored pixel-frame shapes for the approved slate-blue mage.
// One silhouette per attack phase: no mirrored procedural blobs or white/burgundy robes.
// Each tuple is [paint-layer, x, y, width, height] in the 24x32 pixel character space.
const palette = {
    edge: '#1b2637', shade: '#26364b', cloak: '#485b73', trim: '#677c92',
    hood: '#63788f', face: '#293241', collar: '#c8c6b8',
    boots: '#182331', fold: '#35465b',
};

// These are deliberately separate, authorable pixel poses rather than transforms of one sprite.
// Silhouette follows the actual cast: brace back, lean and release, recover and settle.
export const magePixelFrames = {
    idle: [
        ['edge', -10, -5, 20, 19], ['edge', -8, 12, 7, 4], ['edge', 3, 12, 7, 4],
        ['shade', -9, -5, 18, 18], ['shade', -8, 10, 6, 5], ['shade', 3, 10, 6, 5],
        ['cloak', -7, -4, 13, 14], ['cloak', -8, 6, 8, 6], ['fold', 1, 5, 3, 7],
        ['trim', -6, -5, 4, 12], ['trim', 3, 0, 3, 10],
        ['edge', -7, -15, 14, 12], ['hood', -6, -15, 12, 10],
        ['face', -4, -11, 8, 5],
        ['collar', -6, -5, 12, 3], ['collar', -5, -2, 3, 2], ['collar', 3, -2, 3, 2],
        ['boots', -7, 13, 5, 3], ['boots', 3, 13, 6, 3],
    ],
    windup: [
        ['edge', -11, -4, 20, 17], ['edge', -13, 6, 8, 10], ['edge', 3, 10, 7, 6],
        ['shade', -10, -5, 17, 17], ['shade', -12, 7, 8, 8], ['shade', 3, 10, 6, 5],
        ['cloak', -9, -5, 12, 13], ['cloak', -11, 6, 7, 8], ['fold', 0, 4, 4, 9],
        ['trim', -9, -4, 3, 11], ['trim', 2, -1, 4, 9],
        ['edge', -10, -15, 14, 12], ['hood', -9, -15, 12, 10],
        ['face', -7, -11, 8, 5],
        ['collar', -9, -5, 12, 3], ['collar', -8, -2, 3, 2], ['collar', 0, -2, 3, 2],
        ['boots', -11, 13, 6, 3], ['boots', 2, 13, 6, 3],
    ],
    release: [
        ['edge', -8, -5, 22, 19], ['edge', -11, 9, 9, 8], ['edge', 7, 10, 7, 5],
        ['shade', -7, -5, 19, 18], ['shade', -10, 8, 7, 8], ['shade', 7, 10, 6, 5],
        ['cloak', -5, -5, 16, 14], ['cloak', -9, 7, 8, 8], ['fold', 5, 1, 4, 11],
        ['trim', -4, -4, 4, 12], ['trim', 9, -2, 3, 11],
        ['edge', -4, -16, 14, 12], ['hood', -3, -16, 12, 10],
        ['face', -1, -12, 8, 5],
        ['collar', -3, -6, 12, 3], ['collar', -2, -3, 3, 2], ['collar', 6, -3, 3, 2],
        ['boots', -10, 14, 7, 3], ['boots', 8, 12, 6, 3],
    ],
    followThrough: [
        ['edge', -9, -5, 20, 19], ['edge', -13, 7, 9, 10], ['edge', 6, 11, 6, 5],
        ['shade', -8, -5, 18, 19], ['shade', -12, 8, 8, 8], ['shade', 6, 11, 5, 4],
        ['cloak', -6, -4, 14, 13], ['cloak', -12, 8, 9, 7], ['fold', 4, 4, 4, 10],
        ['trim', -5, -5, 4, 10], ['trim', 6, 0, 3, 11],
        ['edge', -6, -15, 14, 12], ['hood', -5, -15, 12, 10],
        ['face', -3, -11, 8, 5],
        ['collar', -5, -5, 12, 3], ['collar', -4, -2, 3, 2], ['collar', 4, -2, 3, 2],
        ['boots', -11, 14, 6, 3], ['boots', 5, 13, 6, 3],
    ],
    surgeRelease: [
        ['edge', -8, -5, 23, 19], ['edge', -14, 8, 12, 9], ['edge', 8, 10, 7, 6],
        ['shade', -7, -5, 21, 18], ['shade', -13, 8, 10, 8], ['shade', 8, 10, 6, 5],
        ['cloak', -5, -5, 17, 14], ['cloak', -12, 8, 9, 7], ['fold', 4, 2, 6, 11],
        ['trim', -4, -4, 4, 12], ['trim', 10, -1, 4, 10],
        ['edge', -3, -17, 15, 13], ['hood', -2, -17, 13, 11],
        ['face', 0, -13, 8, 5],
        ['collar', -2, -6, 13, 3], ['collar', -1, -3, 3, 2], ['collar', 7, -3, 3, 2],
        ['boots', -13, 14, 8, 3], ['boots', 9, 13, 6, 3],
    ],
};

export function mageFrameKey(cast) {
    if (!cast || !Number.isFinite(cast.progress) || cast.progress < 0 || cast.progress >= 1) return 'idle';
    if (cast.progress < .22) return 'windup';
    if (cast.progress < .48) return cast.surge ? 'surgeRelease' : 'release';
    return 'followThrough';
}

export function drawMagePixelFrame(ctx, frameKey, hit = false) {
    const frame = magePixelFrames[frameKey] ?? magePixelFrames.idle;
    for (const [part, x, y, width, height] of frame) {
        // Hit reactions share the very same silhouette; damage must not whiten the robe.
        ctx.fillStyle = hit && part === 'cloak' ? '#a06e73'
            : hit && part === 'shade' ? '#7d5260' : palette[part];
        ctx.fillRect(x, y, width, height);
    }
    return frame.length;
}
