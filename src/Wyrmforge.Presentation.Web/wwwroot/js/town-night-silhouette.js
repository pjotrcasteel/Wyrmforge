// T2 hand-authored foreground skyline in canonical art pixels. This is a
// MATERIAL ALPHA contour only, not depth, collision or shadow geometry.
// It omits the old painting's distant village, lake, mountains, sky and moon.
// Original source bytes are never modified; daytime keeps its own background.
export const TOWN_NIGHT_SKYLINE = Object.freeze([
    [0,253],[25,239],[35,153],[44,172],[93,173],[112,154],
    [119,108],[128,100],[135,89],[144,111],[147,149],[171,136],
    [211,111],[222,85],[250,58],[277,47],[280,36],[288,48],
    [316,51],[345,69],[371,104],[385,146],[415,133],[424,123],
    [432,137],[465,152],[482,159],[493,153],[515,164],[542,164],
    [550,150],[567,175],[584,146],[600,128],[621,125],
    [634,49],[653,48],[668,55],[710,50],[716,27],[724,12],
    [734,30],[742,52],[744,26],[753,12],[761,33],[766,50],
    [776,0],[890,0],[901,50],[910,31],[918,12],[926,33],
    [934,50],[936,28],[943,12],[951,33],[958,54],[1033,47],
    [1032,125],[1065,119],[1083,149],[1100,141],[1115,169],
    [1156,179],[1190,174],[1218,157],[1230,123],[1241,148],
    [1267,142],[1274,78],[1282,65],[1290,47],[1299,78],
    [1310,92],[1348,81],[1371,66],[1380,49],[1388,78],
    [1411,75],[1444,53],[1452,42],[1461,73],[1480,91],
    [1504,160],[1534,174],[1553,161],[1564,151],[1588,164],
    [1607,186],[1635,198],[1672,189], [1672,941],[0,941],
]);
export function clipTownNightSilhouette(canvas, {x=0,y=0}={}) {
    const ctx=canvas.getContext('2d');
    if (!ctx || !Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('Town silhouette needs art-aligned canvas');
    ctx.save();
    ctx.globalCompositeOperation='destination-in';
    ctx.translate(-x,-y);ctx.beginPath();
    TOWN_NIGHT_SKYLINE.forEach(([px,py],i)=>i ? ctx.lineTo(px,py) : ctx.moveTo(px,py));
    ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();
    ctx.restore();
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=3;i<pixels.data.length;i+=4) pixels.data[i]=pixels.data[i]>=128 ? 255 : 0;
    ctx.putImageData(pixels,0,0);
    return canvas;
}
