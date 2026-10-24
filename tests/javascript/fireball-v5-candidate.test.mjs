import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(
    new URL('../../art/source/spells/fireball/manifest.json', import.meta.url), 'utf8'));
const candidate = manifest.candidates?.['core-original'];
const root = new URL('../../', import.meta.url);

test('unapproved base V5 source is present but never promoted into runtime artwork', () => {
    assert.equal(manifest.status, 'awaiting-authored-source');
    assert.deepEqual(manifest.assets, {});
    assert.equal(candidate?.status, 'direction-accepted-not-owner-approved');
    assert.equal(candidate.runtimeEnabled, true);
    assert.equal(candidate.integrationMode, 'legacy-hunt-canvas-sprite-only-draft-pr');
    assert.equal(candidate.previewStatus, 'in-draft-pr-awaiting-real-320-390-gameplay-review');
    assert.equal(candidate.sourceIncluded, true);
    assert.equal(candidate.rendersIncluded, true);
    assert.equal(candidate.universalLightingBlockedOn, 'shared-gpu-lighting-pr-332-complete-merged-and-validated');
    assert.equal(candidate.frames, 16);
    assert.deepEqual(candidate.frameSize, [120, 72]);
    assert.deepEqual(candidate.anchor, [87, 36]);
    assert.equal(candidate.worldSize, 'pending-gameplay-scale-review');
    assert.equal(existsSync(new URL(candidate.sourceGenerator, root)), true);
    assert.equal(Object.keys(candidate.generatedChannels).length, 5);
    assert.equal(existsSync(new URL(candidate.generatedEditableSheet, root)), true);
    for (const channel of ['albedo', 'emissive', 'normal', 'height', 'cutout']) {
        assert.match(candidate.generatedChannels[channel], /\.png$/);
        assert.equal(existsSync(new URL(candidate.generatedChannels[channel], root)), true);
    }
});
