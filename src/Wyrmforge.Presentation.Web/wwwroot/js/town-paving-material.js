// Exact approved Town painting -> source-aligned GPU material layers.
// This is a gated LAB experiment. Do not mistake a painted source for final
// neutral albedo; its highlights must still be separately authored out.
export const PLAZA_PAVING_POLYGON = Object.freeze([
    [552, 375], [706, 361], [741, 368], [762, 338], [797, 225],
    [869, 225], [906, 337], [933, 365], [960, 384],
    [1023, 389], [1080, 422], [1104, 473], [1120, 531],
    [1110, 589], [1130, 640], [1140, 682], [1120, 709],
    [1042, 700], [1004, 727], [977, 747], [1015, 941],
    [665, 941], [695, 747],
    [624, 746], [556, 722], [532, 670], [523, 622],
    [525, 548], [516, 483], [521, 423],
]);

// Additional dry MATERIAL coverage follows the existing public ground lanes.
// It does not add roads, collision, or guessed depth. In particular the old
// rectangle stopped short of the circled side approaches and lower lamp pools.
export const TOWN_DRY_GROUND_LANES = Object.freeze([
    [[429,513],[465,484],[528,466],[588,468],[608,516],[614,574],[573,621],[507,645],[449,627],[418,580]],
    [[1034,473],[1117,469],[1161,485],[1169,536],[1149,592],[1091,618],[1025,615],[1008,558]],
    [[520,843],[550,823],[612,810],[676,806],[708,798],[736,828],[720,858],[635,874],[540,870]],
    [[958,794],[1016,787],[1063,795],[1093,794],[1097,833],[1084,876],[1030,865],[968,865]],
]);
export const TOWN_PAVING_BOUNDS = Object.freeze([418, 225, 751, 716]);
const SIZE = Object.freeze([1672, 941]);
// Visible property silhouettes are not ground even where walkable space continues
// behind them. Keep original vacant-state roofs, windows, cloth and foliage.
const DRY_GROUND_SCENERY_EXCLUSIONS = Object.freeze([
    [[1110,480],[1090,510],[1070,548],[1050,594],[1042,620],[1045,644],
     [1062,669],[1050,698],[1072,720],[1100,740],[1120,760],[1200,800],[1672,941],[1672,333]],
    [[0,353],[330,430],[350,479],[396,494],[450,490],[474,512],[479,559],
     [451,581],[461,643],[429,691],[0,941]],
]);

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
    for(const lane of TOWN_DRY_GROUND_LANES) {
        path.moveTo(...lane[0]);
        for(const point of lane.slice(1)) path.lineTo(...point);
        path.closePath();
    }
    return path;
}

/** Complete, pixel-aligned complementary textures: no replacement art. */
export function splitTownPavingReference(source, foregroundCutouts = []) {
    // Both the original decoded <img> and the registered offscreen vacant-plate
    // canvas are legal exact-source inputs; neither may be stretched.
    if ((source.naturalWidth ?? source.width) !== SIZE[0] ||
        (source.naturalHeight ?? source.height) !== SIZE[1])
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
    for(const points of DRY_GROUND_SCENERY_EXCLUSIONS) {
        const contour=new Path2D();contour.moveTo(...points[0]);
        for(const point of points.slice(1)) contour.lineTo(...point);
        contour.closePath();maskContext.fill(contour);
    }
    for (const cutout of foregroundCutouts) {
        if (!cutout || typeof cutout.path !== 'string') throw new TypeError('Missing authored foreground contour');
        maskContext.fill(new Path2D(cutout.path));
    }
    // The universal material uses alphaTest=0.5 and nearest-pixel atlas
    // sampling. Quantize the SAME authored mask once, before dividing source
    // textures, so antialiased half-alpha cannot discard both materials.
    const maskPixels = maskContext.getImageData(0, 0, SIZE[0], SIZE[1]);
    for (let i = 3; i < maskPixels.data.length; i += 4)
        maskPixels.data[i] = maskPixels.data[i] >= 128 ? 255 : 0;
    maskContext.globalCompositeOperation = 'source-over';
    maskContext.putImageData(maskPixels, 0, 0);
    const textureCanvas = () => {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE[0]; canvas.height = SIZE[1];
        canvas.getContext('2d').drawImage(source, 0, 0);
        return canvas;
    };
    const backdrop = textureCanvas();
    const floor = textureCanvas();
    const sourceAlpha = backdrop.getContext('2d').getImageData(0, 0, SIZE[0], SIZE[1]).data;
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
        if (sum !== sourceAlpha[i] || (backAlpha[i] !== 0 && backAlpha[i] !== 255) ||
            (floorAlpha[i] !== 0 && floorAlpha[i] !== 255))
            throw new Error('Town paving/backdrop mask seam at pixel ' + ((i - 3) / 4));
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

/** Blend only a narrow material-authoring boundary, not rendered lighting.
 * Both inputs are original-size ground crops; alpha and stone geometry stay fixed.
 * The interior uses dry canonical daytime paving, never the night painting's wet streaks.
 */
export function softenTownPavingBoundary(dryCanvas, nightCanvas, width = 28) {
    if (dryCanvas.width !== 1672 || dryCanvas.height !== 941 ||
        nightCanvas.width !== 1672 || nightCanvas.height !== 941 ||
        !Number.isInteger(width) || width < 1 || width > 64)
        throw new TypeError('Expected exact Town ground candidates');
    const ctx = dryCanvas.getContext('2d');
    const dry = ctx.getImageData(0, 0, 1672, 941);
    const night = nightCanvas.getContext('2d').getImageData(0, 0, 1672, 941).data;
    const w = 1672, h = 941, distance = new Uint8Array(w*h);
    // Only feather the outer ground boundary, never well/board holes: doing
    // that would bring the painted wet halo back around the foreground prop.
    const mask=document.createElement('canvas'); mask.width=w; mask.height=h;
    const maskContext=mask.getContext('2d'); maskContext.fill(pavingPath());
    const coverage=maskContext.getImageData(0,0,w,h).data;
    for (let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const n=y*w+x;
        if(coverage[n*4+3]) distance[n]=Math.min(width,
            x ? distance[n-1]+1 : 1, y ? distance[n-w]+1 : 1);
    }
    for(let y=h-1;y>=0;y--) for(let x=w-1;x>=0;x--) {
        const n=y*w+x;
        if(!coverage[n*4+3]) continue;
        distance[n]=Math.min(distance[n],x+1<w?distance[n+1]+1:1,y+1<h?distance[n+w]+1:1);
        const t=Math.min(1,distance[n]/width), weight=t*t*(3-2*t);
        for(let c=0;c<3;c++) dry.data[n*4+c]=Math.round(
            night[n*4+c]*(1-weight)+dry.data[n*4+c]*weight);
    }
    ctx.putImageData(dry,0,0);
    return dryCanvas;
}
