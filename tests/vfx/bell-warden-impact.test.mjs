import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bellWardenImpactFrames, drawBellWardenImpact, preloadBellWardenImpact }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-bell-warden-impact.js';

test('impact starts on authoritative smash creation, not on the warning', () => {
    assert.deepEqual(bellWardenImpactFrames(null), { slam: -1, shatter: -1 });
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: 0 }), { slam: 0, shatter: 0 });
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: .14 }), { slam: 2, shatter: 2 });
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: -0.01 }), { slam: -1, shatter: -1 });
});
test('all 19 ground-slam and 18 rock-shatter frames are reachable, then stop', () => {
    const slam = new Set(); const shatter = new Set();
    for (let ms = 0; ms < 1500; ms++) {
        const result = bellWardenImpactFrames({ ageSeconds: ms / 1000 });
        if (result.slam >= 0) slam.add(result.slam);
        if (result.shatter >= 0) shatter.add(result.shatter);
    }
    assert.equal(slam.size, 19); assert.equal(shatter.size, 18);
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: 1.45 }), { slam: -1, shatter: -1 });
});
test('reduced motion caps the effect at a single strong frame', () => {
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: .15 }, true), { slam: 3, shatter: -1 });
    assert.deepEqual(bellWardenImpactFrames({ ageSeconds: .3 }, true), { slam: -1, shatter: -1 });
});
test('safe before atlas has loaded, including Node without Image API', async () => {
    assert.equal(await preloadBellWardenImpact(), false);
    drawBellWardenImpact({ drawImage: () => assert.fail('not loaded') }, { x: 10, y: 20, ageSeconds: .1 });
});
