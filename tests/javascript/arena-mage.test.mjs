import test from 'node:test';
import assert from 'node:assert/strict';
import { drawMage, magePose } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-mage.js';

function fakeContext() {
    const calls = [];
    const ctx = { calls };
    for (const name of ['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'fill', 'fillRect'])
        ctx[name] = (...args) => calls.push([name, ...args]);
    return ctx;
}

test('approved mage silhouette renders as a cloaked figure with a staff, including barrier and hit states', () => {
    const ctx = fakeContext();
    for (const hit of [true, false]) for (const barrier of [true, false]) {
        ctx.calls.length = 0;
        assert.doesNotThrow(() => drawMage(ctx, { x: 80, y: 80, radius: 12, barrier }, null, hit, false));
        assert.ok(ctx.calls.filter(([name]) => name === 'fillRect').length >= 16);
        assert.equal(ctx.calls[0][0], 'save');
        assert.equal(ctx.calls[ctx.calls.length - 1][0], 'restore');
    }
});

test('school and rank retain motion identity without changing movement or cooldown inputs', () => {
    const base = magePose({ angle: Math.PI / 3, rank: 1, progress: .36 });
    const mastered = magePose({ angle: Math.PI / 3, rank: 3, progress: .36 });
    const reduced = magePose({ angle: Math.PI / 3, rank: 3, progress: .36 }, true);
    assert.equal(base.aim, Math.PI / 3);
    assert.ok(mastered.reach > base.reach);
    assert.equal(reduced.sweep, 0);
    assert.ok(reduced.reach < mastered.reach);
    assert.equal(magePose({ angle: 0, rank: 3, progress: 1 }).active, false);
    assert.equal(magePose(null).active, false);
});

test('the player casting preview stays deterministic and is fully restored', () => {
    const player = { x: 12, y: 35, radius: 10, barrier: false };
    const cast = { angle: -1.7, rank: 2, progress: .33, spell: 1 };
    const a = fakeContext();
    const b = fakeContext();
    drawMage(a, player, cast, false);
    drawMage(b, player, cast, false);
    assert.deepEqual(a.calls, b.calls);
    assert.doesNotThrow(() => drawMage(fakeContext(), player, cast, false, true));
});


test('staff runes show charge from the authoritative player snapshot, not animation time', () => {
    const player = { x: 12, y: 35, radius: 12, barrier: false };
    const low = fakeContext();
    const full = fakeContext();
    drawMage(low, { ...player, focusCharge: 0 }, null);
    drawMage(full, { ...player, focusCharge: 3 }, null);
    assert.deepEqual(low.calls.filter(([method]) => method === 'fillRect').map(row => row.slice(1)),
        full.calls.filter(([method]) => method === 'fillRect').map(row => row.slice(1)));
    assert.doesNotThrow(() => drawMage(fakeContext(), { ...player, focusCharge: -4 }, null));
    assert.doesNotThrow(() => drawMage(fakeContext(), { ...player, focusCharge: 20 }, null));
});

test('actual light direction and family shade one side of the mage, never movement state', () => {
    const player = { x: 80, y: 70, radius: 12 };
    const idle = fakeContext();
    const fire = fakeContext();
    const frost = fakeContext();
    drawMage(idle, player, null);
    drawMage(fire, player, null, false, false, { intensity: .6, color: [255, 160, 91], sourceX: 50 });
    drawMage(frost, player, null, false, false, { intensity: .6, color: [175, 225, 244], sourceX: 110 });
    assert.ok(fire.calls.filter(([name]) => name === 'fillRect').length > idle.calls.filter(([name]) => name === 'fillRect').length);
    assert.notDeepEqual(fire.calls, frost.calls);
    assert.doesNotThrow(() => drawMage(fakeContext(), player, null, false, true,
        { intensity: .7, color: [255, 160, 91], sourceX: 20 }));
});

test('actual cast stages select visibly different authored body frames and articulated staff grips', () => {
    const player = { x: 100, y: 100, radius: 12, barrier: false };
    const sample = (progress, surge = false) => {
        const ctx = fakeContext();
        drawMage(ctx, player, { spell: 1, rank: 3, angle: 0, progress, surge }, false, true);
        return ctx.calls;
    };
    const windup = sample(.1);
    const release = sample(.3);
    const recovery = sample(.65);
    const surged = sample(.3, true);
    assert.notDeepEqual(windup, release);
    assert.notDeepEqual(release, recovery);
    assert.notDeepEqual(surged, release);
    assert.deepEqual(sample(.1), windup, 'Explicit authored frames must be deterministic.');
});
