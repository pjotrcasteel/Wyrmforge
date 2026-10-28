import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SIGIL_ATLAS, resolveSigilSchool, resolveTargetIndicator, presentTargetSigil, drawTargetIndicator,
    targetSelectionLightEmitter, targetSelectionCanvasLight,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-target-indicator.js';
import { withHollowFractureLightingFrame } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-fracture.js';

function scene() {
    return {
        player: { aimTargetId: 17, aimPropId: null, manualAim: false, activeSchool: 'Fire' },
        enemies: [
            { entityId: 12, x: 250, y: 300, radius: 20, healthRatio: 1 },
            { entityId: 17, x: 310, y: 440, radius: 16, healthRatio: .6 },
        ],
        dragon: { entityId: 99, x: 450, y: 650, radius: 55, health: 500, targetable: true },
        environment: { props: [{ id: 42, x: .25, y: .4, radius: 12, healthFraction: 1 }] },
        world: { width: 1000, height: 1500 },
        paused: false, ended: false,
    };
}
const litFrame = () => ({
    environment: { ambient: .03, emission: true },
    lights: [{ id: 'torch', enabled: true, intensity: .5 }],
});
function canvas() {
    const calls = [];
    const ctx = {
        calls, globalAlpha: 1,
        save: () => calls.push(['save']),
        restore: () => calls.push(['restore']),
        translate: (...args) => calls.push(['translate', ...args]),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
    };
    return ctx;
}
const atlas = { complete: true, naturalWidth: 256, naturalHeight: 192 };
const images = ctx => ctx.calls.filter(call => call[0] === 'drawImage');

test('the locked source is one base decal and exactly six independent school cells', () => {
    assert.deepEqual(SIGIL_ATLAS.base, [0, 0, 128, 85]);
    assert.deepEqual(Object.keys(SIGIL_ATLAS),
        ['base', 'fire', 'frost', 'storm', 'arcane', 'necromancer', 'summoner']);
    for (const [name, [x, y, w, h]] of Object.entries(SIGIL_ATLAS)) {
        assert.ok(w > 0 && h > 0 && x >= 0 && y >= 0);
        assert.ok(x + w <= 256 && y + h <= 192, name);
    }
});

test('all six schools map to their own artwork; future school aliases remain stable', () => {
    assert.equal(resolveSigilSchool('Fire'), 'fire');
    assert.equal(resolveSigilSchool('Frost'), 'frost');
    assert.equal(resolveSigilSchool('Storm'), 'storm');
    assert.equal(resolveSigilSchool('Arcane'), 'arcane');
    assert.equal(resolveSigilSchool('Death'), 'necromancer');
    assert.equal(resolveSigilSchool('Necromancer'), 'necromancer');
    assert.equal(resolveSigilSchool('Binding'), 'summoner');
    assert.equal(resolveSigilSchool('Summoner'), 'summoner');
    assert.equal(resolveSigilSchool('not-yet-known'), 'arcane');
});

test('C# selected enemy receives half-size footprint; unselected enemies are ignored', () => {
    assert.deepEqual(resolveTargetIndicator(scene()), { kind: 'enemy', x: 310, y: 452, rx: 17.6, ry: 8 });
    const s = scene();
    s.player.aimTargetId = 99;
    assert.deepEqual(resolveTargetIndicator(s), { kind: 'boss', x: 450, y: 691, rx: 56.75, ry: 26 });
    s.dragon.targetable = false;
    assert.equal(resolveTargetIndicator(s), null);
});

test('manual aim, paused and ended runs, and stale targets never show a seal', () => {
    const s = scene();
    s.player.manualAim = true;
    assert.equal(resolveTargetIndicator(s), null);
    s.player.manualAim = false; s.paused = true;
    assert.equal(resolveTargetIndicator(s), null);
    s.paused = false; s.ended = true;
    assert.equal(resolveTargetIndicator(s), null);
    s.ended = false; s.player.aimTargetId = 123456;
    assert.equal(resolveTargetIndicator(s), null);
    s.player.aimPropId = 42;
    assert.deepEqual(resolveTargetIndicator(s), { kind: 'object', x: 250, y: 608, rx: 16, ry: 7 });
});

test('one same immutable base decal is painted for each school; only the center crop changes', () => {
    const marker = { ...resolveTargetIndicator(scene()), opacity: 1 };
    let base = null;
    for (const school of ['Fire', 'Frost', 'Storm', 'Arcane', 'Necromancer', 'Summoner']) {
        const ctx = canvas();
        assert.equal(drawTargetIndicator(ctx, marker, 'contrast', 0, true, atlas, school), true);
        const draws = images(ctx);
        assert.equal(draws.length, 2, 'One sigil and one center emblem; never six different sigils.');
        assert.equal(draws[0][1], atlas);
        assert.deepEqual(draws[0].slice(2, 6), SIGIL_ATLAS.base, 'Never mutate the approved base decal.');
        assert.deepEqual(draws[1].slice(2, 6), SIGIL_ATLAS[resolveSigilSchool(school)]);
        if (base) assert.deepEqual(draws[0].slice(2), base);
        else base = draws[0].slice(2);
        assert.equal(ctx.calls.at(-1)[0], 'restore');
    }
});

test('all authored artwork stays on the ground in exactly two passes, without procedural symbols or spotlights', () => {
    const marker = { ...resolveTargetIndicator(scene()), opacity: 1 };
    const ctx = canvas();
    drawTargetIndicator(ctx, marker, 'ground', 0, true, atlas, 'fire');
    assert.equal(images(ctx).length, 1, 'Ground underlay is only the locked base.');
    ctx.calls.length = 0;
    drawTargetIndicator(ctx, marker, 'contrast', 0, true, atlas, 'fire');
    assert.equal(images(ctx).length, 2, 'Detail pass adds one selected school icon.');
    assert.ok(ctx.calls.every(call => !['arc', 'ellipse', 'createRadialGradient', 'fillRect'].includes(call[0])));
});

test('missing/unloaded atlas and zero opacity produce no placeholder or rebuilt glyph', () => {
    const ctx = canvas(), marker = resolveTargetIndicator(scene());
    assert.equal(drawTargetIndicator(ctx, marker, 'contrast', 0, false, null, 'Fire'), false);
    assert.equal(drawTargetIndicator(ctx, marker, 'contrast', 0, false,
        { complete: false, naturalWidth: 256, naturalHeight: 192 }, 'Fire'), false);
    assert.equal(drawTargetIndicator(ctx, { ...marker, opacity: 0 }, 'contrast', 0, false, atlas, 'Fire'), false);
    assert.deepEqual(ctx.calls, []);
});

test('target entry and exit opacity are smooth; underlight follows the exact same alpha', () => {
    const marker = resolveTargetIndicator(scene()), state = { key: null };
    const first = presentTargetSigil(state, marker, 17, 10);
    assert.equal(first.opacity, 0);
    assert.equal(targetSelectionLightEmitter(first, litFrame()), null);
    assert.ok(presentTargetSigil(state, marker, 17, 10.115).opacity > 0);
    const visible = presentTargetSigil(state, marker, 17, 10.23);
    assert.equal(visible.opacity, 1);
    assert.equal(targetSelectionLightEmitter(visible, litFrame()).intensity, .48);
    const dying = presentTargetSigil(state, null, null, 10.4);
    assert.equal(dying.opacity, 1);
    assert.ok(presentTargetSigil(state, null, null, 10.53).opacity < 1);
    assert.equal(presentTargetSigil(state, null, null, 10.66), null);
});

test('reduced motion freezes transitions; switching target restarts entry', () => {
    const marker = resolveTargetIndicator(scene()), state = { key: null };
    assert.equal(presentTargetSigil(state, marker, 17, 10, false).opacity, 0);
    assert.equal(presentTargetSigil(state, marker, 17, 10, true).opacity, 1);
    assert.equal(presentTargetSigil(state, marker, 18, 11, false).opacity, 0);
    assert.equal(presentTargetSigil(state, null, null, 12, true), null);
});

test('selection emitter is only one light in the authoritative GPU frame, with zero-light protection', () => {
    const marker = resolveTargetIndicator(scene()), frame = litFrame();
    const selected = targetSelectionLightEmitter(marker, frame);
    assert.equal(selected.type, 'point');
    assert.equal(selected.ownerId, 'target-selection');
    assert.equal(selected.castsShadow, false);
    assert.equal(selected.color, '#d9cfee');
    const merged = withHollowFractureLightingFrame(frame, [selected]);
    assert.equal(merged.lights.length, 2);
    assert.equal(frame.lights.length, 1);
    assert.equal(merged.lights[1].id, selected.id);
    assert.equal(targetSelectionLightEmitter(marker, null), null);
    assert.equal(targetSelectionLightEmitter(marker, { environment: { ambient: 0, emission: false }, lights: [] }), null);
    assert.equal(targetSelectionCanvasLight(null).length, 0);
    assert.equal(targetSelectionCanvasLight(selected).length, 1);
});
