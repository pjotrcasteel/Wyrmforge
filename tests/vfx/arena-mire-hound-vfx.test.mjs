import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mireHoundDustFrame, mireHoundContactFrame, drawMireHoundGround, drawMireHoundContact }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-mire-hound-vfx.js';

const fx = (phase, progress, pounceLanded = false) => ({ phase, progress, pounceLanded, directionX: 1, directionY: 0 });

test('no dust before committed charge or while stalking', () => {
    assert.equal(mireHoundDustFrame(fx('Stalk', 1)), -1);
    assert.equal(mireHoundDustFrame(fx('Windup', .69)), -1);
    assert.ok(mireHoundDustFrame(fx('Windup', .8)) >= 0);
});
test('dust frames remain inside the authored atlas', () => {
    for (let i = 0; i <= 100; i++) {
        for (const phase of ['Windup', 'Pounce', 'Recover']) {
            const frame = mireHoundDustFrame(fx(phase, i / 100));
            assert.ok(frame >= -1 && frame < 13, phase + ': ' + frame);
        }
    }
});
test('missed/cancelled attacks cannot trigger successful bite effects', () => {
    for (const phase of ['Stalk', 'Windup', 'Pounce', 'Retreat'])
        assert.equal(mireHoundContactFrame(fx(phase, .4, true)), -1);
    assert.equal(mireHoundContactFrame(fx('Recover', .2, false)), -1);
    assert.equal(mireHoundContactFrame(fx('Recover', .2, true)), 2);
    assert.equal(mireHoundContactFrame(fx('Recover', 1, true)), 10);
});
test('no renderer crash before the optional atlas loads', () => {
    const ctx = { drawImage: () => assert.fail('should not draw until loaded') };
    const enemy = { kind: 1, x: 100, y: 100, z: 0, radius: 13, mireHoundVfx: fx('Recover', .5, true) };
    drawMireHoundGround(ctx, enemy);
    drawMireHoundContact(ctx, enemy);
});
