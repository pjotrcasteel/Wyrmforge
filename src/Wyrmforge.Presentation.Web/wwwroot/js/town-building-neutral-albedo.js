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
    for(let i=0;i<result.length;i+=4) {
        const rgb=[linear(pixels[i]),linear(pixels[i+1]),linear(pixels[i+2])];
        // One shared gain preserves channel ratios. Independent channel clipping
        // turned painted orange highlights into yellow/green-looking patches.
        const boundedGain=Math.min(gain,1/Math.max(...rgb,1e-6));
        for(let c=0;c<3;c++) result[i+c]=encoded(rgb[c]*boundedGain);
    }
    return result;
}

/** Source-aligned masonry candidate beside the two gate sconces, not a screen tint.
 * Painted orange wall illumination otherwise multiplies the real warm GPU light.
 * Glass/flame apertures and the adjacent blue/gold cloth are outside this correction.
 */
export function neutralizeTownGateMasonry(pixels, width, height) {
    if (!(pixels instanceof Uint8ClampedArray) || width!==1672 || height!==941 || pixels.length!==width*height*4)
        throw new TypeError('Gate masonry requires exact canonical pixels');
    const out=new Uint8ClampedArray(pixels);
    for(const [left,top,right,bottom,lampX] of [[718,173,770,269,744],[895,173,950,269,922]]) {
        for(let y=top;y<bottom;y++) for(let x=left;x<right;x++) {
            // Keep the actual flame/glass and near-neutral green foliage intact.
            if(Math.abs(x-lampX)<=9 && y>=215 && y<=248) continue;
            const i=(y*width+x)*4;
            if(pixels[i+1]>pixels[i]*.94) continue;
            const rgb=[linear(pixels[i]),linear(pixels[i+1]),linear(pixels[i+2])];
            const gray=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
            const edge=Math.min(x-left,right-1-x,y-top,bottom-1-y);
            const weight=Math.min(1,edge/10)*.8;
            for(let c=0;c<3;c++) out[i+c]=encoded(rgb[c]+(gray-rgb[c])*weight);
        }
    }
    return out;
}
