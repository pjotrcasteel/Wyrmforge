import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    SIGIL_ATLAS, SIGIL_SCHOOL_COLORS, tintSigilPixels, resolveSigilSchool, resolveTargetIndicator, presentTargetSigil, drawTargetIndicator,
    targetSelectionLightEmitter, targetSelectionCanvasLight, actorLightsWithoutSigilOverlay,
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
    assert.equal(resolveSigilSchool('not-yet-known'), null);
    assert.equal(resolveSigilSchool(undefined), null);
    assert.equal(resolveSigilSchool(''), null);
});

test('six school palettes color both base and center without changing approved alpha or source imagery', () => {
    assert.deepEqual(Object.keys(SIGIL_SCHOOL_COLORS),
        ['fire', 'frost', 'storm', 'arcane', 'necromancer', 'summoner']);
    assert.equal(new Set(Object.values(SIGIL_SCHOOL_COLORS)).size, 6);
    const original = new Uint8ClampedArray([175, 88, 238, 255, 75, 25, 130, 95, 0, 0, 0, 0]);
    const channels = ['fire', 'frost', 'storm', 'necromancer', 'summoner'];
    for (const school of channels) {
        const pixels = new Uint8ClampedArray(original);
        assert.equal(tintSigilPixels(pixels, school), pixels);
        assert.equal(pixels[3], 255);
        assert.equal(pixels[7], 95);
        assert.equal(pixels[11], 0);
        assert.notDeepEqual(pixels, original, school + ' must tint the original purple artwork');
        assert.notEqual(pixels[0], pixels[4], 'original light and dark pixel detail must survive');
        if (school === 'fire' || school === 'storm') assert.ok(pixels[0] > pixels[1] && pixels[1] > pixels[2], school);
        if (school === 'frost') assert.ok(pixels[2] > pixels[1] && pixels[1] > pixels[0]);
        if (school === 'necromancer' || school === 'summoner') assert.ok(pixels[1] > pixels[0], school);
    }
    assert.deepEqual(tintSigilPixels(new Uint8ClampedArray(original), 'Arcane'), original);
    assert.deepEqual(tintSigilPixels(new Uint8ClampedArray(original), null), original);
    assert.deepEqual(original, new Uint8ClampedArray([175, 88, 238, 255, 75, 25, 130, 95, 0, 0, 0, 0]));
});

test('one existing shared point emitter and Canvas adapter follow C# school without adding light engines', () => {
    const marker = resolveTargetIndicator(scene());
    for (const school of ['Fire', 'Frost', 'Storm', 'Arcane', 'Death', 'Binding']) {
        const key = resolveSigilSchool(school);
        const emitter = targetSelectionLightEmitter(marker, litFrame(), school);
        assert.equal(emitter.color, SIGIL_SCHOOL_COLORS[key], school);
        assert.equal(emitter.id, 'target-selection:underlight');
        const adapter = targetSelectionCanvasLight(emitter);
        assert.equal(adapter.length, 1);
        const hex = emitter.color;
        assert.deepEqual(adapter[0].center,
            [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(part => parseInt(part, 16)));
    }
    assert.equal(targetSelectionLightEmitter(marker, litFrame(), null).color, '#d9cfee');
    assert.equal(targetSelectionLightEmitter(marker,
        { environment: { ambient: 0, emission: false }, lights: [] }, 'Fire'), null);
});

test('missing school never inserts a misleading Arcane center emblem', () => {
    const marker = { ...resolveTargetIndicator(scene()), opacity: 1 };
    const ctx = canvas();
    assert.equal(drawTargetIndicator(ctx, marker, 'contrast', 0, true, atlas, null), true);
    assert.equal(images(ctx).length, 1);
});

test('C# selected enemy receives a legible combat footprint; unselected enemies are ignored', () => {
    const enemy = resolveTargetIndicator(scene());
    assert.deepEqual({ ...enemy, rx: Math.round(enemy.rx) },
        { kind: 'enemy', x: 310, y: 443, rx: 34, ry: 17 });
    const s = scene();
    s.player.aimTargetId = 99;
    const boss = resolveTargetIndicator(s);
    assert.deepEqual({ ...boss, rx: Math.round(boss.rx) },
        { kind: 'boss', x: 450, y: 652, rx: 79, ry: 40 });
    s.dragon.targetable = false;
    assert.equal(resolveTargetIndicator(s), null);
});

test('right-stick snap uses the authoritative target ID, while free aim and stale IDs never show a seal', () => {
    const s = scene();
    s.player.manualAim = true;
    assert.equal(resolveTargetIndicator(s).kind, 'enemy',
        'Manual stick input WITH a confirmed snap must show the same marker as auto-aim.');
    s.player.aimTargetId = null;
    assert.equal(resolveTargetIndicator(s), null, 'Free manual aiming is not an automatic lock-on.');
    s.player.manualAim = false;
    s.player.aimTargetId = 17;
    s.paused = true;
    assert.equal(resolveTargetIndicator(s), null);
    s.paused = false; s.ended = true;
    assert.equal(resolveTargetIndicator(s), null);
    s.ended = false; s.player.aimTargetId = 123456;
    assert.equal(resolveTargetIndicator(s), null);
    s.player.aimPropId = 42;
    assert.deepEqual(resolveTargetIndicator(s), { kind: 'object', x: 250, y: 608, rx: 32, ry: 18 });
});

test('the ground sigil is centered at the actual actor feet, not displaced below the monster', () => {
    const s = scene();
    const enemy = resolveTargetIndicator(s);
    assert.ok(Math.abs(enemy.y - s.enemies[1].y) <= 4,
        'Enemy feet must cross the center of the seal.');
    s.player.aimTargetId = 99;
    const boss = resolveTargetIndicator(s);
    assert.equal(boss.y, s.dragon.y + 2,
        'Ashfang contact shadow and targeting seal share the ground pivot.');
    assert.ok(enemy.ry < enemy.rx && boss.ry < boss.rx,
        'Ground sigils stay foreshortened on the floor.');
});

test('both sigil passes stay below alpha-composited enemy and boss sprites', () => {
    const source = readFileSync(
        new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const ground = source.indexOf("drawTargetIndicator(ctx, targetIndicator, 'ground'");
    const luminous = source.indexOf("drawTargetIndicator(ctx, targetIndicator, 'contrast'");
    const sprites = source.indexOf('for (const layer of sortSceneDepthLayers(depthLayers))');
    assert.ok(ground >= 0 && luminous > ground && sprites > luminous,
        'Draw the entire decal before actor silhouettes, so their feet occlude its rear arc.');
    assert.equal(source.indexOf('drawTargetIndicator(ctx, targetIndicator', sprites), -1,
        'Never redraw rune artwork over monster sprites later in the frame.');
});

test('selection underlight is never screen-blended over actors after sprites are drawn', () => {
    const light = targetSelectionCanvasLight(targetSelectionLightEmitter(resolveTargetIndicator(scene()), litFrame(), 'Fire'))[0];
    const fireball = { family: 'fire', x: 30, y: 50, radius: 70, strength: .8 };
    const actors = actorLightsWithoutSigilOverlay([fireball, light]);
    assert.deepEqual(actors, [fireball]);
    assert.equal(light.family, 'selection', 'Selection remains a floor light and alpha-isolated material emitter.');
    assert.deepEqual(actorLightsWithoutSigilOverlay(), []);
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
    assert.equal(ctx.globalAlpha, .48, 'Ground ink must be stronger without procedural rings.');
    assert.equal(ctx.imageSmoothingEnabled, false, 'Pixel-art runes must not vanish during bilinear downscaling.');
    ctx.calls.length = 0;
    drawTargetIndicator(ctx, marker, 'contrast', 0, true, atlas, 'fire');
    assert.equal(images(ctx).length, 2, 'Detail pass adds one selected school icon.');
    assert.equal(ctx.globalAlpha, 1, 'Selected enemy sigil must be readable at full contrast.');
    assert.equal(ctx.globalCompositeOperation, 'screen', 'Use the approved artwork as the luminous detail.');
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
    assert.ok(presentTargetSigil(state, marker, 17, 10.06).opacity > 0);
    assert.equal(presentTargetSigil(state, marker, 17, 10.12).opacity, 1);
    const visible = presentTargetSigil(state, marker, 17, 10.23);
    assert.equal(visible.opacity, 1);
    assert.equal(targetSelectionLightEmitter(visible, litFrame()).intensity, .90);
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
    assert.equal(selected.intensity, .90);
    assert.ok(selected.range >= 65 && selected.range <= 155);
    const merged = withHollowFractureLightingFrame(frame, [selected]);
    assert.equal(merged.lights.length, 2);
    assert.equal(frame.lights.length, 1);
    assert.equal(merged.lights[1].id, selected.id);
    assert.equal(targetSelectionLightEmitter(marker, null), null);
    assert.equal(targetSelectionLightEmitter(marker, { environment: { ambient: 0, emission: false }, lights: [] }), null);
    assert.equal(targetSelectionCanvasLight(null).length, 0);
    assert.equal(targetSelectionCanvasLight(selected).length, 1);
});
