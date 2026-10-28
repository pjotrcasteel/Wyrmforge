import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetIndicator, presentTargetSigil, drawTargetIndicator, targetSelectionLightEmitter, targetSelectionCanvasLight } from
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

const litFrame = () => ({
    environment: { ambient: .03, emission: true },
    lights: [{ id: 'physical-torch', enabled: true, intensity: .5 }],
});

function recordingCanvas() {
    const calls = [];
    const ctx = {
        calls,
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        translate: (...args) => calls.push(['translate', ...args]),
        scale: (...args) => calls.push(['scale', ...args]),
        rotate: (...args) => calls.push(['rotate', ...args]),
        beginPath: () => calls.push(['beginPath']),
        closePath: () => calls.push(['closePath']),
        moveTo: (...args) => calls.push(['moveTo', ...args]),
        lineTo: (...args) => calls.push(['lineTo', ...args]),
        arc: (...args) => calls.push(['arc', ...args]),
        fillRect: (...args) => calls.push(['fillRect', ...args]),
        createRadialGradient: (...args) => {
            calls.push(['inkGradient', ...args]);
            return { addColorStop: (position, color) => calls.push(['inkStop', position, color]) };
        },
        stroke() { calls.push(['stroke', this.globalAlpha, this.lineWidth, this.shadowBlur]); },
        globalAlpha: 1,
        shadowBlur: 0,
    };
    return ctx;
}

const callsOf = (ctx, name) => ctx.calls.filter(call => call[0] === name);

test('authoritative selected enemy receives a half-size ground sigil, not nearby enemies', () => {
    assert.deepEqual(resolveTargetIndicator(scene()),
        { kind: 'enemy', x: 310, y: 452, rx: 17.6, ry: 8 });
});

test('boss and destructible footprints are also halved, with a small mobile floor', () => {
    const snapshot = scene();
    snapshot.player.aimTargetId = 99;
    const boss = resolveTargetIndicator(snapshot);
    assert.equal(boss.kind, 'boss');
    assert.equal(boss.x, 450);
    assert.equal(boss.y, 691);
    assert.equal(boss.rx, 56.75);
    assert.equal(boss.ry, 26);
    snapshot.dragon.targetable = false;
    assert.equal(resolveTargetIndicator(snapshot), null);

    snapshot.player.aimPropId = 42;
    assert.deepEqual(resolveTargetIndicator(snapshot),
        { kind: 'object', x: 250, y: 608, rx: 16, ry: 7 });
    snapshot.player.aimPropId = 72;
    const future = resolveTargetIndicator(snapshot);
    assert.equal(future.kind, 'object');
    assert.equal(future.x, 750);
    assert.equal(future.y, 918);
    assert.equal(future.rx, 25.25);
    assert.equal(future.ry, 12);
});

test('manual aim, paused runs, destroyed targets and stale C# IDs produce no marker', () => {
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

test('V3 sigil animates 0 → 1 on entry and 1 → 0 on exit without resurrecting a stale light', () => {
    const state = { key: null };
    const marker = resolveTargetIndicator(scene());
    const atStart = presentTargetSigil(state, marker, 17, 100);
    assert.equal(atStart.opacity, 0);
    assert.equal(targetSelectionLightEmitter(atStart, litFrame()), null);
    const entering = presentTargetSigil(state, marker, 17, 100.11);
    assert.ok(entering.opacity > 0 && entering.opacity < 1);
    const visible = presentTargetSigil(state, marker, 17, 100.23);
    assert.equal(visible.opacity, 1);
    assert.ok(targetSelectionLightEmitter(visible, litFrame()));
    const exiting = presentTargetSigil(state, null, null, 100.3);
    assert.equal(exiting.opacity, 1);
    assert.ok(presentTargetSigil(state, null, null, 100.43).opacity < 1);
    assert.equal(presentTargetSigil(state, null, null, 100.56), null);
    assert.equal(presentTargetSigil(state, null, null, 100.8), null);
});

test('switching targets restarts entry and reduced-motion renders a stable sigil', () => {
    const state = { key: null };
    const marker = resolveTargetIndicator(scene());
    assert.equal(presentTargetSigil(state, marker, 17, 20, false).opacity, 0);
    assert.equal(presentTargetSigil(state, marker, 17, 20.5, false).opacity, 1);
    assert.equal(presentTargetSigil(state, marker, 99, 21, false).opacity, 0);
    assert.equal(presentTargetSigil(state, marker, 99, 21, true).opacity, 1);
    assert.equal(presentTargetSigil(state, null, null, 21.1, true), null);
});

test('V3 paints a compact double ring, four compass tips, a central flame crest and actual runes', () => {
    const ctx = recordingCanvas();
    const marker = resolveTargetIndicator(scene());
    drawTargetIndicator(ctx, marker, 'ground', 0, true);
    assert.equal(callsOf(ctx, 'arc').length, 2);
    assert.equal(callsOf(ctx, 'fillRect').length, 0, 'Ground glow is a bounded inscription, not a spotlight.');
    assert.equal(callsOf(ctx, 'inkGradient').length, 1);

    ctx.calls.length = 0;
    drawTargetIndicator(ctx, marker, 'contrast', 0, true);
    assert.equal(callsOf(ctx, 'arc').length, 2, 'The rune circle has two complete concentric rings.');
    assert.equal(callsOf(ctx, 'inkGradient').length, 1, 'A radial alpha mask is applied only to sigil ink.');
    const stops = callsOf(ctx, 'inkStop');
    assert.equal(stops.length, 5);
    assert.equal(stops[0][2], 'rgba(217,207,238,1)');
    assert.equal(stops.at(-1)[2], 'rgba(217,207,238,0)', 'Outer edge fades to exactly zero.');
    assert.ok(callsOf(ctx, 'lineTo').length >= 40, 'Runes, four compass tips and crest are fully drawn.');
    assert.equal(callsOf(ctx, 'fillRect').length, 4, 'Four tiny motes provide restrained magical texture.');
    assert.equal(callsOf(ctx, 'rotate').length, 13, 'Four compass points and eight runes share a rotating band.');
    assert.equal(ctx.calls.at(-1)[0], 'restore');
    assert.ok(callsOf(ctx, 'stroke').every(call => call[1] <= .88));
});

test('rune ink remains school-neutral and reduced-motion does not rotate or shimmer over time', () => {
    const marker = resolveTargetIndicator(scene());
    const base = recordingCanvas(), still = recordingCanvas(), animated = recordingCanvas();
    drawTargetIndicator(base, marker, 'contrast', 0, true);
    drawTargetIndicator(still, marker, 'contrast', Math.PI * 2, true);
    assert.deepEqual(base.calls, still.calls);
    drawTargetIndicator(animated, marker, 'contrast', Math.PI * 2, false);
    assert.notDeepEqual(base.calls, animated.calls);
    const colors = callsOf(animated, 'inkStop').map(call => call[2]);
    assert.ok(colors.every(color => color.startsWith('rgba(217,207,238,')));
});

test('boss has twelve glyphs and subordinate core ring, objects four with faint opacity', () => {
    const snapshot = scene();
    const boss = recordingCanvas();
    snapshot.player.aimTargetId = 99;
    drawTargetIndicator(boss, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(boss, 'arc').length, 3);
    assert.equal(callsOf(boss, 'rotate').length, 17);

    const object = recordingCanvas();
    snapshot.player.aimPropId = 72;
    drawTargetIndicator(object, resolveTargetIndicator(snapshot), 'contrast', 0, true);
    assert.equal(callsOf(object, 'arc').length, 2);
    assert.equal(callsOf(object, 'rotate').length, 9);
    assert.ok(callsOf(object, 'stroke').every(call => call[1] <= .46));
});

test('zero-alpha, missing targets and unknown render passes never draw glyphs', () => {
    const ctx = recordingCanvas();
    drawTargetIndicator(ctx, null);
    drawTargetIndicator(ctx, { ...resolveTargetIndicator(scene()), opacity: 0 }, 'contrast');
    drawTargetIndicator(ctx, resolveTargetIndicator(scene()), 'unrecognized');
    assert.deepEqual(ctx.calls, []);
});

test('one point emitter fades with the rune, retaining shared lighting and alpha-isolated actors', () => {
    const marker = resolveTargetIndicator(scene());
    const light = targetSelectionLightEmitter({ ...marker, opacity: .5 }, litFrame());
    assert.equal(light.ownerId, 'target-selection');
    assert.equal(light.id, 'target-selection:underlight');
    assert.equal(light.type, 'point');
    assert.equal(light.castsShadow, false);
    assert.equal(light.color, '#d9cfee');
    assert.equal(light.intensity, .24);
    assert.ok(light.range >= 48 && light.range <= 125);
    assert.deepEqual(targetSelectionCanvasLight(light), [{
        x: light.position[0], y: light.position[1], radius: light.range,
        strength: light.intensity, type: 'target-selection', family: 'selection',
        center: [217, 207, 238], edge: [99, 90, 116], surge: false,
    }]);
    assert.deepEqual(targetSelectionCanvasLight(null), []);
});

test('zero-light environment, missing frame and invalid selection do not create an emitter', () => {
    const marker = resolveTargetIndicator(scene());
    assert.equal(targetSelectionLightEmitter(marker, null), null);
    assert.equal(targetSelectionLightEmitter(marker, {
        environment: { ambient: 0, emission: false },
        lights: [{ enabled: true, intensity: 0 }],
    }), null);
    assert.equal(targetSelectionLightEmitter(marker, {
        environment: { ambient: 0, emission: false }, lights: [],
    }), null);
    const snapshot = scene();
    snapshot.player.aimPropId = 42;
    assert.equal(targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame()), null);
    snapshot.player.aimPropId = null;
    snapshot.player.aimTargetId = 99;
    assert.ok(targetSelectionLightEmitter(resolveTargetIndicator(snapshot), litFrame()).intensity < .48);
});

test('sigil is only one immutable light added to the authoritative shared GPU frame', () => {
    const base = litFrame();
    const selected = targetSelectionLightEmitter(resolveTargetIndicator(scene()), base);
    const combined = withHollowFractureLightingFrame(base, [selected]);
    assert.notEqual(combined, base);
    assert.equal(base.lights.length, 1);
    assert.equal(combined.lights.length, 2);
    assert.equal(combined.lights[1].id, selected.id);
    const zero = { environment: { ambient: 0, emission: false }, lights: [] };
    assert.equal(withHollowFractureLightingFrame(zero, [selected]), zero);
});
