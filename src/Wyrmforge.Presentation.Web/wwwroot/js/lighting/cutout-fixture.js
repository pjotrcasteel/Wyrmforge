// Diagnostic geometry only, not a tree asset or proposed production artwork.
// The small binary leaf mask deliberately has empty texels inside its quad.
export function cutoutLeafPixels(size = 64) {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const u = ((x + .5) / size * 2) % 1 - .5;
        const v = ((y + .5) / size * 2) % 1 - .5;
        const leaf = Math.abs(u / .32) + (v / .42) ** 2 < 1;
        const i = (y * size + x) * 4;
        pixels.set([138, 162, 105, leaf ? 255 : 0], i);
    }
    return pixels;
}
