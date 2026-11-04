// Ground cover baked into the terrain painting: twigs, leaf litter, grass tufts, flowers and mushrooms, chosen from the gothic forest kit
// by a hash of the cell and the Wyrm Influence band. Purely cosmetic: it is skipped on subdivided (dug or chipped) columns, below ground
// level and on rock, so excavation clears it exactly where the terrain changed. Every sprite fits inside one 32 px face.
import { forestKit, kitNames, spriteSource } from './forest-kit.js';

const SOIL = 0, ASH = 1;
const FACE = 32;

/** Murmur-style finaliser: well mixed 32-bit hash of a cell and the arena's visual seed. */
export function cellHash(column, row, seed, salt) {
    let h = (Math.imul(column + 11, 0x9E3779B1) ^ Math.imul(row + 7, 0x85EBCA6B) ^ Math.imul((seed | 0) + salt, 0xC2B2AE35)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}
const unit = h => h / 4294967296;

/** Which decal (if any) a cell carries: `{ name, u, v }` with the placement fractions, or null. Pure and deterministic. */
export function groundDecal(names, band, material, height, column, row, seed) {
    if ((material !== SOIL && material !== ASH) || height < 0 || height > 12) return null;
    const roll = unit(cellHash(column, row, seed, 1));
    const pick = (list, hash) => list[hash % list.length];
    const place = (name, salt) => ({ name, u: unit(cellHash(column, row, seed, salt)), v: unit(cellHash(column, row, seed, salt + 1)) });
    // One decal per cell keeps the ground calm; the rolls partition 0..1 so densities add up.
    const tuft = [.08, .08, .03, 0][band], twig = [.04, .04, .05, .05][band], leaf = [.02, .05, .02, 0][band];
    const flower = [.012, .004, 0, 0][band], fox = [.004, 0, 0, 0][band], mushroom = [.004, .003, 0, 0][band];
    let edge = tuft;
    if (roll < edge) return place(pick(band === 0 ? names.tuftLive : names.tuftDry, cellHash(column, row, seed, 3)), 4);
    if (roll < (edge += twig)) return place(pick(names.twig, cellHash(column, row, seed, 5)), 6);
    if (roll < (edge += leaf)) return place(pick(names.leaf, cellHash(column, row, seed, 7)), 8);
    if (roll < (edge += flower)) return place(pick(names.flower, cellHash(column, row, seed, 9)), 10);
    if (roll < (edge += fox)) return place(pick(names.foxglove, cellHash(column, row, seed, 11)), 12);
    if (roll < (edge + mushroom)) return place(pick(names.mushroom, cellHash(column, row, seed, 13)), 14);
    return null;
}

function decalNames(loaded) {
    return loaded.decalNames ??= {
        tuftLive: kitNames(loaded, 'decal.tuft.live.'), tuftDry: kitNames(loaded, 'decal.tuft.dry.'), twig: kitNames(loaded, 'decal.twig.'),
        leaf: kitNames(loaded, 'decal.leaf.'), flower: kitNames(loaded, 'decal.flower.'), foxglove: kitNames(loaded, 'decal.foxglove.', 30),
        mushroom: kitNames(loaded, 'decal.mushroom.'),
    };
}

/** Paints the decal of one whole terrain column onto its top face (`top` is the face rectangle). Returns how many were drawn. */
export function drawGroundDecals(ctx, frame, band, column, row, height, material, top) {
    const loaded = forestKit();
    if (!loaded) return 0;
    const decal = groundDecal(decalNames(loaded), Math.min(3, Math.max(0, band | 0)), material, height, column, row, frame?.visualSeed ?? 0);
    const sprite = decal && loaded.sprites[decal.name];
    if (!sprite) return 0;
    const x = top.x + Math.floor(decal.u * Math.max(1, FACE - sprite.w)), y = top.y + Math.floor(decal.v * Math.max(1, FACE - sprite.h));
    ctx.drawImage(loaded.image, ...spriteSource(sprite), x, y, sprite.w, sprite.h);
    return 1;
}
