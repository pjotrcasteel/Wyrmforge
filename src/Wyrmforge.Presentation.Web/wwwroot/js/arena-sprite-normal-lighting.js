// Optional L4/L5 artifact review of ACTUAL per-pixel camera-space surface
// normals exported from the original editable Blender source. No inferred
// normals, fake 3D objects, source recoloring, or gameplay mesh/collision.
// Camera-space X is screen-right, Y is screen-up, Z faces the camera.
const clamp = (x, low, high) => Math.min(high, Math.max(low, x));

export function shadeTreeCameraNormals(albedo, normals, light, darkness = .90, output = null) {
    if (!albedo || !normals || albedo.length !== normals.length ||
        albedo.length % 4 !== 0 || albedo.length === 0) return null;
    const result = output?.length === albedo.length ? output : new Uint8ClampedArray(albedo.length);
    const ambient = clamp(.34 - .27 * darkness, .08, .24);
    const strength = clamp(Number(light?.intensity) || 0, 0, 1);
    const x = light ? -light.dirX : 0;
    const y = light ? light.dirY : 0;
    const z = .68;
    const length = Math.hypot(x, y, z);
    const lx = x / length, ly = y / length, lz = z / length;
    for (let i = 0; i < result.length; i += 4) {
        const alpha = albedo[i + 3];
        result[i + 3] = alpha;
        if (alpha < 2) {
            result[i] = result[i + 1] = result[i + 2] = 0;
            continue;
        }
        const supported = normals[i + 3] > 6;
        const nx = supported ? normals[i] / 127.5 - 1 : 0;
        const ny = supported ? normals[i + 1] / 127.5 - 1 : 0;
        const nz = supported ? normals[i + 2] / 127.5 - 1 : 1;
        const dot = Math.max(0, nx * lx + ny * ly + nz * lz);
        const lighting = strength * dot;
        const diffuse = ambient + lighting * .98;
        const warmth = lighting * .14;
        result[i] = Math.min(255, albedo[i] * diffuse + 255 * warmth);
        result[i + 1] = Math.min(255, albedo[i + 1] * diffuse + 139 * warmth);
        result[i + 2] = Math.min(255, albedo[i + 2] * diffuse + 66 * warmth);
    }
    return result;
}
