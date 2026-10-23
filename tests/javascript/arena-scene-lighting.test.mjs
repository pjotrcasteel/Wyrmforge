import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSceneLighting, contactShadowPlan, drawContactShadow, drawSceneLighting,
    sortSpritesByFoot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-scene-lighting.js';
import { groundFoundationBoard } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-foundation.js';

const read = path => readFileSync(
    new URL('../../src/Wyrmforge.Presentation.Web/' + path, import.meta.url), 'utf8');

test('lighting settings are bounded and deterministic; default is off', () => {
    assert.deepEqual(resolveSceneLighting(), {
        enabled: false, ambient: .24, sunDegrees: 315, shadows: true,
    });
    assert.deepEqual(resolveSceneLighting({ enabled: true, ambient: 9, sunDegrees: -45, shadows: false }),
        { enabled: true, ambient: .5, sunDegrees: 315, shadows: false });
    assert.deepEqual(resolveSceneLighting({ enabled: true, ambient: Number.NaN, sunDegrees: Infinity }),
        { enabled: true, ambient: .24, sunDegrees: 315, shadows: true });
});

test('contact shadows are grounded in foot pivots and bounded trunk widths only', () => {
    const profile = { enabled: true, sunDegrees: 180, ambient: .3 };
    const anchor = { x: 120, y: 185 };
    const p = contactShadowPlan(anchor, 40, profile);
    assert.ok(p.x > anchor.x);
    assert.ok(Math.abs(p.y - anchor.y) < 0.00001);
    assert.ok(Math.abs(p.radiusX - 31.2) < 1e-9);
    assert.ok(Math.abs(p.radiusY - 13.2) < 1e-9);
    assert.ok(p.opacity >= .16 && p.opacity <= .31);
    assert.deepEqual(p, contactShadowPlan(anchor, 40, profile));
    assert.deepEqual(anchor, { x: 120, y: 185 });
    assert.equal(contactShadowPlan(anchor, 40, { enabled: false }), null);
    assert.equal(contactShadowPlan(anchor, 40, { enabled: true, shadows: false }), null);
    assert.equal(contactShadowPlan(anchor, 0, profile), null);
    assert.equal(contactShadowPlan({ x: NaN, y: 185 }, 40, profile), null);
});

function fakeContext() {
    const operations = [];
    const gradient = () => ({ addColorStop: (t, c) => operations.push(['stop', t, c]) });
    const ctx = {
        operations,
        save() { operations.push('save'); }, restore() { operations.push('restore'); },
        translate(x, y) { operations.push(['translate', x, y]); },
        scale(x, y) { operations.push(['scale', x, y]); },
        fillRect(...args) { operations.push(['fill', ...args]); },
        createRadialGradient() { operations.push('radial'); return gradient(); },
        createLinearGradient(...args) { operations.push(['linear', ...args]); return gradient(); },
        set fillStyle(value) { operations.push(['color', typeof value === 'string' ? value : 'gradient']); },
    };
    return ctx;
}

test('disabled lighting is exactly no-op, and world light is independent of camera', () => {
    const ctx = fakeContext();
    assert.equal(drawSceneLighting(ctx, { width: 960, height: 1536 }, { enabled: false }), false);
    assert.equal(ctx.operations.length, 0);
    const setting = resolveSceneLighting({ enabled: true, ambient: .22, sunDegrees: 315 });
    assert.equal(drawSceneLighting(ctx, { width: 960, height: 1536 }, setting), true);
    const operations = [...ctx.operations];
    ctx.operations.length = 0;
    drawSceneLighting(ctx, { width: 960, height: 1536 }, setting);
    assert.deepEqual(ctx.operations, operations);
    assert.ok(operations.some(x => Array.isArray(x) && x[0] === 'linear'));
    assert.equal(operations.filter(x => x === 'save').length, 1);
    assert.equal(operations.filter(x => x === 'restore').length, 1);
    assert.equal(drawSceneLighting(ctx, { width: 0, height: 0 }, setting), false);
});

test('soft contact ellipse is painted behind independent sprites, not into material atlas', () => {
    const ctx = fakeContext();
    assert.equal(drawContactShadow(ctx, null), false);
    assert.equal(ctx.operations.length, 0);
    const plan = contactShadowPlan({ x: 300, y: 400 }, 50, { enabled: true });
    assert.equal(drawContactShadow(ctx, plan), true);
    assert.ok(ctx.operations.includes('radial'));
    assert.equal(ctx.operations.filter(x => Array.isArray(x) && x[0] === 'scale').length, 1);
    assert.equal(ctx.operations.at(-1), 'restore');
});

test('sprites sort by foot anchor, not crown height; input is not mutated', () => {
    const sprites = [
        { id: 'elm', foot: { y: 800 }, canopyHeight: 700 },
        { id: 'oak', foot: { y: 725 }, canopyHeight: 300 },
    ];
    assert.deepEqual(sortSpritesByFoot(sprites).map(x => x.id), ['oak', 'elm']);
    assert.equal(sprites[0].id, 'elm');
    assert.deepEqual(sortSpritesByFoot([{ id: 'invalid' }, ...sprites]).map(x => x.id), ['oak', 'elm']);
});

test('isolated lab reuses exact accepted board + quilt + transitions with opt-in original candidates', () => {
    const ground = read('wwwroot/js/arena-ground-foundation.js');
    const lab = read('wwwroot/js/arena-lighting-lab.js');
    const page = read('Pages/ArenaLightingLab.razor');
    const oldPage = read('Pages/ArenaLab.razor');
    const hunt = read('wwwroot/js/arena.js');
    const before = groundFoundationBoard(1204, 'trails');
    assert.deepEqual(before, groundFoundationBoard(1204, 'trails'));
    assert.match(lab, /groundFoundationBoard\(state\.seed, 'trails'\)/);
    assert.match(lab, /drawReferenceGroundBoard\(ctx, board, atlas/);
    assert.match(lab, /drawGroundMaterialTransitions\(ctx, board, atlas/);
    assert.match(lab, /const crop = image\.crop/);
    assert.match(lab, /sortSpritesByFoot/);
    assert.match(lab, /drawContactShadow\(ctx, plan\)/);
    assert.match(lab, /drawSceneLighting\(ctx, world, state\.light\)/);
    assert.match(lab, /URL\.revokeObjectURL/);
    assert.match(page, /@page "\/arena-lighting"/);
    assert.match(page, /loadArenaLightingSprite/);
    assert.match(page, /Original tree candidates/);
    assert.match(oldPage, /STEP 2 · GROUND ONLY/);
    assert.doesNotMatch(lab, /arena-environment|arena-territory|arena-wet-forest-art|old-tree|approvedTreeSprite/);
    assert.doesNotMatch(ground, /arena-scene-lighting|arena-lighting-lab/);
    assert.doesNotMatch(hunt, /arena-scene-lighting|arena-lighting-lab/);
});
