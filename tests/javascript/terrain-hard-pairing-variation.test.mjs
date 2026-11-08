import test from 'node:test';
import assert from 'node:assert/strict';
import { createHardPairingWindow } from '../../tools/art/prototypes/terrain-hard-pairings.mjs';
import { buildHardPairingRelief } from '../../tools/art/prototypes/terrain-hard-pairing-relief.mjs';
import { buildHardPairingVariationReview } from '../../tools/art/prototypes/build-hard-pairing-review.mjs';

const config = {seed: 2111, originX: 0, originY: 0,
    width: 128, height: 128, role: 'left', boundaryX: 64, boundaryY: 64};
const pairs = [['flagstone', 'cobble'], ['cobble', 'brick'], ['brick', 'flagstone']];

test('all three paired hard materials lose genuine source stones as wear advances', () => {
    for (const [a, b] of pairs) {
        const counts = ['intact', 'broken', 'reclaimed'].map(state => {
            const field = createHardPairingWindow(a, b, {...config, state});
            assert.ok(field.sourceTags.includes(0));
            assert.ok(field.sourceTags.includes(1));
            assert.ok(field.sourceTags.includes(2));
            return field.sourceTags.filter(Boolean).length;
        });
        assert.ok(counts[0] > counts[1], `${a}/${b}: broken should expose more soil`);
        assert.ok(counts[1] > counts[2], `${a}/${b}: reclaimed should expose more soil`);
    }
});

test('distinct seeds vary composition without changing deterministic world-coordinate source identity', () => {
    for (const [a, b] of pairs) {
        const build = seed => createHardPairingWindow(a, b, {...config, seed, state: 'worn'});
        const first = build(2111), second = build(4709), third = build(8933);
        const replay = build(2111);
        assert.deepEqual(first.albedo.data, replay.albedo.data);
        assert.deepEqual(first.sourceTags, replay.sourceTags);
        assert.notDeepEqual(first.albedo.data, second.albedo.data);
        assert.notDeepEqual(second.albedo.data, third.albedo.data);
        assert.notDeepEqual(first.originalIds, third.originalIds);
    }
});

test('all wear levels retain true stone masks and source-only elevation candidates', () => {
    for (const [a, b] of pairs) {
        for (const state of ['intact', 'broken', 'reclaimed']) {
            const field = createHardPairingWindow(a, b, {...config, state});
            const relief = buildHardPairingRelief(field);
            const facePixels = field.sourceTags.filter(Boolean).length;
            const counted = relief.candidateCasterFootprints.reduce((sum, candidate) =>
                sum + candidate.pixelCount, 0);
            assert.equal(counted, facePixels);
            assert.equal(relief.casterAlpha.count(), facePixels);
            assert.ok(relief.candidateCasterFootprints.every(candidate => candidate.spans.length > 0));
            assert.match(relief.status, /NO G GEOMETRY/);
        }
    }
});

test('H3 review compares three wear levels and independent seeds at native and pixel-inspection scale', () => {
    const result = buildHardPairingVariationReview();
    assert.equal(result.manifest.schema, 'wf32-hard-pairing-variation-review.v1');
    assert.equal(result.reviews.length, 2);
    assert.match(result.manifest.status, /NOT LIVE AR3, DEPTH, G SHADOWS OR PHYSICS/);
    for (const series of result.reviews) {
        assert.equal(series.scene.width, 768);
        assert.equal(series.scene.height, 672);
        assert.equal(series.enlarged.width, 2304);
        assert.equal(series.enlarged.height, 2016);
        assert.equal(series.panels.length, 9);
        assert.deepEqual(series.scene.get(278, 305), series.enlarged.get(834, 915));
        assert.ok(series.panels.every(panel => panel.stonePixelsPrimary > 0 &&
            panel.stonePixelsSecondary > 0 && panel.infillPixels > 0));
    }
    const worn = result.manifest.series.find(s => s.name === 'degradation');
    assert.deepEqual([...new Set(worn.panels.map(p => p.state))],
        ['intact', 'broken', 'reclaimed']);
    assert.equal(new Set(worn.panels.map(p => p.seed)).size, 1);
    const seeds = result.manifest.series.find(s => s.name === 'seeds');
    assert.deepEqual([...new Set(seeds.panels.map(p => p.seed))], [2111, 4709, 8933]);
    assert.equal(new Set(seeds.panels.map(p => p.state)).size, 1);
    assert.equal(new Set(seeds.panels.map(p => p.sourceAlbedoSha256)).size, 9);
});
