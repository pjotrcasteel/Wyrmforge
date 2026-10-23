// Shared binding for Hollowed, Ashling, NPCs and the replacement mage.
// Takes the existing animation sampler's clip/frame/direction; owns no gameplay clock.
export function spriteFrame(manifest, { clip, frame, direction }) {
    const c = manifest.clips[clip], row = manifest.directions.indexOf(direction);
    if (!c || row < 0 || !Number.isInteger(frame) || frame < 0 || frame >= c.frames)
        throw new RangeError('Invalid authored sprite sample');
    return { offset: [frame / c.frames, 1 - (row + 1) / manifest.directions.length],
        repeat: [1 / c.frames, 1 / manifest.directions.length] };
}
export function spritePlaneGeometry(THREE, clip, unitsPerPixel = 1 / 48) {
    const size = clip.worldSize * unitsPerPixel;
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(Math.PI / 2);
    geometry.translate((.5 - clip.anchor[0] / clip.cell) * size, 0,
        (clip.anchor[1] / clip.cell - .5) * size);
    return geometry;
}
