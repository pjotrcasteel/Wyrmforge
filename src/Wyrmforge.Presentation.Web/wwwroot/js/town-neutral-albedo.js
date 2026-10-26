// Deterministic, source-preserving *candidate* neutral albedo authoring for Town paving.
//
// Source: exact approved day-active painting, masked to the original paving.
// Remove low-frequency painted illumination in log-linear luminance. High-frequency
// stone joints and authored chroma survive. No generated replacement pixels,
// normal-from-RGB or stochastic texture blending.
// NOTE: This is a candidate material, not final owner-approved neutral albedo.
import { TOWN_PAVING_BOUNDS } from './town-paving-material.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const toLinear = value => {
    const s = value / 255;
    return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
};
const fromLinear = value => {
    const l = clamp(value, 0, 1);
    return Math.round(255 * (l <= .0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - .055));
};

export function neutralizeTownPavingPixels(pixels, width, height, {
    radius = 44, strength = .76, warmth = .35,
} = {}) {
    if (!(pixels instanceof Uint8ClampedArray) || !Number.isInteger(width) || !Number.isInteger(height) ||
        width < 1 || height < 1 || pixels.length !== width * height * 4 ||
        !Number.isInteger(radius) || radius < 1 || radius > 128 ||
        !Number.isFinite(strength) || strength < 0 || strength > 1 ||
        !Number.isFinite(warmth) || warmth < 0 || warmth > 1)
        throw new TypeError('Invalid neutral paving albedo input');

    const stride = width + 1, length = stride * (height + 1);
    const lightSum = new Float64Array(length), warmSum = new Float64Array(length);
    const weightSum = new Float64Array(length);
    const luminance = new Float32Array(width * height);
    const redBlue = new Float32Array(width * height);
    let count = 0, allLight = 0, allWarm = 0;

    for (let y = 0; y < height; y++) {
        let lineLight = 0, lineWarm = 0, lineWeight = 0;
        for (let x = 0; x < width; x++) {
            const pixel = y * width + x, index = pixel * 4;
            if (pixels[index + 3] >= 128) {
                const r = toLinear(pixels[index]), g = toLinear(pixels[index + 1]),
                    b = toLinear(pixels[index + 2]);
                const l = Math.log(Math.max(.002, r * .2126 + g * .7152 + b * .0722));
                const w = Math.log((r + .015) / (b + .015));
                luminance[pixel] = l; redBlue[pixel] = w;
                lineLight += l; lineWarm += w; lineWeight++; allLight += l; allWarm += w; count++;
            }
            const i = (y + 1) * stride + (x + 1);
            lightSum[i] = lightSum[i - stride] + lineLight;
            warmSum[i] = warmSum[i - stride] + lineWarm;
            weightSum[i] = weightSum[i - stride] + lineWeight;
        }
    }

    const out = new Uint8ClampedArray(pixels);
    if (!count) return { data: out, coverage: 0, meanGain: 1, alteredPixels: 0 };
    const meanLogLight = allLight / count, meanLogWarm = allWarm / count;
    let gainTotal = 0, altered = 0, broadVariationBefore = 0, broadVariationAfter = 0;
    const rectSum = (sum, x0, y0, x1, y1) =>
        sum[y1 * stride + x1] - sum[y0 * stride + x1] -
        sum[y1 * stride + x0] + sum[y0 * stride + x0];

    for (let y = 0; y < height; y++) {
        const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
        for (let x = 0; x < width; x++) {
            const pixel = y * width + x, index = pixel * 4;
            if (pixels[index + 3] < 128) continue;
            const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
            const weight = rectSum(weightSum, x0, y0, x1, y1);
            const localLogLight = weight ? rectSum(lightSum, x0, y0, x1, y1) / weight : meanLogLight;
            const localLogWarm = weight ? rectSum(warmSum, x0, y0, x1, y1) / weight : meanLogWarm;
            // A narrow gain limit avoids destroying approved paint/stone texture.
            const gain = clamp(Math.exp((meanLogLight - localLogLight) * strength), .68, 1.52);
            broadVariationBefore += (localLogLight - meanLogLight) ** 2;
            broadVariationAfter += (localLogLight + Math.log(gain) - meanLogLight) ** 2;
            // Reduce only broad *excess* orange cast above the painting's
            // aggregate stone hue: never replace decorative authored colors.
            const cast = clamp((localLogWarm - meanLogWarm) * warmth, -.13, .22);
            const r = toLinear(pixels[index]) * gain * Math.exp(-cast * .65);
            const g = toLinear(pixels[index + 1]) * gain;
            const b = toLinear(pixels[index + 2]) * gain * Math.exp(cast * .35);
            out[index] = fromLinear(r); out[index + 1] = fromLinear(g); out[index + 2] = fromLinear(b);
            if (out[index] !== pixels[index] || out[index + 1] !== pixels[index + 1] ||
                out[index + 2] !== pixels[index + 2]) altered++;
            gainTotal += gain;
        }
    }
    const illuminationReduction = broadVariationBefore > 1e-9 ?
        clamp(1 - Math.sqrt(broadVariationAfter / broadVariationBefore), 0, 1) : 0;
    return { data: out, coverage: count, meanGain: gainTotal / count, alteredPixels: altered,
        illuminationReduction };
}

/** Mutate only a NEW lab canvas, never the original canonical source painting. */
export function deriveTownNeutralPavingCanvas(pavingCanvas, options = {}) {
    const [x, y, width, height] = TOWN_PAVING_BOUNDS;
    if (!pavingCanvas || pavingCanvas.width !== 1672 || pavingCanvas.height !== 941)
        throw new TypeError('Expected original-size *derived* Town paving canvas');
    const context = pavingCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new TypeError('Cannot access derived Town canvas pixels');
    const input = context.getImageData(x, y, width, height);
    const result = neutralizeTownPavingPixels(input.data, width, height, options);
    input.data.set(result.data);
    context.putImageData(input, x, y);
    return { coverage: result.coverage, alteredPixels: result.alteredPixels,
        meanGain: result.meanGain, illuminationReduction: result.illuminationReduction,
        method: 'linear-log-local-illumination-v1' };
}
