// T2 bounded emission candidate derived ONLY from the genuine pixel-aligned
// canonical active/vacant Town art. This is not a Photoshop full-scene overlay.
// Warm apertures and Nexus magical apparatus are disjoint emission materials.
// No flags, banners, masonry, roofs or paving emit light by design.
export const TOWN_EMISSION_REGIONS = Object.freeze({
    nexus: Object.freeze({
        warm: [[97,190,50,90], [247,186,135,112], [87,283,65,85], [148,292,73,100], [260,282,70,86]],
        magic: [[237,49,160,135], [385,254,108,119], [340,285,32,55], [480,255,30,58]],
    }),
    blacksmith: Object.freeze({
        warm: [[35,596,111,170], [163,615,125,155], [280,585,128,200],
            [103,440,63,96]],
        magic: [],
    }),
    codex: Object.freeze({
        warm: [[1115,190,135,164], [1264,134,180,230], [1404,184,250,250]],
        magic: [],
    }),
    hall: Object.freeze({
        warm: [[1075,517,145,250], [1202,548,180,260],
            [1352,520,165,300], [1500,576,158,280]],
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
            if (isTownClothPixel(x + plate.x, y + plate.y)) continue;
            const i = (y * width + x) * 4;
            // Transparent vacant pixels have no comparable registered unlit surface.
            // Never mistake missing pixels for dramatic emission differences.
            if (active[i+3] < 245 || vacant[i+3] < 245) continue;
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

// Manually bounded CLOTH exclusions in the unchanged 1672x941 canonical art.
// Gold thread belongs to the same non-emissive surface. These are emission
// masks only, never geometry/collision, shadow wedges or visible dark overlays.
export const TOWN_CLOTH_REGIONS = Object.freeze([
    [146,205,29,82], [303,184,36,114], [232,293,39,62],
    [673,91,45,154], [951,89,44,155], [589,221,28,84], [1052,219,28,84],
    [619,308,36,87], [1007,307,33,89], [1301,169,34,102],
    [1432,237,37,108], [1130,263,26,55], [1380,373,32,48],
    [1258,485,57,126], [1194,496,32,112], [1390,528,34,114],
    [1576,514,32,111], [1192,658,34,102], [1350,695,32,101],
    [1058,620,31,85], [1639,663,32,72], [593,663,39,100], [967,659,43,109],
]);
export function isTownClothPixel(x, y) {
    return TOWN_CLOTH_REGIONS.some(([left,top,width,height]) =>
        x >= left && x < left+width && y >= top && y < top+height);
}

// Source-authored public lamp apertures, not an RGB scene contribution.
// These small bounds follow the lantern glass/flames in canonical source pixels.
// No inferred unlit frame is used or claimed for this common-domain mask.
export const TOWN_COMMON_EMISSION_PLATE = Object.freeze({
    domain:'common', name:'PublicFixtures', x:0, y:0, width:1672, height:941,
});
export const TOWN_APERTURE_PLATES = Object.freeze([TOWN_COMMON_EMISSION_PLATE, ...TOWN_EMISSION_PLATES]);
export const TOWN_COMMON_APERTURES = Object.freeze([
    [826,188,15,22], [738,220,12,24], [916,220,12,24],
    [895,456,11,21], [546,360,12,21], [1105,362,12,22],
    [355,422,12,24], [1212,418,13,22], [608,609,15,26], [987,611,15,25],
    [704,685,13,25], [894,682,13,24], [594,842,16,32], [1010,850,16,33],
    [827,24,15,25], [718,15,13,23], [937,14,13,24],
]);
export function commonAperturePixels(source, width, height) {
    if (width!==1672 || height!==941 || source?.length!==width*height*4)
        throw new TypeError('Public emission requires exact canonical source pixels');
    const result=new Uint8ClampedArray(source.length);
    for (const [left,top,w,h] of TOWN_COMMON_APERTURES)
        for (let y=top;y<top+h;y++) for (let x=left;x<left+w;x++) {
            const i=(y*width+x)*4;
            if (isTownClothPixel(x,y) || source[i+3]<245 ||
                source[i]<140 || source[i+1]<65 || source[i]<source[i+2]*1.3) continue;
            result[i]=source[i];result[i+1]=source[i+1];result[i+2]=source[i+2];result[i+3]=255;
        }
    return result;
}
