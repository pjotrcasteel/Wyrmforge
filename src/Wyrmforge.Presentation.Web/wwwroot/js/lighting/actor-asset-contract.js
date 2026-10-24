// Presentation-only binding. The universal lighting renderer owns illumination.
// No per-creature light rules, clock, collider, attack semantics or fallback shaders.
import { spriteFrame } from './lit-sprite.js';

const requiredMaps = ['albedo', 'normal', 'depth', 'caster', 'emissive'];
export function litActorSample(spriteManifest, litManifest, sample) {
    if (litManifest.schemaVersion !== 1 ||
        spriteManifest.directions.length !== litManifest.directions.length ||
        !spriteManifest.directions.every((value, index) => value === litManifest.directions[index]))
        throw new Error('Actor directions/material contract mismatch');
    const original = spriteManifest.clips[sample.clip], material = litManifest.clips[sample.clip];
    if (!original || !material) throw new RangeError('Unregistered authored actor clip');
    if (original.frames !== material.frames || original.cell !== material.cell ||
        original.worldSize !== material.worldSize ||
        original.anchor.some((value, index) => value !== material.anchor[index]))
        throw new Error('Colour and material atlas sampling contract mismatch');
    for (const map of requiredMaps) if (typeof material[map] !== 'string' || !material[map])
        throw new Error('Missing authored actor material map: ' + map);
    if (material.albedo !== original.image) throw new Error('Albedo does not match the approved runtime atlas');
    const frame = spriteFrame(spriteManifest, sample);
    const { roughness, specular, metalness } = litManifest.material;
    if (![roughness, specular, metalness].every(Number.isFinite))
        throw new Error('Invalid actor material');
    return {
        actorId: litManifest.actorId,
        clip: sample.clip, direction: sample.direction, frameIndex: sample.frame,
        // One UV rect applies identically to every sampled texture and alpha caster.
        frame, images: Object.fromEntries(requiredMaps.map(name => [name, material[name]])),
        worldSize: material.worldSize, anchor: [...material.anchor], cell: material.cell,
        material: { roughness, specular, metalness, alphaCutoff: .5 },
        castShadow: Boolean(material.castShadow), receiveShadow: Boolean(material.receiveShadow),
        // The caster is documented, not promoted to volumetric source geometry.
        casterQuality: material.shadowQuality,
    };
}
