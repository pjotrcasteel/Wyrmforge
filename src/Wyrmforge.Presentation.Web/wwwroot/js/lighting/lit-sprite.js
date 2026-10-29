// Shared binding for Hollowed, Ashling, NPCs and the replacement mage.
// Takes the existing animation sampler's clip/frame/direction; owns no gameplay clock.
export function spriteFrame(manifest, { clip, frame, direction }) {
    const c = manifest.clips[clip], row = manifest.directions.indexOf(direction);
    if (!c || row < 0 || !Number.isInteger(frame) || frame < 0 || frame >= c.frames)
        throw new RangeError('Invalid authored sprite sample');
    return { offset: [frame / c.frames, 1 - (row + 1) / manifest.directions.length],
        repeat: [1 / c.frames, 1 / manifest.directions.length] };
}
export function spritePlaneGeometry(THREE, clip, unitsPerPixel = 1 / 48, towardCamera = [0, -1, 0]) {
    const size = clip.worldSize * unitsPerPixel;
    const geometry = new THREE.PlaneGeometry(size, size);
    // Atlas normals are camera-right/up/toward, so the receiving plane must use
    // that same tangent frame. Tilting an already projected sprite a second time
    // distorts both its silhouette and its lighting. The authored foot stays at 0.
    const toward = new THREE.Vector3(...towardCamera).normalize();
    const right = new THREE.Vector3(0, 0, 1).cross(toward).normalize();
    if (toward.lengthSq() === 0 || right.lengthSq() === 0) throw new RangeError('Invalid sprite camera direction');
    const up = toward.clone().cross(right).normalize();
    geometry.translate((.5 - clip.anchor[0] / clip.cell) * size,
        (clip.anchor[1] / clip.cell - .5) * size, 0);
    geometry.applyMatrix4(new THREE.Matrix4().makeBasis(right, up, toward));
    return geometry;
}
