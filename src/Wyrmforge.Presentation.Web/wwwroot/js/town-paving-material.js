// Exact approved Town painting -> source-aligned GPU material layers.
// This is a gated LAB experiment. Do not mistake a painted source for final
// neutral albedo; its highlights must still be separately authored out.
export const PLAZA_PAVING_POLYGON = Object.freeze([
    [552, 375], [706, 361], [729, 382], [844, 386], [960, 384],
    [1023, 389], [1086, 428], [1117, 468], [1132, 517],
    [1130, 556], [1148, 597], [1213, 634], [1253, 701],
    [1198, 740], [1102, 728], [1042, 719], [1004, 742],
    [943, 786], [770, 797], [624, 756], [524, 735],
    [476, 686], [448, 623], [475, 548], [505, 483], [521, 423],
]);

export const TOWN_PAVING_BOUNDS = Object.freeze([448, 361, 805, 436]);
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
export function splitTownPavingReference(source) {
    if (source.naturalWidth !== SIZE[0] || source.naturalHeight !== SIZE[1])
        throw new Error('Approved Town source does not match canonical 1672x941 art');
    const path = pavingPath();
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
    outside.fillStyle = 'black';
    outside.fill(path);
    const inside = floor.getContext('2d');
    inside.globalCompositeOperation = 'destination-in';
    inside.fillStyle = 'white';
    inside.fill(path);
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
