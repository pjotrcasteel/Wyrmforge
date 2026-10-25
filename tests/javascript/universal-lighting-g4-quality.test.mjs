import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFramebufferSize, nextAdaptiveQuality } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/g4-light-budget.js';

test('G4 preserves legacy 390px landscape sampling', () => {
    assert.deepEqual(computeFramebufferSize(1170, 780, 2048), { width: 390, height: 260 });
});
test('G4 bounds very tall mobile framebuffers without distorting aspect ratio', () => {
    const result = computeFramebufferSize(390, 3000, 1024);
    assert.ok(result.width <= 1024 && result.height <= 1024);
    assert.ok(Math.abs(result.width / result.height - 390 / 3000) < .002);
});
test('G4 handles invalid canvas dimensions safely', () => {
    const result = computeFramebufferSize(0, NaN, 64);
    assert.ok(result.width >= 1 && result.height >= 1);
});
test('G4 requires three slow windows to step down', () => {
    let state = { quality: 'high', slowSamples: 0, fastSamples: 0 };
    for (let i = 0; i < 2; i++) {
        state = nextAdaptiveQuality(state.quality, 30, state.slowSamples, state.fastSamples);
        assert.equal(state.quality, 'high');
    }
    state = nextAdaptiveQuality(state.quality, 30, state.slowSamples, state.fastSamples);
    assert.equal(state.quality, 'medium');
});
test('G4 requires twelve fast windows to step up and never auto-enters diagnostic', () => {
    let state = { quality: 'medium', slowSamples: 0, fastSamples: 0 };
    for (let i = 0; i < 12; i++)
        state = nextAdaptiveQuality(state.quality, 7, state.slowSamples, state.fastSamples);
    assert.equal(state.quality, 'high');
    for (let i = 0; i < 12; i++)
        state = nextAdaptiveQuality(state.quality, 7, state.slowSamples, state.fastSamples);
    assert.equal(state.quality, 'high');
});
test('G4 does not change diagnostic quality', () => {
    assert.equal(nextAdaptiveQuality('diagnostic', 50).quality, 'diagnostic');
});
