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
        closePath: () => calls.push('closePath'),
        ellipse: (...args) => calls.push(['ellipse', ...args]),
        fill: () => calls.push('fill'),
        stroke() { calls.push(['stroke', this.strokeStyle, this.globalAlpha, this.lineWidth, this.shadowBlur]); },
        globalAlpha: 1,
        shadowBlur: 0,
    };
    return ctx;
}

const callsOf = (ctx, name) => ctx.calls.filter(call => Array.isArray(call) && call[0] === name);
const strokes = ctx => callsOf(ctx, 'stroke');

test('enemy indicator uses unfilled, separated neutral arcane fragments rather than a solid circle', () => {
    const ctx = recordingCanvas();
    drawTargetIndicator(ctx, resolveTargetIndicator(scene()), 'ground', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 4);
    assert.equal(ctx.calls.includes('fill'), false, 'No AoE-style area fill.');
    assert.ok(strokes(ctx).every(call => call[1] === '#dcd4ee'));
    assert.equal(ctx.calls.at(-1), 'restore');

    ctx.calls.length = 0;
    drawTargetIndicator(ctx, resolveTargetIndicator(scene()), 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 4, 'Exactly four disjoint arc fragments.');
    assert.equal(ctx.calls.filter(call => call === 'closePath').length, 2, 'Two minimal rune diamonds.');
    assert.ok(callsOf(ctx, 'lineTo').length >= 6, 'Small inscribed glyphs, not cardinal crosshair ticks.');
    assert.equal(ctx.calls.includes('fill'), false);
    assert.equal(ctx.calls.at(-1), 'restore');
    assert.ok(strokes(ctx).every(call => call[1] === '#dcd4ee'));
    assert.ok(strokes(ctx).some(call => call[4] === 2.5), 'Glow must be bounded to 2.5px.');
});

test('future destructibles share the same color but a quieter, smaller sigil', () => {
    const snapshot = scene(), ctx = recordingCanvas();
    snapshot.player.aimPropId = 72; // Unknown future prop kind.
    drawTargetIndicator(ctx, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 2);
    assert.equal(ctx.calls.filter(call => call === 'closePath').length, 1);
    assert.ok(strokes(ctx).every(call => call[1] === '#dcd4ee'), 'Never imply a spell school or fire telegraph.');
    assert.ok(strokes(ctx).every(call => call[2] <= .54));
    assert.equal(ctx.calls.includes('fill'), false);
});

test('boss has the same school-neutral language with only two added rune strokes', () => {
    const snapshot = scene(), ctx = recordingCanvas();
    snapshot.player.aimTargetId = 99;
    drawTargetIndicator(ctx, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 4, 'No second warning circle around a boss.');
    assert.equal(ctx.calls.filter(call => call === 'closePath').length, 2);
    assert.ok(callsOf(ctx, 'lineTo').length >= 8, 'Additional boss inscriptions.');
    assert.ok(strokes(ctx).every(call => call[1] === '#dcd4ee'));
    assert.equal(ctx.calls.includes('fill'), false);
});

test('motion preference freezes shimmer; unrestricted shimmer stays subtle', () => {
    const marker = resolveTargetIndicator(scene());
    const a = recordingCanvas(), b = recordingCanvas(), c = recordingCanvas(), d = recordingCanvas();
    drawTargetIndicator(a, marker, 'contrast', 0, true);
    drawTargetIndicator(b, marker, 'contrast', Math.PI / 2, true);
    assert.deepEqual(a.calls, b.calls);
    drawTargetIndicator(c, marker, 'contrast', 0, false);
    drawTargetIndicator(d, marker, 'contrast', Math.PI / 2, false);
    assert.notDeepEqual(strokes(c).map(x => x[2]), strokes(d).map(x => x[2]));
    assert.ok(strokes(d).every(x => x[2] <= .83), 'Brightness does not turn into a distracting pulse.');
});

test('no rendering for missing targets, paused state or unknown drawing passes', () => {
    const ctx = recordingCanvas();
    drawTargetIndicator(ctx, resolveTargetIndicator({}), 'contrast');
    assert.deepEqual(ctx.calls, []);
    drawTargetIndicator(ctx, resolveTargetIndicator(scene()), 'unknown');
    assert.deepEqual(ctx.calls, []);
});
