// T2 opt-in material authoring. Both canonical Town building plates are
// pixel-registered 1:1 with the same authored alpha silhouette. Blend only
// their shared opaque interior IN LINEAR COLOR; never show daylight silhouettes
// outside the original nighttime building. Nothing is sampled from illumination.
const linear = value => {
    const x = value / 255;
    return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
};
const encoded = x => {
    const v = Math.max(0, Math.min(1, x));
    return Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055));
};

export function neutralizeBuildingPixels(dayPixels, nightPixels, width, height, {
    daylightContribution = .52,
} = {}) {
    if (!(dayPixels instanceof Uint8ClampedArray) ||
        !(nightPixels instanceof Uint8ClampedArray) ||
        !Number.isInteger(width) || width < 1 ||
        !Number.isInteger(height) || height < 1 ||
        dayPixels.length !== width * height * 4 ||
        nightPixels.length !== dayPixels.length ||
        !Number.isFinite(daylightContribution) ||
        daylightContribution < 0 || daylightContribution > 1)
        throw new TypeError('Building neutral albedo needs two exact registered RGBA sources');
    const result = new Uint8ClampedArray(dayPixels.length);
    let retained = 0;
    for (let i = 0; i < result.length; i += 4) {
        // Honor the SAME nighttime silhouette instead of showing opaque
        // daylight polygons along foliage, rooftops and terrace boundaries.
        const alpha = Math.min(dayPixels[i + 3], nightPixels[i + 3]);
        if (alpha < 128) continue;
        result[i + 3] = 255;
        retained++;
        for (let channel = 0; channel < 3; channel++) {
            const n = linear(nightPixels[i + channel]);
            const d = linear(dayPixels[i + channel]);
            result[i + channel] = encoded(n + (d - n) * daylightContribution);
        }
    }
    return { data: result, retained };
}

/** Bounded linear-exposure candidate using ONLY the original registered source.
 * No claim of recovered physical albedo; no geometry/color-frame interpolation.
 */
export function liftTownReferencePixels(pixels, width, height, gain = 4) {
    if (!(pixels instanceof Uint8ClampedArray) || pixels.length !== width*height*4 ||
        !Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 ||
        !Number.isFinite(gain) || gain<1 || gain>6) throw new TypeError('Invalid source reflectance candidate');
    const result=new Uint8ClampedArray(pixels);
    for(let i=0;i<result.length;i+=4) for(let c=0;c<3;c++) result[i+c]=encoded(linear(pixels[i+c])*gain);
    return result;
}
