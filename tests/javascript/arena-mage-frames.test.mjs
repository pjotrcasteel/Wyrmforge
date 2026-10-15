import test from 'node:test';
import assert from 'node:assert/strict';
import { mageFrameKey, magePixelFrames, drawMagePixelFrame } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-mage-frames.js';

test('all cast phases select actual individually authored mage animation silhouettes', () => {
    assert.equal(mageFrameKey(null), 'idle');
    assert.equal(mageFrameKey({ progress: 0 }), 'windup');
    assert.equal(mageFrameKey({ progress: .21 }), 'windup');
    assert.equal(mageFrameKey({ progress: .22 }), 'release');
    assert.equal(mageFrameKey({ progress: .25, surge: true }), 'surgeRelease');
    assert.equal(mageFrameKey({ progress: .48, surge: true }), 'followThrough');
    assert.equal(mageFrameKey({ progress: .83 }), 'followThrough');
    assert.equal(mageFrameKey({ progress: 1 }), 'idle');
    for (const [name, frame] of Object.entries(magePixelFrames)) {
        assert.ok(frame.length >= 18, name);
        assert.ok(frame.some(([part]) => part === 'collar'), name);
        assert.ok(frame.some(([part]) => part === 'hood'), name);
        assert.ok(frame.some(([part]) => part === 'face'), name);
        assert.ok(frame.every(([, x, y, w, h]) => Number.isInteger(x) && Number.isInteger(y) &&
            w > 0 && h > 0 && x >= -16 && x + w <= 16 && y >= -18 && y + h <= 18), name);
    }
    const silhouettes = Object.values(magePixelFrames).map(frame => JSON.stringify(frame));
    assert.equal(new Set(silhouettes).size, 5, 'Windup, release, follow-through, Surge and idle must be different drawings.');
});

test('drawing all frames retains the slate-blue mage, pale collar and readable dark face', () => {
    for (const name of Object.keys(magePixelFrames)) {
        const calls = [];
        const ctx = { fillRect(...args) { calls.push({ args, color: this.fillStyle }); } };
        assert.equal(drawMagePixelFrame(ctx, name), magePixelFrames[name].length);
        assert.ok(calls.some(call => call.color === '#485b73'), name);
        assert.ok(calls.some(call => call.color === '#c8c6b8'), name);
        assert.ok(calls.some(call => call.color === '#293241'), name);
        assert.ok(!calls.some(call => call.color === '#ffffff'), name);
    }
});
