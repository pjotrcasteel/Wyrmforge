// Shared binding for Hollowed, Ashling, NPCs and the replacement mage.
// Takes the existing animation sampler's clip/frame/direction; owns no gameplay clock.
/** Layout only: retains the existing one-row-per-facing default. Crops preserve
 * the authored source pixel scale and anchor; they never rescale the creature. */
export function spriteAtlasLayout(clip, directions=8) {
    const cell=clip.cell??1,frames=clip.frames??1,columns=clip.columns??frames;
    const crop=clip.crop??[0,0,cell,cell];
    if(!Number.isSafeInteger(cell)||cell<1||!Number.isSafeInteger(frames)||frames<1||!Number.isSafeInteger(columns)||columns<1||columns>frames||!Number.isSafeInteger(directions)||directions<1||!Array.isArray(crop)||crop.length!==4||!crop.every(Number.isSafeInteger)||crop[0]<0||crop[1]<0||crop[2]>cell||crop[3]>cell||crop[2]<=crop[0]||crop[3]<=crop[1])
        throw new RangeError('Invalid authored sprite atlas layout');
    const tileWidth=crop[2]-crop[0],tileHeight=crop[3]-crop[1],rowsPerDirection=Math.ceil(frames/columns);
    return {columns,rowsPerDirection,tileWidth,tileHeight,crop,width:columns*tileWidth,height:directions*rowsPerDirection*tileHeight};
}
export function spriteFrame(manifest, { clip, frame, direction }) {
    const c = manifest.clips[clip], row = manifest.directions.indexOf(direction);
    if (!c || row < 0 || !Number.isInteger(frame) || frame < 0 || frame >= c.frames)
        throw new RangeError('Invalid authored sprite sample');
    const layout=spriteAtlasLayout(c,manifest.directions.length),rows=layout.rowsPerDirection*manifest.directions.length;
    return { offset: [(frame%layout.columns)/layout.columns,1-(row*layout.rowsPerDirection+Math.floor(frame/layout.columns)+1)/rows],
        repeat: [1/layout.columns,1/rows] };
}
export function spritePlaneGeometry(THREE, clip, unitsPerPixel = 1 / 48, towardCamera = [0, -1, 0]) {
    const size = clip.worldSize * unitsPerPixel;
    const layout=spriteAtlasLayout(clip);
    const width=layout.tileWidth/clip.cell*size,height=layout.tileHeight/clip.cell*size;
    const geometry = new THREE.PlaneGeometry(width, height);
    // Atlas normals are camera-right/up/toward, so the receiving plane must use
    // that same tangent frame. Tilting an already projected sprite a second time
    // distorts both its silhouette and its lighting. The authored foot stays at 0.
    const toward = new THREE.Vector3(...towardCamera).normalize();
    const right = new THREE.Vector3(0, 0, 1).cross(toward).normalize();
    if (toward.lengthSq() === 0 || right.lengthSq() === 0) throw new RangeError('Invalid sprite camera direction');
    const up = toward.clone().cross(right).normalize();
    geometry.translate(((layout.crop[0]+layout.crop[2])*.5-clip.anchor[0])/clip.cell*size,
        (clip.anchor[1]-(layout.crop[1]+layout.crop[3])*.5)/clip.cell*size,0);
    geometry.applyMatrix4(new THREE.Matrix4().makeBasis(right, up, toward));
    return geometry;
}
