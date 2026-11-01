import test from 'node:test';
import assert from 'node:assert/strict';
import { createMasonrySurface } from '../../tools/art/prototypes/wet-forest-masonry.mjs';
import { classifyStoneInstances, makeBoundaryMask, blendWorldPatch, makeSoftField, createBoundaryReview, buildLightingMaps,
    cutReviewInto32 } from '../../tools/art/prototypes/terrain-material-grammar.mjs';
import { Bitmap } from '../../tools/art/lib/painter.mjs';

for (const family of ['flagstone', 'cobble']) {
    test(`${family} stone IDs survive intentionally broken or invisible outlines`, () => {
        const { bitmap, stoneIds } = createMasonrySurface(family, 197);
        assert.equal(stoneIds.length, 65536);
        assert.deepEqual(createMasonrySurface(family, 197).stoneIds, stoneIds);
        const topology = classifyStoneInstances(bitmap, stoneIds);
        assert.ok(topology.components.length > 40);
        const recolored = bitmap.clone();
        for (let y = 0; y < 256; y += 3) for (let x = 0; x < 256; x += 3)
            recolored.set(x, y, '#191d1a'); // arbitrary visual edits cannot change stone identity
        assert.deepEqual(classifyStoneInstances(recolored, stoneIds).ids, topology.ids);
        assert.deepEqual(classifyStoneInstances(recolored, stoneIds).components.map(c => c.size),
            topology.components.map(c => c.size));
        // Stone identities must continue through 32px atlas cuts.
        assert.ok(Array.from(stoneIds).some((id, i) => i % 256 === 31 && id && id === stoneIds[i + 1]));
    });

    test(`${family} still disappears as whole stones on both edge orientations`, () => {
        const { bitmap, stoneIds } = createMasonrySurface(family, 143);
        const topology = classifyStoneInstances(bitmap, stoneIds);
        const soil = makeSoftField('soil', 143);
        for (const direction of ['left', 'top']) {
            const mask = makeBoundaryMask(direction, 143);
            const result = blendWorldPatch(bitmap, soil, mask, { policy: 'whole-stone-erosion', stoneInstances: topology });
            let removed = 0, retained = 0;
            for (const stone of topology.components) {
                const keep = stone.points.every(index => mask[index] === 1);
                assert.equal(Boolean(result.keptStones[stone.id]), keep, `${family}: ${direction} stone ${stone.id}`);
                for (const index of stone.points) assert.equal(result.owner[index], Number(keep));
                if (keep) retained++; else removed++;
            }
            assert.ok(removed > 0 && retained > 0, `${family} ${direction} must retain and remove stones`);
        }
    });
}

test('lighting output still cuts into identical native 32px cells after line cleanup', () => {
    const review = createBoundaryReview({ primary: 'flagstone', secondary: 'grass', direction: 'left', seed: 143 });
    const maps = buildLightingMaps(review);
    for (const source of [maps.albedo, maps.normal, maps.roughnessMap]) {
        const rebuilt = new Bitmap(256, 256);
        for (const cell of cutReviewInto32(source)) rebuilt.blit(cell.tile, cell.col * 32, cell.row * 32);
        assert.deepEqual(rebuilt.data, source.data);
    }
});
