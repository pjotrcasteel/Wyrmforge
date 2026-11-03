import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groundDecal, drawGroundDecals, cellHash } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-decals.js';
import { useForestKit, kitNames } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/forest-kit.js';

const manifest = JSON.parse(readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/forest/forest-kit.json', import.meta.url), 'utf8'));
const kit = { sprites: manifest.sprites, image: { tag: 'atlas' } };
const names = {
    tuftLive: kitNames(kit, 'decal.tuft.live.'), tuftDry: kitNames(kit, 'decal.tuft.dry.'), twig: kitNames(kit, 'decal.twig.'), leaf: kitNames(kit, 'decal.leaf.'),
    flower: kitNames(kit, 'decal.flower.'), foxglove: kitNames(kit, 'decal.foxglove.', 30), mushroom: kitNames(kit, 'decal.mushroom.'),
};

test('every decal family exists in the kit and fits inside one 32 px terrain face', () => {
    for (const [family, list] of Object.entries(names)) {
        assert.ok(list.length > 0, `${family} is empty`);
        for (const name of list) assert.ok(manifest.sprites[name].w <= 32 && manifest.sprites[name].h <= 32, `${name} is larger than a face`);
    }
});

test('decals are deterministic, sparse, and absent on rock, lava, trunks, pits and cliffs', () => {
    const count = (band, material = 0, height = 0) => {
        let n = 0;
        for (let r = 0; r < 60; r++) for (let c = 0; c < 32; c++) {
            const a = groundDecal(names, band, material, height, c, r, 5), b = groundDecal(names, band, material, height, c, r, 5);
            assert.deepEqual(a, b);
            if (a) { n++; assert.ok(manifest.sprites[a.name], a.name); assert.ok(a.u >= 0 && a.u < 1 && a.v >= 0 && a.v < 1); }
        }
        return n;
    };
    const wet = count(0);
    assert.ok(wet > 150 && wet < 900, `calm, not busy: ${wet} of 1920 cells`);
    assert.equal(count(3, 0, 0) > 0, true);
    assert.equal(count(0, 2), 0, 'no ground cover on stone');
    assert.equal(count(0, 3), 0, 'none on lava');
    assert.equal(count(0, 4), 0, 'none on a trunk mound');
    assert.equal(count(0, 0, -4), 0, 'none in a pit');
    assert.equal(count(0, 0, 20), 0, 'none on a ridge');
    assert.ok(count(0) > count(3), 'the Wyrm has burned the ground cover away');
});

test('decals are drawn into the face of their own column and only once the kit has loaded', () => {
    const calls = [];
    const ctx = { drawImage: (...args) => calls.push(args) };
    const top = { x: 64, y: 96, width: 32, height: 32 };
    useForestKit(null);
    let drawn = 0;
    for (let r = 0; r < 60; r++) for (let c = 0; c < 32; c++) drawn += drawGroundDecals(ctx, { visualSeed: 5 }, 0, c, r, 0, 0, top);
    assert.equal(drawn, 0);
    useForestKit(kit);
    for (let r = 0; r < 60; r++) for (let c = 0; c < 32; c++) drawn += drawGroundDecals(ctx, { visualSeed: 5 }, 0, c, r, 0, 0, top);
    assert.equal(drawn, calls.length);
    assert.ok(drawn > 100);
    for (const [image, , , sw, sh, dx, dy, dw, dh] of calls) {
        assert.equal(image, kit.image);
        assert.ok(dx >= 64 && dx + dw <= 96 && dy >= 96 && dy + dh <= 128, 'inside the face');
        assert.deepEqual([dw, dh], [sw, sh], 'native pixels, never scaled');
    }
    useForestKit(null);
});

test('cell hashes are well mixed', () => {
    const seen = new Set();
    for (let r = 0; r < 60; r++) for (let c = 0; c < 32; c++) seen.add(cellHash(c, r, 7, 1));
    assert.ok(seen.size > 1900);
});
