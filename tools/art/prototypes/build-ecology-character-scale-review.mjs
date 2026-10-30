// Offline character-to-ecology pixel-scale comparison using the actual runtime atlases.
// This does not replace any actor art, register a renderer, or imply a live Hunt capture.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from '../lib/painter.mjs';
import { decodePng, encodePng } from '../lib/png.mjs';
import { createWorldBoundaryWindow } from './terrain-world-variation.mjs';
import { makeEcology25DProp, PIXELS_PER_WORLD_UNIT } from './terrain-ecology-props-25d.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ART_ROOT = join(REPO_ROOT, 'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies');
export const ACTOR_REFERENCE_CONFIG = Object.freeze({
    hollowed: Object.freeze({
        directory: 'hollow-rigged/arms',
        manifest: 'manifest.json',
        variant: 'standard',
        clip: 'walk',
        direction: 'S',
        frame: 0,
        anchor: [85, 185]
    }),
    ashling: Object.freeze({
        directory: 'ashling-rigged',
        manifest: 'manifest.json',
        clip: 'walk',
        direction: 'S',
        frame: 0,
        anchor: [302, 185]
    })
});

function loadReference(name) {
    const spec = ACTOR_REFERENCE_CONFIG[name];
    if (!spec) throw new RangeError('Unknown reference actor');
    const directory = join(ART_ROOT, spec.directory);
    const manifest = JSON.parse(readFileSync(join(directory, spec.manifest), 'utf8'));
    const clip = spec.variant ? manifest.clips?.[spec.variant]?.[spec.clip] : manifest.clips?.[spec.clip];
    const directionIndex = manifest.directions.indexOf(spec.direction);
    if (!clip || directionIndex < 0 || !Array.isArray(clip.anchor) ||
        !Number.isFinite(clip.worldSize) || clip.worldSize <= 0)
        throw new Error('Invalid runtime actor reference: ' + name);
    const atlas = decodePng(readFileSync(join(directory, clip.image)));
    if (atlas.width !== clip.cell * clip.frames || atlas.height !== clip.cell * manifest.directions.length)
        throw new Error('Runtime atlas shape mismatch: ' + name);
    return {name, spec, clip, atlas, directionIndex,
        sourcePath: 'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/' +
            spec.directory + '/' + clip.image};
}

// Exactly the production Canvas sprite frame/anchor sizing, sampled nearest-neighbour.
// Inputs are the immutable PNG and manifest referenced by each real runtime actor.
function drawReferenceFrame(canvas, actor) {
    const {spec, clip, atlas, directionIndex} = actor;
    const size = clip.worldSize; // Production at radius=11; no independent scaling.
    const left = spec.anchor[0] - clip.anchor[0] / clip.cell * size;
    const top = spec.anchor[1] - clip.anchor[1] / clip.cell * size;
    for (let y = Math.floor(top); y < Math.ceil(top + size); y++)
        for (let x = Math.floor(left); x < Math.ceil(left + size); x++) {
            const sampleX = Math.floor((x + .5 - left) / size * clip.cell);
            const sampleY = Math.floor((y + .5 - top) / size * clip.cell);
            if (sampleX < 0 || sampleY < 0 || sampleX >= clip.cell || sampleY >= clip.cell) continue;
            const sx = spec.frame * clip.cell + sampleX;
            const sy = directionIndex * clip.cell + sampleY;
            const i = (sy * atlas.width + sx) * 4;
            if (atlas.rgba[i + 3])
                canvas.set(x, y, Array.from(atlas.rgba.subarray(i, i + 4)));
        }
}
function drawProp(canvas, kind, variant, x, y, layer) {
    const sprite = makeEcology25DProp(kind, variant);
    canvas.blit(sprite.layers[layer].albedo, x - sprite.anchor[0], y - sprite.anchor[1]);
}
function nearest3x(source) {
    const out = new Bitmap(source.width * 3, source.height * 3);
    for (let y = 0; y < source.height; y++)
        for (let x = 0; x < source.width; x++) {
            const pixel = source.get(x, y);
            if (pixel[3] === 0) continue;
            for (let dy = 0; dy < 3; dy++)
                for (let dx = 0; dx < 3; dx++)
                    out.set(x * 3 + dx, y * 3 + dy, pixel);
        }
    return out;
}

export function buildCharacterScaleReview() {
    const actors = [loadReference('hollowed'), loadReference('ashling')];
    const field = createWorldBoundaryWindow('flagstone', 'grass', {
        seed: 2211, state: 'reclaimed', role: 'left',
        boundaryX: 23, boundaryY: 128, originX: 0, originY: 0,
        width: 384, height: 256
    });
    const scene = field.albedo.clone(); // Existing approved terrain source; never mutate it.
    const props = [
        {kind: 'grass-medium', variant: 1, x: 126, y: 188},
        {kind: 'rock-small', variant: 2, x: 169, y: 188},
        {kind: 'rock-cluster', variant: 1, x: 216, y: 188},
        {kind: 'grass-tall', variant: 1, x: 264, y: 188}
    ];
    // Ground contacts first, rear silhouette behind actor, foreground across feet.
    for (const layer of ['footprint', 'rear'])
        for (const p of props) drawProp(scene, p.kind, p.variant, p.x, p.y, layer);
    for (const actor of actors) drawReferenceFrame(scene, actor);
    for (const p of props) drawProp(scene, p.kind, p.variant, p.x, p.y, 'front');
    const metadata = {
        schema: 'wf32-character-scale-review.v1',
        kind: 'OFFLINE ORIGINAL ART COMPOSITION - NOT A LIVE HUNT SCREENSHOT',
        camera: '384x256 orthographic / native source pixels, nearest-neighbour',
        gameWorldPixelScale: PIXELS_PER_WORLD_UNIT,
        actorScale: 'exact Canvas runtime manifest worldSize at reference radius 11',
        actors: actors.map(a => ({
            kind: a.name, image: a.sourcePath, direction: a.spec.direction,
            frame: a.spec.frame, cell: a.clip.cell, renderedCellPixels: a.clip.worldSize,
            footAnchor: a.spec.anchor, sourceFootAnchor: a.clip.anchor
        })),
        props: props.map(p => ({
            ...p, projectedHeightPixels: makeEcology25DProp(p.kind, p.variant).geometry.projectedHeightPixels
        })),
        restrictions: 'No gameplay, physics, runtime renderer, terrain blend, or approved actor art changed.'
    };
    return {scene, enlarged: nearest3x(scene), metadata};
}
export function writeCharacterScaleReview(outputDirectory) {
    mkdirSync(outputDirectory, {recursive:true});
    const {scene, enlarged, metadata} = buildCharacterScaleReview();
    for (const [name, image] of [
        ['character-scale-native.png', scene],
        ['character-scale-3x.png', enlarged]
    ]) writeFileSync(join(outputDirectory, name), encodePng(image.width, image.height, image.data));
    writeFileSync(join(outputDirectory, 'character-scale-manifest.json'),
        JSON.stringify(metadata, null, 2) + '\n');
    return metadata;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    console.log(JSON.stringify(writeCharacterScaleReview(
        process.argv[2] || 'docs/art/previews/wf32-character-scale'
    ), null, 2));
