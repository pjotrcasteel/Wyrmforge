import test from 'node:test';
import assert from 'node:assert/strict';
import { undergrowthField, undergrowthAt, stoneChanceAt, ROAD_CLEAR_CELLS } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-undergrowth.js';

const columns = 32, rows = 60;
const make = () => {
    const surface = new Array(columns * rows).fill(0), material = new Array(columns * rows).fill(0);
    for (const c of [20, 21]) material[20 * columns + c] = 4;           // a pair of trunks
    for (let c = 2; c < 8; c++) { surface[40 * columns + c] = 16; material[40 * columns + c] = 2; } // a cliff
    // A straight road down column 10 (1/16 cell units, cell centres at +8).
    const road = []; for (let r = 0; r < rows; r++) road.push(10 * 16 + 8, r * 16 + 8);
    return { columns, rows, surface, material, road, trunks: new Map([[20 * columns + 20, 20], [20 * columns + 21, 20]]), boulders: new Map() };
};

test('undergrowth is thick beside the trees, thins into the meadow and is a trace far from everything', () => {
    const frame = make(), at = (c, r) => undergrowthAt(frame, c, r);
    assert.ok(at(19, 20) > .9, 'right beside a trunk');
    assert.ok(at(24, 20) < at(22, 20) && at(26, 20) < at(24, 20), 'it thins with distance');
    assert.ok(at(26, 20) > 0 && at(26, 20) < .15);
    assert.ok(at(30, 55) > 0 && at(30, 55) <= .03, 'open meadow keeps a trace');
});

test('the road and its verge stay bare', () => {
    const frame = make();
    for (let r = 0; r < rows; r++) for (let c = 10 - Math.floor(ROAD_CLEAR_CELLS); c <= 10 + Math.floor(ROAD_CLEAR_CELLS); c++) assert.equal(undergrowthAt(frame, c, r), 0, `${c},${r}`);
    assert.ok(undergrowthAt(frame, 16, 30) > undergrowthAt(frame, 13, 30), 'cover returns away from the road');
});

test('stones gather at the foot of rock and never on the road, trunks or rock itself', () => {
    const frame = make();
    assert.equal(stoneChanceAt(frame, 4, 41) > .4, true, 'right below the cliff');
    assert.ok(stoneChanceAt(frame, 4, 43) > 0 && stoneChanceAt(frame, 4, 43) < .3, 'fading out');
    assert.equal(stoneChanceAt(frame, 4, 47), 0, 'none far from rock');
    assert.equal(stoneChanceAt(frame, 10, 41), 0, 'none on the road');
    assert.equal(undergrowthAt(frame, 20, 20), 0, 'nothing grows on a trunk');
    assert.equal(undergrowthAt(frame, 4, 40), 0, 'nothing grows on rock');
});

test('the field is cached on the frame and tolerates cells outside it', () => {
    const frame = make();
    assert.equal(undergrowthField(frame), undergrowthField(frame));
    assert.equal(undergrowthAt(frame, -1, 3), 0);
    assert.equal(undergrowthAt(null, 1, 1), 0);
});

test('excavation never moves the original undergrowth and pebble placement around a hit', () => {
    const original = make();
    const beforeCover = Array.from(undergrowthField(original));
    const beforeStone = stoneChanceAt(original, 4, 41);
    const damagedMaterial = [...original.material];
    const damagedSurface = [...original.surface];
    // A tall cliff column became loose soil at the crater, but the original scene dressing is fixed.
    damagedMaterial[40 * columns + 4] = 0;
    damagedSurface[40 * columns + 4] = -12;
    const excavated = {
        ...original,
        material: damagedMaterial,
        surface: damagedSurface,
        baseMaterial: [...original.material],
        baseSurface: [...original.surface],
        coverField: undefined,
        rockNear: undefined,
        roadNear: undefined,
    };
    assert.deepEqual(Array.from(undergrowthField(excavated)), beforeCover);
    assert.equal(stoneChanceAt(excavated, 4, 41), beforeStone);
    assert.equal(undergrowthAt(excavated, 5, 41), undergrowthAt(original, 5, 41));
});
