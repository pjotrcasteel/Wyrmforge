import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createHardPairingWindow} from '../../tools/art/prototypes/terrain-hard-pairings.mjs';
import {buildHardPairingRelief} from '../../tools/art/prototypes/terrain-hard-pairing-relief.mjs';
import {buildHardPairingSourceBundle, HARD_PAIRING_BUNDLE_SCHEMA} from
    '../../tools/art/prototypes/export-hard-pairing-source-bundle.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('H4 exports all six directed source-only pairs with five exactly aligned 32px channels', () => {
    const {manifest, files} = buildHardPairingSourceBundle();
    assert.equal(manifest.schema, HARD_PAIRING_BUNDLE_SCHEMA);
    assert.equal(manifest.nativePixelTileSize, 32);
    assert.equal(manifest.pixelsPerWorldUnit, 48);
    assert.equal(manifest.pairs.length, 6);
    assert.equal(files.size, 37); // 5 PNG + one footprint per pair, plus manifest.
    assert.match(manifest.status, /NO PHYSICAL SHADOWS, AR3 WEIGHTS, RUNTIME GPU CACHE/);
    assert.deepEqual(manifest.ownership, {
        geography: 'AR3 C#', materialPlacement: 'AR4 after AR3 approval',
        lightingAndActualCasterGeometry: 'existing G engine', collision: 'C# gameplay / shared FXP'
    });

    const combinations = new Set();
    for (const pair of manifest.pairs) {
        combinations.add(pair.primary + ':' + pair.secondary);
        assert.notEqual(pair.primary, pair.secondary);
        assert.deepEqual(Object.keys(pair.channels), manifest.channels);
        for (const channel of Object.values(pair.channels)) {
            assert.deepEqual([channel.width, channel.height], [256, 192]);
            const png = files.get(channel.filename);
            assert.ok(png && png.subarray(1, 4).toString() === 'PNG');
            assert.equal(channel.sha256, sha256(png));
        }
        assert.equal(Object.values(pair.sourceCoveragePixels).reduce((a, b) => a + b), 256 * 192);
        assert.ok(Object.values(pair.sourceCoveragePixels).every(count => count > 0));
    }
    assert.equal(combinations.size, 6);
    const serialized = files.get('source-bundle-manifest.json').toString();
    assert.deepEqual(JSON.parse(serialized), manifest);
    assert.ok(serialized.endsWith('\n'));
});

test('H4 original-stone footprint files exactly reconstruct the candidate caster mask', () => {
    const {manifest, files} = buildHardPairingSourceBundle();
    for (const pair of manifest.pairs) {
        const reference = createHardPairingWindow(pair.primary, pair.secondary, manifest.provenance.recipe);
        const expected = buildHardPairingRelief(reference);
        const file = pair.candidateFootprints;
        assert.equal(sha256(files.get(file.filename)), file.sha256);
        const footprints = JSON.parse(files.get(file.filename).toString());
        assert.deepEqual(footprints.origin, [0, 0]);
        assert.deepEqual(footprints.dimensions, [256, 192]);
        assert.deepEqual(footprints.candidateCasterFootprints, expected.candidateCasterFootprints);
        assert.equal(file.stoneCount, expected.candidateCasterFootprints.length);
        const coverage = new Uint8Array(256 * 192);
        for (const stone of footprints.candidateCasterFootprints) {
            assert.ok(stone.worldRise > 0 && stone.worldRise < 1);
            for (const {y, startX, endX} of stone.spans) {
                for (let x = startX; x <= endX; x++) {
                    const i = y * 256 + x;
                    assert.equal(coverage[i]++, 0, 'One source footprint per stone pixel');
                    assert.equal(reference.originalIds[i], stone.originalStoneId);
                    assert.equal(reference.sourceTags[i], stone.sourceTag);
                }
            }
        }
        for (let i = 0; i < coverage.length; i++) {
            assert.equal(coverage[i], reference.sourceTags[i] === 0 ? 0 : 1);
        }
    }
});

test('H4 exporter replays exact PNGs and manifests, without selecting unapproved H3 extremes', () => {
    const first = buildHardPairingSourceBundle();
    const replay = buildHardPairingSourceBundle();
    assert.deepEqual(first.manifest, replay.manifest);
    assert.equal(first.manifest.provenance.recipe.state, 'worn');
    assert.equal(first.manifest.provenance.recipe.seed, 2111);
    assert.equal(first.manifest.provenance.recipe.width, 256);
    for (const [filename, bytes] of first.files) {
        assert.deepEqual(bytes, replay.files.get(filename), filename);
    }
});
