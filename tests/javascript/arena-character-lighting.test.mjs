import test from 'node:test';
import assert from 'node:assert/strict';
import { drawActorWithEmitter } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-lighting.js';

const actor = { x: 100, y: 130, radius: 16 };
const emitter = { enabled: true, type: 'point', position: [100, 141, 2],
    range: 60, intensity: .48, color: '#d9cfee' };

function fixture() {
    const calls = [];
    const surface = {
        save: () => calls.push('surface-save'),
        restore: () => calls.push('surface-restore'),
        setTransform: (...values) => calls.push(['transform', ...values]),
        clearRect: (...values) => calls.push(['clear', ...values]),
        createLinearGradient() {
            calls.push('material-gradient');
            return { addColorStop: (...args) => calls.push(['stop', ...args]) };
        },
        fillRect: () => calls.push('material-fill'),
    };
    const buffer = { width: 0, height: 0, getContext: () => surface };
    const ctx = { save() {}, restore() {}, drawImage: (...args) => calls.push(['composite', ...args]) };
    return { calls, surface, buffer, ctx };
}

test('selected sprite receives one alpha-masked underlight from an existing point emitter', () => {
    const { calls, surface, buffer, ctx } = fixture();
    let actorCtx = null;
    assert.equal(drawActorWithEmitter(ctx, buffer, actor, emitter, target => { actorCtx = target; }), true);
    assert.equal(actorCtx, surface, 'Hollowed, Ashling and fallback draw into the same isolated material buffer.');
    assert.equal(surface.globalCompositeOperation, 'source-atop', 'Light touches only sprite alpha, not the ground.');
    assert.equal(calls.filter(x => x === 'material-gradient').length, 1);
    assert.equal(calls.filter(x => Array.isArray(x) && x[0] === 'composite').length, 1);
    const stops = calls.filter(x => Array.isArray(x) && x[0] === 'stop');
    assert.equal(stops.length, 5);
    assert.equal(stops[0][2], 'rgba(0,0,0,0)');
    assert.ok(buffer.width >= 192 && buffer.height >= 216);
});

test('no frame, out-of-range, disabled or zero intensity lights keep native direct draw', () => {
    for (const light of [null, { ...emitter, intensity: 0 }, { ...emitter, enabled: false },
        { ...emitter, position: [2000, 2000, 2] }, { ...emitter, color: 'invalid' }]) {
        const { calls, buffer, ctx } = fixture();
        let actorCtx = null;
        assert.equal(drawActorWithEmitter(ctx, buffer, actor, light, target => { actorCtx = target; }), false);
        assert.equal(actorCtx, ctx);
        assert.deepEqual(calls, []);
    }
});
