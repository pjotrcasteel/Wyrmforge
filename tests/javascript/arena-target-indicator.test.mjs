import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetIndicator, drawTargetIndicator, targetSelectionLightEmitter, targetSelectionCanvasLight } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-target-indicator.js';
import { withHollowFractureLightingFrame } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-fracture.js';

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
    const gradient = {
        addColorStop: (position, color) => calls.push(['colorStop', position, color]),
    };
    const ctx = {
        calls,
        save: () => calls.push('save'),
        restore: () => calls.push('restore'),
        translate: (...args) => calls.push(['translate', ...args]),
        scale: (...args) => calls.push(['scale', ...args]),
        beginPath: () => calls.push('beginPath'),
        moveTo: (...args) => calls.push(['moveTo', ...args]),
        lineTo: (...args) => calls.push(['lineTo', ...args]),
        ellipse: (...args) => calls.push(['ellipse', ...args]),
        createRadialGradient: (...args) => { calls.push(['radialGradient', ...args]); return gradient; },
        fillRect: (...args) => calls.push(['fillRect', ...args]),
        stroke() { calls.push(['stroke', this.strokeStyle, this.globalAlpha, this.lineWidth, this.shadowBlur]); },
        globalAlpha: 1,
        shadowBlur: 0,
    };
    return ctx;
}

const callsOf = (ctx, name) => ctx.calls.filter(call => Array.isArray(call) && call[0] === name);
const strokes = ctx => callsOf(ctx, 'stroke');

test('enemy uses multiple actual rune glyphs and faded incomplete ring, not a UI crosshair', () => {
    const ctx = recordingCanvas();
    const target = resolveTargetIndicator(scene());
    drawTargetIndicator(ctx, target, 'ground', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 5);
    assert.equal(callsOf(ctx, 'fillRect').length, 0, 'Ground sigil has no AoE-style fill.');

    ctx.calls.length = 0;
    drawTargetIndicator(ctx, target, 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 5, 'Five separated outer arcs only.');
    assert.equal(callsOf(ctx, 'scale').length, 6, 'Six inscribed runes follow the ellipse.');
    assert.ok(callsOf(ctx, 'lineTo').length >= 17, 'Each glyph must have rune strokes, not diamonds or ticks.');
    assert.equal(callsOf(ctx, 'radialGradient').length, 0, 'No separate lighting algorithm in sigil renderer.');
    assert.equal(callsOf(ctx, 'fillRect').length, 0, 'Lighting must be supplied by the shared emitter.');
    assert.equal(ctx.calls.at(-1), 'restore');
    assert.ok(strokes(ctx).every(call => call[1] === '#d9cfee'));
    assert.ok(strokes(ctx).every(call => call[2] <= .42));
    assert.ok(strokes(ctx).some(call => call[4] === 2.2), 'Glow must be bounded to 2.2 px.');
    assert.equal(callsOf(ctx, 'colorStop').length, 0, 'Renderer may not introduce local light gradients.');
});

test('future destructibles retain faint rune language without any character underlight', () => {
    const snapshot = scene(), ctx = recordingCanvas();
    snapshot.player.aimPropId = 72;
    drawTargetIndicator(ctx, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 3);
    assert.equal(callsOf(ctx, 'scale').length, 3, 'Unknown prop type receives runic symbols automatically.');
    assert.equal(callsOf(ctx, 'radialGradient').length, 0, 'Do not illuminate destructible scenery.');
    assert.equal(callsOf(ctx, 'fillRect').length, 0);
    assert.ok(strokes(ctx).every(call => call[1] === '#d9cfee'));
    assert.ok(strokes(ctx).every(call => call[2] <= .27));
});

test('boss uses ten inscribed glyphs and only one faint interior segment', () => {
    const snapshot = scene(), ctx = recordingCanvas();
    snapshot.player.aimTargetId = 99;
    drawTargetIndicator(ctx, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'ellipse').length, 6, 'Five partial outer arcs and one incomplete inner line.');
    assert.equal(callsOf(ctx, 'scale').length, 10);
    assert.equal(callsOf(ctx, 'radialGradient').length, 0);
    assert.equal(callsOf(ctx, 'fillRect').length, 0);
    assert.ok(strokes(ctx).every(call => call[1] === '#d9cfee'));
    assert.ok(strokes(ctx).every(call => call[2] <= .49));
});

test('school state never changes rune colors or glow and reduced motion freezes shimmer', () => {
    const marker = resolveTargetIndicator(scene());
    const base = recordingCanvas(), frost = recordingCanvas(), storm = recordingCanvas(), animated = recordingCanvas();
    drawTargetIndicator(base, marker, 'contrast', 0, true);
    drawTargetIndicator(frost, marker, 'contrast', Math.PI / 2, true);
    drawTargetIndicator(storm, marker, 'contrast', Math.PI * 2, true);
    assert.deepEqual(base.calls, frost.calls);
    assert.deepEqual(base.calls, storm.calls);
    drawTargetIndicator(animated, marker, 'contrast', Math.PI / 2, false);
    assert.notDeepEqual(strokes(base).map(call => call[2]), strokes(animated).map(call => call[2]));
    assert.ok(strokes(animated).every(call => call[2] <= .42));
    const tint = new Set([...strokes(base), ...strokes(animated)].map(call => call[1]));
    assert.deepEqual([...tint], ['#d9cfee']);
});

test('missing targets, paused state and unsupported passes never produce light or glyphs', () => {
    const ctx = recordingCanvas();
    drawTargetIndicator(ctx, resolveTargetIndicator({}), 'contrast');
    assert.deepEqual(ctx.calls, []);
    drawTargetIndicator(ctx, resolveTargetIndicator(scene()), 'unknown');
    assert.deepEqual(ctx.calls, []);
    const paused = scene();
    paused.paused = true;
    drawTargetIndicator(ctx, resolveTargetIndicator(paused), 'contrast');
    assert.deepEqual(ctx.calls, []);
});

const litFrame = () => ({
    environment: { ambient: .03, emission: true },
    lights: [{ id: 'physical-torch', enabled: true, intensity: .5 }],
});

test('faint selection underlight is one shared GPU point emitter with a Canvas compatibility adapter', () => {
    const enemy = resolveTargetIndicator(scene());
    const light = targetSelectionLightEmitter(enemy, litFrame());
    assert.deepEqual(light.ownerId, 'target-selection');
    assert.equal(light.id, 'target-selection:underlight');
    assert.equal(light.type, 'point');
    assert.equal(light.enabled, true);
    assert.equal(light.castsShadow, false);
    assert.equal(light.color, '#d9cfee');
    assert.ok(light.intensity <= .12 && light.intensity > 0);
    assert.ok(light.range >= 26 && light.range <= 62);
    assert.deepEqual(targetSelectionCanvasLight(light), [{
        x: light.position[0], y: light.position[1], radius: light.range,
        strength: light.intensity, type: 'target-selection', family: 'selection',
        center: [217, 207, 238], edge: [99, 90, 116], surge: false,
    }]);
    assert.deepEqual(targetSelectionCanvasLight(null), []);
});

test('explicit universal zero-light gate and absent authoritative frame reject underlight', () => {
    const enemy = resolveTargetIndicator(scene());
    assert.equal(targetSelectionLightEmitter(enemy, null), null);
    assert.equal(targetSelectionLightEmitter(enemy, {
        environment: { ambient: 0, emission: false },
        lights: [{ enabled: true, intensity: 0 }],
    }), null);
    assert.equal(targetSelectionLightEmitter(enemy, {
        environment: { ambient: 0, emission: false },
        lights: [],
    }), null);
    assert.ok(targetSelectionLightEmitter(enemy, litFrame()));
});

test('objects and stale targets never create additional world light emitters', () => {
    const snapshot = scene();
    snapshot.player.aimPropId = 42;
    assert.equal(targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame()), null);
    snapshot.environment.props[0].healthFraction = 0;
    assert.equal(targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame()), null);
    snapshot.player.aimPropId = null;
    snapshot.player.aimTargetId = 99;
    const boss = targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame());
    assert.ok(boss.intensity > 0 && boss.intensity < .12);
    snapshot.dragon.targetable = false;
    assert.equal(targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame()), null);
});

test('selection light merges into one immutable shared GPU frame rather than creating a second engine', () => {
    const base = litFrame();
    const selected = targetSelectionLightEmitter(resolveTargetIndicator(scene()), base);
    const combined = withHollowFractureLightingFrame(base, [selected]);
    assert.notEqual(combined, base);
    assert.equal(base.lights.length, 1, 'Never mutate authoritative C# input frame.');
    assert.equal(combined.lights.length, 2, 'Add exactly one selection emitter to the existing lights.');
    assert.equal(combined.lights[1].id, selected.id);
    assert.equal(combined.lights[1].ownerId, selected.ownerId);
    const zero = { environment: { ambient: 0, emission: false }, lights: [] };
    assert.equal(withHollowFractureLightingFrame(zero, [selected]), zero,
        'Even a supplied selection descriptor cannot break zero-light = black.');
});
