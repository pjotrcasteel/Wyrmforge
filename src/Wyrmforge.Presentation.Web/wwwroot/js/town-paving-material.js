// Exact approved Town painting -> source-aligned GPU material layers.
// This is a gated LAB experiment. Do not mistake a painted source for final
// neutral albedo; its highlights must still be separately authored out.
export const PLAZA_PAVING_POLYGON = Object.freeze([
    [552, 375], [706, 361], [729, 382], [844, 386], [960, 384],
    [1023, 389], [1080, 422], [1104, 473], [1120, 531],
    [1110, 589], [1130, 640], [1140, 682], [1120, 709],
    [1042, 700], [1004, 727], [943, 760], [770, 778],
    [624, 746], [556, 722], [532, 670], [523, 622],
    [525, 548], [516, 483], [521, 423],
]);

export const TOWN_PAVING_BOUNDS = Object.freeze([516, 361, 624, 417]);
const SIZE = Object.freeze([1672, 941]);

export function validateTownPavingPolygon(polygon = PLAZA_PAVING_POLYGON) {
    if (!Array.isArray(polygon) || polygon.length < 3) throw new TypeError('Missing authored paving contour');
    for (const pair of polygon) {
        if (!Array.isArray(pair) || pair.length !== 2 ||
            !pair.every(Number.isFinite) || pair[0] < 0 || pair[0] > SIZE[0] ||
            pair[1] < 0 || pair[1] > SIZE[1]) throw new RangeError('Authored paving contour outside Town painting');
    }
    const area = polygon.reduce((sum, a, index) => {
        const b = polygon[(index + 1) % polygon.length];
        return sum + (a[0] * b[1] - b[0] * a[1]);
    }, 0) / 2;
    if (Math.abs(area) < 30000) throw new RangeError('Degenerate paving contour');
    return { points: polygon.length, area: Math.abs(area), clockwise: area > 0 };
}

export function pavingPath() {
    validateTownPavingPolygon();
    const path = new Path2D();
    const [first, ...remaining] = PLAZA_PAVING_POLYGON;
    path.moveTo(...first);
    for (const point of remaining) path.lineTo(...point);
    path.closePath();
    return path;
}

/** Complete, pixel-aligned complementary textures: no replacement art. */
export function splitTownPavingReference(source, foregroundCutouts = []) {
    if (source.naturalWidth !== SIZE[0] || source.naturalHeight !== SIZE[1])
        throw new Error('Approved Town source does not match canonical 1672x941 art');
    const path = pavingPath();
    // Make one shared alpha mask. Excluding original traced well/board masks
    // prevents painting roofs/posts as horizontal paving normals. Crucially,
    // backdrop and paving use the very same alpha rather than two independent
    // rasterizations that could create visible seams.
    const mask = document.createElement('canvas');
    mask.width = SIZE[0]; mask.height = SIZE[1];
    const maskContext = mask.getContext('2d');
    maskContext.fillStyle = '#ffffff';
    maskContext.fill(path);
    maskContext.globalCompositeOperation = 'destination-out';
    for (const cutout of foregroundCutouts) {
        if (!cutout || typeof cutout.path !== 'string') throw new TypeError('Missing authored foreground contour');
        maskContext.fill(new Path2D(cutout.path));
    }
    const textureCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE[0]; canvas.height = SIZE[1];
        canvas.getContext('2d').drawImage(source, 0, 0);
        return canvas;
    };
    const backdrop = textureCanvas();
    const floor = textureCanvas();
    const outside = backdrop.getContext('2d');
    outside.globalCompositeOperation = 'destination-out';
    outside.drawImage(mask, 0, 0);
    const inside = floor.getContext('2d');
    inside.globalCompositeOperation = 'destination-in';
    inside.drawImage(mask, 0, 0);
    // A seam cannot be signed off on an image alone. Confirm the two atlas
    // planes are an exact alpha partition at every approved source pixel.
    const backAlpha = outside.getImageData(0, 0, SIZE[0], SIZE[1]).data;
    const floorAlpha = inside.getImageData(0, 0, SIZE[0], SIZE[1]).data;
    for (let i = 3; i < backAlpha.length; i += 4) {
        const sum = backAlpha[i] + floorAlpha[i];
        if (Math.abs(sum - 255) > 1) throw new Error('Town paving/backdrop mask seam at pixel ' + ((i - 3) / 4));
    }
    return { backdrop, floor };
}

/** Independent *authored* planar normal for level paving in tangent space.
 *  The painting is a camera-facing quad. The real receiving surface is level
 *  world-Z; author this orientation rather than guessing normals from RGB.
 *  The basis must match the shared camera and source-plane geometry.
 */
export function levelPavingNormal(right, up, toward) {
    const normal = [right.z, up.z, toward.z];
    if (normal.some(n => !Number.isFinite(n)) ||
        Math.abs(Math.hypot(...normal) - 1) > 1e-4) throw new TypeError('Invalid Town tangent basis');
    return Uint8Array.from([...normal.map(n => Math.round((n * .5 + .5) * 255)), 255]);
}
