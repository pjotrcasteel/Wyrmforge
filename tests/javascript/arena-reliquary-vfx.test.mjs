import test from 'node:test';
import assert from 'node:assert/strict';
import { drawReliquaryGround, drawReliquaryEmergence, drawReliquaryBar } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-reliquary-vfx.js';

function mockContext() {
    const calls = [];
    return new Proxy({ calls }, {
        get(target, key) {
            if (key in target) return target[key];
            return (...args) => calls.push([key, ...args]);
        },
        set(target, key, value) { calls.push(['set', key, value]); return true; },
    });
}

test('nothing to draw without a reliquary or fields', () => {
    const ctx = mockContext();
    drawReliquaryGround(ctx, { enemies: [] });
    drawReliquaryGround(ctx, null);
    drawReliquaryEmergence(ctx, null);
    drawReliquaryBar(ctx, null, 800);
    drawReliquaryBar(ctx, { stage: 'hush' }, 800);
    assert.equal(ctx.calls.length, 0);
});

test('corruption fields draw at their exact C# radius, armed or arming', () => {
    for (const armed of [false, true]) {
        const ctx = mockContext();
        drawReliquaryGround(ctx, { enemies: [], reliquaryFields: [{ x: 50, y: 60, radius: 64, armed, armProgress: .5, life: .8 }] }, 1, true);
        assert.deepEqual(ctx.calls.find(c => c[0] === 'arc').slice(1, 4), [50, 60, 64]);
    }
});

test('the sigil is drawn at the reveal spot during the hush', () => {
    const ctx = mockContext();
    drawReliquaryGround(ctx, { enemies: [], reliquary: { stage: 'hush', x: 300, y: 200, progress: .5 } }, 0, true);
    assert.deepEqual(ctx.calls.find(c => c[0] === 'translate'), ['translate', 300, 200]);
});

test('wards chain to the reliquary and empowered minions get a ground ring', () => {
    const ctx = mockContext();
    drawReliquaryGround(ctx, { enemies: [
        { kind: 7, x: 100, y: 100, radius: 22 },
        { kind: 8, x: 160, y: 120, radius: 13 },
        { kind: 0, x: 200, y: 200, radius: 10, empowered: true, entityId: 3 },
    ] }, 0, true);
    assert.ok(ctx.calls.some(c => c[0] === 'lineTo' && c[1] === 100 && c[2] === 94), 'chain reaches the reliquary');
    assert.ok(ctx.calls.some(c => c[0] === 'ellipse' && c[1] === 200), 'empowered ring');
});

test('the duel bar names the reliquary and marks the half-health shift', () => {
    const ctx = mockContext();
    drawReliquaryBar(ctx, { stage: 'duel', healthRatio: .7, warded: true, shifted: false }, 800);
    const texts = ctx.calls.filter(c => c[0] === 'fillText').map(c => c[1]);
    assert.ok(texts.includes('THE RELIQUARY'));
    assert.ok(texts.some(t => t.includes('WARDED')));
});
