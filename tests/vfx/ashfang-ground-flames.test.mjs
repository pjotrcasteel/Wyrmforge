import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ashfangGroundFireFrame, drawAshfangGroundFires, preloadAshfangGroundFlames }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ashfang-ground-flames.js';

test('only C# burning patches show flames, cooled scars never do', () => {
    assert.equal(ashfangGroundFireFrame({ id: 2, burning: false, ageSeconds: 0 }), -1);
    assert.equal(ashfangGroundFireFrame({ id: 2, burning: true, ageSeconds: -1 }), -1);
    assert.equal(ashfangGroundFireFrame({ id: 2, burning: true, ageSeconds: NaN }), -1);
    assert.equal(ashfangGroundFireFrame({ id: 2, burning: true, ageSeconds: 0 }), 2);
});
test('frame selection stays inside the 16 authored frames at all ages', () => {
    for (let ms = 0; ms < 2800; ms += 9) {
        const frame = ashfangGroundFireFrame({ id: 25, burning: true, ageSeconds: ms / 1000 });
        assert.ok(frame >= 0 && frame < 16, String(frame));
    }
});
test('reduced motion shows a stable frame', () => {
    assert.equal(ashfangGroundFireFrame({ id: 9, burning: true, ageSeconds: 0.1 }, true), 4);
    assert.equal(ashfangGroundFireFrame({ id: 9, burning: true, ageSeconds: 2.4 }, true), 4);
});
test('without an atlas, the real damaging radius is still drawn', async () => {
    assert.equal(await preloadAshfangGroundFlames(), false);
    const circles = [];
    const ctx = {
        globalAlpha: 1, save() {}, restore() {}, translate() {}, beginPath() {}, ellipse() {}, fill() {}, fillRect() {},
        arc(x, y, radius) { circles.push(radius); }, stroke() {}
    };
    drawAshfangGroundFires(ctx, { ashfangGroundFires: [
        { id: 1, x: 20, y: 50, z: 12, radius: 34, ageSeconds: .2, burning: true },
        { id: 2, x: 70, y: 50, z: 12, radius: 34, ageSeconds: 3.5, burning: false },
    ] });
    assert.deepEqual(circles, [34], 'Only hot fire gets a damaging boundary.');
});
test('null snapshots and invalid radii are safe', () => {
    const ctx = { save() { assert.fail('invalid input should not draw'); } };
    drawAshfangGroundFires(ctx, null);
    drawAshfangGroundFires(ctx, { ashfangGroundFires: [{ x: 2, y: 4, radius: 0, burning: true }] });
});

test('physical fuel changes ember intensity without altering the C# danger boundary', () => {
    function render(fuel, burning = true, reducedMotion = false) {
        const embers = [];
        const arcs = [];
        const ctx = {
            globalAlpha: 1, save() {}, restore() {}, translate() {}, beginPath() {}, ellipse() {}, fill() {},
            fillRect(x, y, width, height) { embers.push([x, y, width, height]); },
            arc(x, y, radius) { arcs.push(radius); }, stroke() {},
        };
        drawAshfangGroundFires(ctx, { ashfangGroundFires: [{
            id: 4, x: 100, y: 60, z: 3, radius: 34, ageSeconds: burning ? .6 : 4.5,
            burning, fuel, hotSeconds: fuel === 'wood' ? 3.5 : 1.15, visibleSeconds: 9,
        }] }, reducedMotion);
        return { embers, arcs };
    }
    assert.equal(render('wood').embers.length, 8);
    assert.equal(render('damporganic').embers.length, 2);
    assert.deepEqual(render('wood').arcs, [34]);
    assert.deepEqual(render('wood', false).arcs, []);
    assert.equal(render('wood', false).embers.length, 0);
    assert.equal(render('wood', true, true).embers.length, 0);
});
