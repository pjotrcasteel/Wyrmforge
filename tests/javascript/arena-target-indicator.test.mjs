import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetIndicator, drawTargetIndicator } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-target-indicator.js';

function scene() {
    return {
        player: { aimTargetId: 17, aimPropId: null, manualAim: false },
        enemies: [
            { entityId: 12, x: 250, y: 300, radius: 20, healthRatio: 1 },
            { entityId: 17, x: 310, y: 440, radius: 16, healthRatio: .6 },
        ],
        dragon: { entityId: 99, x: 450, y: 650, radius: 55, health: 500, targetable: true },
        environment: {
            props: [
                { id: 42, kind: 'barrel', x: .25, y: .4, radius: 12, healthFraction: 1 },
                { id: 72, kind: 'future-destructible', x: .75, y: .6, radius: 25, healthFraction: 1 },
            ],
        },
        world: { width: 1000, height: 1500 },
        paused: false,
        ended: false,
    };
}

test('exactly the C# selected enemy gets an ellipse; nearby enemies do not', () => {
    const indicator = resolveTargetIndicator(scene());
    assert.deepEqual(indicator, { kind: 'enemy', x: 310, y: 452, rx: 25.24, ry: 8 });
});

test('boss targeting uses entity ID and scales ring footprint to its actual radius', () => {
    const snapshot = scene();
    snapshot.player.aimTargetId = 99;
    const ring = resolveTargetIndicator(snapshot);
    assert.equal(ring.kind, 'boss');
    assert.equal(ring.x, 450);
    assert.equal(ring.y, 691);
    assert.ok(ring.rx > 60);
    assert.ok(ring.ry > 20);
    snapshot.dragon.targetable = false;
    assert.equal(resolveTargetIndicator(snapshot), null);
});

test('barrel and future breakable kinds use the same authoritative prop ID lookup', () => {
    const snapshot = scene();
    snapshot.player.aimPropId = 42;
    assert.deepEqual(resolveTargetIndicator(snapshot),
        { kind: 'object', x: 250, y: 608, rx: 20.68, ry: 7 });
    snapshot.player.aimPropId = 72;
    const future = resolveTargetIndicator(snapshot);
    assert.equal(future.kind, 'object');
    assert.equal(future.x, 750);
    assert.equal(future.y, 918);
    assert.ok(future.rx > 30);
    assert.ok(future.ry > 10);
});

test('manual aim, paused runs, destroyed targets and stale IDs have no visual marker', () => {
    const snapshot = scene();
    snapshot.player.manualAim = true;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.player.manualAim = false;
    snapshot.paused = true;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.paused = false;
    snapshot.ended = true;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.ended = false;
    snapshot.enemies[1].healthRatio = 0;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.player.aimPropId = 42;
    snapshot.environment.props[0].healthFraction = 0;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.player.aimPropId = 9192;
    assert.equal(resolveTargetIndicator(snapshot), null);
    snapshot.player.aimPropId = null;
    snapshot.player.aimTargetId = 9192;
    assert.equal(resolveTargetIndicator(snapshot), null);
});

function recordingCanvas() {
    const calls = [];
    const ctx = {
        calls,
        save: () => calls.push('save'),
        restore: () => calls.push('restore'),
        translate: (...args) => calls.push(['translate', ...args]),
        beginPath: () => calls.push('beginPath'),
        moveTo: (...args) => calls.push(['moveTo', ...args]),
        lineTo: (...args) => calls.push(['lineTo', ...args]),
        ellipse: (...args) => calls.push(['ellipse', ...args]),
        fill: () => calls.push('fill'),
        stroke() { calls.push(['stroke', this.strokeStyle, this.globalAlpha]); },
        globalAlpha: 1,
    };
    return ctx;
}

test('underlay and contrast passes draw stable distinct object and enemy rings', () => {
    const snapshot = scene();
    const hostile = resolveTargetIndicator(snapshot);
    const ctx = recordingCanvas();

    drawTargetIndicator(ctx, hostile, 'ground');
    assert.equal(ctx.calls.filter(call => call === 'fill').length, 1, 'Footprint underlay uses one muted fill.');
    assert.equal(ctx.calls.filter(call => Array.isArray(call) && call[0] === 'ellipse').length, 1);
    assert.ok(ctx.calls.some(call => Array.isArray(call) && call[0] === 'stroke' && call[1] === '#cbdde4'));
    assert.equal(ctx.calls.at(-1), 'restore');

    ctx.calls.length = 0;
    drawTargetIndicator(ctx, hostile, 'contrast');
    assert.equal(ctx.calls.filter(call => call === 'fill').length, 0, 'Post-night cue never covers sprite pixels.');
    assert.equal(ctx.calls.filter(call => Array.isArray(call) && call[0] === 'ellipse').length, 4);
    assert.equal(ctx.calls.filter(call => Array.isArray(call) && call[0] === 'lineTo').length, 4);
    assert.equal(ctx.calls.at(-1), 'restore');

    ctx.calls.length = 0;
    snapshot.player.aimPropId = 42;
    drawTargetIndicator(ctx, resolveTargetIndicator(snapshot), 'contrast');
    assert.ok(ctx.calls.some(call => Array.isArray(call) && call[0] === 'stroke' && call[1] === '#ddc18b'));
    assert.equal(ctx.calls.at(-1), 'restore');
});

test('nothing is drawn for missing targets, including no scene state', () => {
    const ctx = recordingCanvas();
    drawTargetIndicator(ctx, resolveTargetIndicator({}), 'contrast');
    assert.deepEqual(ctx.calls, []);
});
