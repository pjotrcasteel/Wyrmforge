// Explicit shape-only planar shadow fallback from the authored caster mask.
// This is NOT a 3D extrusion, volume reconstruction, or normal-map-generated caster.
// Native pixel runs become shallow vertical polygons at the same foot pivot as beauty.
export function planarCasterVertices(mask, cell, anchor, worldSize, channel = 0) {
    if (!Number.isInteger(cell) || cell < 1 || mask.length !== cell * cell * 4 ||
        !Array.isArray(anchor) || anchor.length !== 2 || !Number.isFinite(worldSize) ||
        worldSize <= 0 || channel < 0 || channel > 3)
        throw new RangeError('Invalid authored planar caster mask');
    const scale = worldSize / (48 * cell);
    const triangles = [];
    const vertex = (x, z) => triangles.push(x, 0, z);
    const quad = (left, right, bottom, top) => {
        vertex(left, bottom); vertex(right, bottom); vertex(right, top);
        vertex(left, bottom); vertex(right, top); vertex(left, top);
        // Paired windings: existing shared GPU engine may cull either facing
        // when allocating a light's real shadow map.
        vertex(right, top); vertex(right, bottom); vertex(left, bottom);
        vertex(left, top); vertex(right, top); vertex(left, bottom);
    };
    for (let y = 0; y < cell; y++) {
        let begin = -1;
        for (let x = 0; x <= cell; x++) {
            const filled = x < cell && mask[(y * cell + x) * 4 + channel] >= 128;
            if (filled && begin < 0) begin = x;
            if (!filled && begin >= 0) {
                const x0 = (begin - anchor[0]) * scale;
                const x1 = (x - anchor[0]) * scale;
                const bottom = (anchor[1] - y - 1) * scale;
                const top = (anchor[1] - y) * scale;
                quad(x0, x1, bottom, top);
                begin = -1;
            }
        }
    }
    return new Float32Array(triangles);
}
export function planarCasterGeometry(THREE, mask, cell, anchor, worldSize) {
    const vertices = planarCasterVertices(mask, cell, anchor, worldSize);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
}
