// Authoring-side binding, not a second light engine. All material passes share
// the single validated animation sample used by the existing LitSprite binding.
import { spriteFrame } from './lit-sprite.js';

export function validateActorMaterialManifest(sprite, material) {
    if (!sprite || !material || material.schemaVersion !== 1) throw new TypeError('Missing actor material metadata');
    if (JSON.stringify(sprite.directions) !== JSON.stringify(material.directions))
        throw new RangeError('Color and material direction rows differ');
    for (const [name, clip] of Object.entries(sprite.clips)) {
        const pass = material.clips[name];
        if (!pass || !pass.albedo || !pass.normal || !pass.depth || !pass.caster)
            throw new Error(`Missing authored passes for ${name}`);
        if (pass.frames !== clip.frames || pass.cell !== clip.cell ||
            pass.worldSize !== clip.worldSize || JSON.stringify(pass.anchor) !== JSON.stringify(clip.anchor))
            throw new RangeError(`Color/material atlas mismatch: ${name}`);
        if (pass.albedo !== clip.image)
            throw new RangeError(`Original albedo not preserved: ${name}`);
        if (!/^[a-f0-9]{64}$/.test(pass.sourcePoseSha256) || !/^[a-f0-9]{64}$/.test(pass.albedoSha256))
            throw new Error(`Unverified source provenance: ${name}`);
    }
    return material;
}

// Use the SAME animation state for beauty, geometry-derived normals, depth
// and shadow-cutout. No separate clock, direction or transition policy.
export function actorMaterialSample(sprite, material, sample) {
    validateActorMaterialManifest(sprite, material);
    const selected = material.clips[sample.clip];
    if (!selected) throw new RangeError('Unrecognized authored material clip');
    const frame = spriteFrame(sprite, sample);
    return {
        frame,
        textures: {
            albedo: selected.albedo, normal: selected.normal,
            depth: selected.depth, caster: selected.caster,
        },
        sourcePoseSha256: selected.sourcePoseSha256,
        anchor: [...selected.anchor], worldSize: selected.worldSize,
        roughness: material.roughness, specular: material.specular, metalness: material.metalness,
        castsShadow: material.castsShadow, receivesShadow: material.receivesShadow,
        receivesLight: material.receivesLight,
        emissive: material.emissive, casterMode: selected.casterMode,
    };
}
