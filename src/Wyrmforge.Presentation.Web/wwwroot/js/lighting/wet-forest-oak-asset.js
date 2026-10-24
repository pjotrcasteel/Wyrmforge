// Source-derived Wet Forest oak asset packet for the SAME G1 lighting renderer.
// No custom shader, light, shadow or Canvas path. Candidate art, never live Hunt art.
const finite01 = (value, name) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new TypeError(`Invalid ${name}`);
};
const vector3 = (value, name, positive = false) => {
    if (!Array.isArray(value) || value.length !== 3 ||
        value.some(v => !Number.isFinite(v) || positive && v <= 0)) throw new TypeError(`Invalid ${name}`);
};
const hex = value => /^#[0-9a-f]{6}$/i.test(value);

/**
 * Validate a source mesh and independently authored physical surface properties
 * before creating the shared LightingSnapshot descriptors.
 *
 * @param {object} source  oak.json exported from the editable Blender source
 * @param {object} packet  wet-forest-oak.asset.json, NOT an approved visual asset
 * @param {number} vertexBytes  actual oak.bin byte length
 * @param {{position?: number[], scale?: number[]}} options review-only placement
 */
export function buildWetForestOakAsset(source, packet, vertexBytes, options = {}) {
    if (packet?.schemaVersion !== 1 || packet?.id !== 'wet-forest/ancient-oak' ||
        packet?.approval !== 'original-candidate-not-approved' || packet?.stage !== 'isolated-g1-proof-only')
        throw new TypeError('Oak asset packet must remain explicitly unapproved and isolated');
    if (source?.approval !== packet.approval || source?.stride !== 6 ||
        !Array.isArray(source.groups) || !Array.isArray(packet.parts) ||
        !Array.isArray(packet.coordinates?.anchor))
        throw new TypeError('Missing matching source-derived geometry contract');
    vector3(packet.coordinates.anchor, 'ground anchor');
    if (packet.coordinates.up !== 'Z' || packet.coordinates.unit !== 'metre')
        throw new TypeError('Unsupported source coordinate convention');
    if (source.groups.length !== packet.parts.length || source.groups.length === 0)
        throw new TypeError('Missing/extra oak material groups');

    const position = options.position ?? [2.3, 3.4, 0];
    const scale = options.scale ?? [.48, .48, .48];
    vector3(position, 'oak position');
    vector3(scale, 'oak scale', true);
    if (!Number.isSafeInteger(vertexBytes) || vertexBytes < 0) throw new TypeError('Invalid geometry byte length');

    const materials = [], objects = [];
    let nextOffset = 0;
    const identifiers = new Set();
    for (let i = 0; i < source.groups.length; i++) {
        const group = source.groups[i], part = packet.parts[i];
        if (part?.id !== group?.id || identifiers.has(group.id) ||
            !/^oak-[0-9]+$/.test(group.id) || !hex(group.color))
            throw new TypeError('Unmatched, duplicated or invalid oak geometry/material group');
        identifiers.add(group.id);
        if (!Number.isSafeInteger(group.vertexCount) || group.vertexCount < 3 ||
            group.vertexCount % 3 !== 0 || group.byteOffset !== nextOffset)
            throw new TypeError('Invalid triangle stream offsets or vertex counts');
        nextOffset += group.vertexCount * source.stride * Float32Array.BYTES_PER_ELEMENT;
        finite01(part.roughness, 'surface roughness');
        finite01(part.specular, 'surface specular');
        if (typeof part.surface !== 'string' || !part.surface.trim())
            throw new TypeError('Missing named authored surface');
        materials.push({
            id: group.id, color: group.color, roughness: part.roughness,
            metalness: 0, specular: part.specular, reflection: 'direct',
            emission: '#000000', emissionIntensity: 0,
            // Actual 3D leaf meshes: no transparent card alpha or fake bitmap shadows.
            alphaCutoff: 0, doubleSided: true,
        });
        objects.push({
            id: group.id, ownerId: packet.id, geometry: group.id, material: group.id,
            position: [...position], rotation: [0, 0, 0], scale: [...scale],
            castsShadow: true, receivesShadow: true, receivesLight: true,
        });
    }
    if (nextOffset !== vertexBytes) throw new TypeError('Geometry binary differs from the source manifest');
    return { materials, objects };
}
