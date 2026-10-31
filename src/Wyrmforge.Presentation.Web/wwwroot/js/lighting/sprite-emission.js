// Asset-authored emissive palette extraction shared by all pixel-sprite materials.
// Generates one GPU emissive map when an atlas loads, never a per-frame CPU readback.
const rgbKey = color => {
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
        throw new TypeError('Emissive colors must be #rrggbb');
    return Number.parseInt(color.slice(1), 16);
};

export function extractPaletteEmission(rgba, colors) {
    if (!rgba || rgba.length % 4 !== 0) throw new TypeError('Expected RGBA pixels');
    const palette = new Set(colors.map(rgbKey));
    const output = new Uint8ClampedArray(rgba.length);
    for (let index = 0; index < rgba.length; index += 4) {
        if (rgba[index + 3] === 0) continue;
        const value = (rgba[index] << 16) | (rgba[index + 1] << 8) | rgba[index + 2];
        if (!palette.has(value)) continue;
        output[index] = rgba[index];
        output[index + 1] = rgba[index + 1];
        output[index + 2] = rgba[index + 2];
        output[index + 3] = rgba[index + 3];
    }
    return output;
}

export function createPaletteEmissionAtlas(image, colors) {
    if (!image || !image.width || !image.height) throw new TypeError('Missing sprite atlas');
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Emissive atlas needs a Canvas2D context');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pixels.data.set(extractPaletteEmission(pixels.data, colors));
    ctx.putImageData(pixels, 0, 0);
    return canvas;
}
