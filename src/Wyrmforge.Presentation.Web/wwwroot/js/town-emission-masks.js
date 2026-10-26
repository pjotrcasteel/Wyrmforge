// T2 bounded emission candidate derived ONLY from the genuine pixel-aligned
// canonical active/vacant Town art. This is not a Photoshop full-scene overlay.
// Warm apertures and Nexus magical apparatus are disjoint emission materials.
// No flags, banners, masonry, roofs or paving emit light by design.
export const TOWN_EMISSION_REGIONS = Object.freeze({
    nexus: Object.freeze({
        warm: [[97,190,50,90], [247,186,96,112], [87,283,65,85], [260,282,70,86]],
        magic: [[237,49,160,135], [385,254,108,119]],
    }),
    blacksmith: Object.freeze({
        warm: [[35,596,111,119], [163,615,125,119], [280,585,128,134],
            [103,440,63,96]],
        magic: [],
    }),
    codex: Object.freeze({
        warm: [[1115,190,135,164], [1264,134,180,230], [1404,184,138,195]],
        magic: [],
    }),
    hall: Object.freeze({
        warm: [[1075,517,145,160], [1202,548,180,237],
            [1352,520,165,208], [1500,576,158,189]],
        magic: [],
    }),
});
export const TOWN_EMISSION_PLATES = Object.freeze([
    Object.freeze({ domain:'nexus', name:'ArcaneNexus', x:0, y:0, width:618, height:582 }),
    Object.freeze({ domain:'blacksmith', name:'Blacksmith', x:0, y:353, width:633, height:588 }),
    Object.freeze({ domain:'codex', name:'Codex', x:982, y:0, width:690, height:548 }),
    Object.freeze({ domain:'hall', name:'HallOfFame', x:866, y:333, width:806, height:608 }),
]);

const clamp = n => Math.max(0, Math.min(1, n));
const lin = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    const s = i / 255;
    lin[i] = s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
}

export function emissionMaskPixels(active, vacant, width, height, plate, kind = 'warm') {
    if (!['warm', 'magic'].includes(kind) || !plate ||
        !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        active?.length !== width * height * 4 || vacant?.length !== active.length ||
        !TOWN_EMISSION_REGIONS[plate.domain]) throw new TypeError('Invalid authored Town emission source');
    const regions = TOWN_EMISSION_REGIONS[plate.domain][kind];
    const result = new Uint8ClampedArray(active.length);
    if (!regions.length) return result;
    // Sample only authored WINDOW/MAGIC regions. Thresholded positive
    // differences in linear RGB cannot make banners or dark bricks emissive.
    for (const [ax, ay, aw, ah] of regions) {
        const x0 = Math.max(0, Math.ceil(ax - plate.x));
        const y0 = Math.max(0, Math.ceil(ay - plate.y));
        const x1 = Math.min(width, Math.floor(ax + aw - plate.x));
        const y1 = Math.min(height, Math.floor(ay + ah - plate.y));
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            const ar = active[i], ag = active[i+1], ab = active[i+2];
            const delta = .2126 * (lin[ar]-lin[vacant[i]]) +
                .7152 * (lin[ag]-lin[vacant[i+1]]) + .0722 * (lin[ab]-lin[vacant[i+2]]);
            const warm = ar > 80 && ag > 38 && ar > ab * 1.22 && ag > ab * .80;
            const magic = ab >= ar * .86 || ab >= ag * .91;
            if ((kind === 'warm' && !warm) || (kind === 'magic' && !magic)) continue;
            const strength = clamp((delta - .045) * 3.4);
            if (strength < .14) continue;
            const opacity = Math.round(strength * 255);
            if (kind === 'magic') {
                result[i] = result[i+1] = result[i+2] = opacity;
            } else {
                // Preserve the existing hand-authored warm-window hue rather
                // than inventing new glowing squares or constant orange dots.
                result[i] = Math.round(ar * strength);
                result[i+1] = Math.round(ag * strength);
                result[i+2] = Math.round(ab * strength);
            }
            result[i+3] = 255;
        }
    }
    return result;
}
