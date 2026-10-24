import test from 'node:test';
import assert from 'node:assert/strict';
import { singleMaterialGroundBoard, groundReviewSnapshot, ROAD_REVIEW_SEEDS } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/ground-only-review.js';
import { singleRoadPlan, composeSingleRoadGround } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-single-road.js';
import { validateSnapshot } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const mapping = [['grass', 0], ['mud', 1], ['dirt', 3], ['marsh', 5]];
test('ground foundation starts with one uniform approved material and no old paving/scorched pixels', () => {
    for (const [name, index] of mapping) {
        const board = singleMaterialGroundBoard(name, 24, 24);
        assert.equal(board.length, 576);
        assert.ok(board.every(value => value === index));
    }
    assert.throws(() => singleMaterialGroundBoard('paving'), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('scorched'), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('trees'), /Invalid/);
});

test('single ground receives G1 lighting and has no scene props, fake normals, glow or collision', () => {
    for (const [name] of mapping) {
        const snapshot = validateSnapshot(groundReviewSnapshot(name, 'fire'));
        assert.deepEqual(snapshot.objects.map(o => o.id), ['ground']);
        assert.deepEqual(snapshot.materials.map(m => m.id), ['wet-forest-ground']);
        assert.equal(snapshot.objects[0].geometry, 'ground-plane');
        assert.equal(snapshot.objects[0].receivesLight, true);
        assert.equal(snapshot.objects[0].castsShadow, false);
        assert.equal(snapshot.objects[0].occluderGeometry, undefined);
        assert.equal(snapshot.materials[0].normal, undefined);
        assert.equal(snapshot.materials[0].roughnessMap, undefined);
        assert.equal(snapshot.materials[0].emissionIntensity, 0);
        assert.equal(snapshot.materials[0].albedo, 'wet-forest-'+name);
        assert.ok(snapshot.lights.some(l => l.id === 'fireball'));
    }
});

test('light-off ground obeys existing total-black world visibility contract', () => {
    const zero = validateSnapshot(groundReviewSnapshot('grass', 'zero'));
    assert.equal(zero.environment.ambient, 0);
    assert.equal(zero.environment.emission, false);
    assert.deepEqual(zero.lights, []);
    assert.equal(zero.objects.length, 1);
    const moon = validateSnapshot(groundReviewSnapshot('grass', 'moon'));
    assert.equal(moon.lights.length, 1);
    assert.equal(moon.lights[0].id, 'moon');
    const neutral = validateSnapshot(groundReviewSnapshot('grass', 'neutral'));
    assert.deepEqual(neutral.lights.map(l => l.id), ['studio-inspection']);
});

test('moving Fireball changes world light position without mutating material artwork', () => {
    const first = groundReviewSnapshot('dirt', 'fire', 0);
    const last = groundReviewSnapshot('dirt', 'fire', 1);
    assert.notDeepEqual(first.lights.find(l => l.id === 'fireball').position,
        last.lights.find(l => l.id === 'fireball').position);
    assert.deepEqual(first.materials, last.materials);
    assert.deepEqual(first.objects, last.objects);
    assert.throws(() => groundReviewSnapshot('grass', 'fire', 2), /Invalid/);
    assert.throws(() => singleMaterialGroundBoard('grass', -1, 3), /Invalid/);
});

test('one deterministic seeded road reaches the only primary exit without disconnected footprint cells', () => {
    for (const seed of [...ROAD_REVIEW_SEEDS, 0, -1205, 1777, 9031, 99999]) {
        const one = composeSingleRoadGround(seed, 48, 72);
        const two = composeSingleRoadGround(seed, 48, 72);
        assert.deepEqual(one.board, two.board, 'Same seed must reproduce material cells');
        assert.deepEqual(one.roadMask, two.roadMask, 'Same seed must reproduce traversal proposal');
        assert.deepEqual(one.plan, two.plan, 'Same seed must reproduce the path geometry');
        assert.equal(one.plan.exits, 1);
        assert.equal(one.plan.entrance.edge, 'north');
        assert.equal(one.plan.exit.edge, 'south');
        assert.equal(one.plan.entrance.x, one.plan.exit.x, 'A single north/south portal pair');
        assert.equal(one.plan.entrance.y, 0);
        assert.equal(one.plan.exit.y, 71);
        assert.ok(one.roadMask[one.plan.entrance.x] === 1);
        assert.ok(one.roadMask[71 * 48 + one.plan.exit.x] === 1);
        assert.ok(one.board.every(value => [0, 1, 3, 5].includes(value)), 'Never scatter paving or scorched');
        assert.equal(one.plan.spine.length, 72);
        assert.ok(one.plan.spine.every(x => x >= 48 * .24 && x <= 48 * .76));

        // Flood-fill only the semantic ROAD footprint, never all naturally-occurring dirt/mud.
        const visited = new Uint8Array(one.roadMask.length);
        const queue = [one.plan.entrance.x];
        visited[queue[0]] = 1;
        for (let head = 0; head < queue.length; head++) {
            const cell = queue[head], x = cell % 48, y = Math.floor(cell / 48);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= 48 || ny < 0 || ny >= 72) continue;
                const next = ny * 48 + nx;
                if (!visited[next] && one.roadMask[next]) { visited[next] = 1; queue.push(next); }
            }
        }
        assert.equal(visited[one.plan.exit.y * 48 + one.plan.exit.x], 1, 'Exit must be reachable from entrance');
        assert.equal(queue.length, one.roadMask.reduce((sum, n) => sum + n, 0), 'No disconnected road islands');
    }
});

test('straight and curved roads have distinctive seeded geometries but the same one-exit contract', () => {
    const straight = singleRoadPlan(1205, 48, 72);
    const winding = singleRoadPlan(1441, 48, 72);
    assert.equal(straight.style, 'straight');
    assert.equal(winding.style, 'winding');
    assert.equal(new Set(straight.spine).size, 1);
    assert.ok(new Set(winding.spine.map(x => x.toFixed(2))).size > 10, 'Curve must actually vary');
    assert.ok(Math.max(...winding.spine.map(x => Math.abs(x - winding.entrance.x))) > 1);
    assert.throws(() => groundReviewSnapshot('road', 'fire', .5, 42), /Invalid/);
    for (const seed of ROAD_REVIEW_SEEDS) {
        const s = validateSnapshot(groundReviewSnapshot('road', 'fire', .5, seed));
        assert.deepEqual(s.objects.map(o => o.id), ['ground']);
        assert.equal(s.materials[0].albedo, 'wet-forest-road-'+seed);
        assert.equal(s.materials[0].normal, undefined);
        assert.equal(s.objects[0].occluderGeometry, undefined);
    }
});

test('invalid route sizes and source-array mismatches fail without a phantom exit', () => {
    assert.equal(singleRoadPlan(1, 12, 12), null);
    assert.equal(singleRoadPlan(1.5, 48, 72), null);
    assert.equal(composeSingleRoadGround(1, 48, 72, new Uint8Array(10)), null);
});
