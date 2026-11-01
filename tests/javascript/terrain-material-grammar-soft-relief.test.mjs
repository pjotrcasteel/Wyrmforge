import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSoftField, createBoundaryReview, buildLightingMaps,
    cutReviewInto32, GRAMMAR_VERSION } from '../../tools/art/prototypes/terrain-material-grammar.mjs';
import { Bitmap } from '../../tools/art/lib/painter.mjs';

function longDarkStrokes(tile) {
    let long = 0;
    for (let y = 1; y < 255; y++) {
        let run = 0;
        for (let x = 0; x < 256; x++) {
            const lum = tile.get(x, y)[1];
            const upper = tile.get(x, y - 1)[1];
            const lower = tile.get(x, y + 1)[1];
            const isolated = upper - lum >= 10 && lower - lum >= 10;
            if (isolated) run++;
            else { if (run >= 12) long++; run = 0; }
        }
        if (run >= 12) long++;
    }
    return long;
}

test('soft fields are deterministic and avoid continuous dark ink-line artifacts', () => {
    assert.equal(GRAMMAR_VERSION, 'wf32-terrain-grammar.v1.3');
    for (const material of ['grass', 'soil', 'mud']) {
        const source = makeSoftField(material, 713);
        assert.deepEqual(source.data, makeSoftField(material, 713).data, material);
        assert.equal(longDarkStrokes(source), 0, `${material} contains graphic ink-line strokes`);
    }
});

test('soft terrain maintains broad variation without flat monotone tiles', () => {
    for (const material of ['grass', 'soil', 'mud']) {
        const source = makeSoftField(material, 419);
        const means = [];
        for (let gy=0; gy<8; gy++) for (let gx=0; gx<8; gx++) {
            let sum=0;
            for (let y=gy*32; y<gy*32+32; y++)
                for (let x=gx*32; x<gx*32+32; x++) sum+=source.get(x,y)[1];
            means.push(sum/1024);
        }
        assert.ok(Math.max(...means)-Math.min(...means)>8, `${material} has insufficient large variation`);
        assert.ok(new Set(means.map(n=>Math.round(n))).size>=8, `${material} lacks varied clusters`);
    }
});

test('native 32px albedo, normal and roughness maps reconstruct exactly', () => {
    const review = createBoundaryReview({primary:'grass',secondary:'soil',direction:'top',seed:319});
    const maps = buildLightingMaps(review);
    for (const source of [maps.albedo, maps.normal, maps.roughnessMap]) {
        const rebuilt = new Bitmap(256,256);
        for (const {row,col,tile} of cutReviewInto32(source)) rebuilt.blit(tile,col*32,row*32);
        assert.deepEqual(rebuilt.data,source.data);
    }
});
