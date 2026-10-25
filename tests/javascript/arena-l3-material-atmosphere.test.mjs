import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calibrationEmitters, drawCalibrationEmitterCores } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lighting-calibration.js';
import { litWetMaterialPlan, drawLitWetMaterial, drawLocalNightMist } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-l3-material-atmosphere.js';

test('Fireball travels in the air, moves its real world light, and has no physical entity', () => {
    const early = calibrationEmitters({ progress: .15 });
    const middle = calibrationEmitters({ progress: .5 });
    const late = calibrationEmitters({ progress: .85 });
    assert.deepEqual(early.map(s => s.kind), ['fireball']);
    assert.ok(early[0].x < middle[0].x && middle[0].x < late[0].x);
    assert.ok(middle[0].y < early[0].y && middle[0].y < late[0].y);
    assert.equal(middle[0].altitude, 46);
    assert.deepEqual(calibrationEmitters({ progress: .5 }), middle);
    assert.ok(middle[0].radius >= 200);
    assert.equal(middle[0].relief, .99);
    assert.equal(calibrationEmitters({ fireball: false }).length, 0);
});

test('Torch provides an independent smaller warm source; both lights combine predictably', () => {
    const torch = calibrationEmitters({ fireball: false, torch: true });
    const mixed = calibrationEmitters({ fireball: true, torch: true, progress: .5 });
    assert.deepEqual(torch.map(s => s.kind), ['torch']);
    assert.deepEqual(mixed.map(s => s.kind), ['fireball', 'torch']);
    assert.ok(torch[0].radius < mixed[0].radius);
    assert.equal(torch[0].x, mixed[1].x);
    assert.deepEqual(mixed[0].color, mixed[1].color);
    assert.equal(calibrationEmitters({ fireball: false, torch: false }).length, 0);
    assert.equal(calibrationEmitters({ progress: -10 })[0].x, calibrationEmitters({ progress: 0 })[0].x);
    assert.equal(calibrationEmitters({ progress: 10 })[0].x, calibrationEmitters({ progress: 1 })[0].x);
});

test('Wet highlights only appear on approved material IDs in real illumination, not ground texture painting', () => {
    const board = new Uint8Array(36);
    board.fill(0);
    board[7] = 1; board[8] = 2; board[13] = 5;
    board[14] = 3; board[15] = 4;
    const light = { x: 42, y: 32, radius: 130, relief: 1 };
    const plans = litWetMaterialPlan(board, 6, 6, [light], 1204);
    // Sparse deterministic selection need not light every wet cell.
    assert.ok(plans.every(s => [1, 2, 5].includes(s.material)));
    assert.ok(plans.every(s => s.alpha <= .16 && s.alpha >= .012));
    assert.deepEqual(plans, litWetMaterialPlan(board, 6, 6, [light], 1204));
    assert.deepEqual(litWetMaterialPlan(board, 6, 6, [], 1204), []);
    assert.equal(litWetMaterialPlan(board, 0, 6, [light]).length, 0);
    assert.equal(litWetMaterialPlan(board, 6, 6, [{ ...light, x: 900 }]).length, 0);
    assert.equal(board[7], 1);
    assert.equal(board[14], 3);
});

function mock() {
    const ops = [];
    return {
        ops,
        save() { ops.push('save'); }, restore() { ops.push('restore'); },
        translate(...a) { ops.push(['translate', ...a]); },
        fillRect(...a) { ops.push(['rect', ...a]); },
        beginPath() { ops.push('begin'); }, arc(...a) { ops.push(['arc', ...a]); },
        ellipse(...a) { ops.push(['ellipse', ...a]); },
        moveTo(...a) { ops.push(['move', ...a]); },
        quadraticCurveTo(...a) { ops.push(['curve', ...a]); },
        fill() { ops.push('fill'); },
        createRadialGradient() { return { addColorStop() {} }; },
        createLinearGradient() { return { addColorStop() {} }; },
        set fillStyle(v) { ops.push(['style', typeof v === 'string' ? v : 'gradient']); },
    };
}

test('L3 effects are bounded and canvas state is restored after drawing', () => {
    const ctx = mock();
    const sources = calibrationEmitters({ torch: true, progress: .5 });
    drawCalibrationEmitterCores(ctx, sources);
    const wet = [{ x: 4, y: 3, width: 4, alpha: .05, material: 1 }];
    assert.equal(drawLitWetMaterial(ctx, wet), 1);
    assert.equal(drawLocalNightMist(ctx, sources), 2);
    assert.equal(drawLocalNightMist(ctx, sources, false), 0);
    assert.equal(drawLitWetMaterial(ctx, []), 0);
    assert.equal(ctx.ops.filter(x => x === 'save').length, ctx.ops.filter(x => x === 'restore').length);
});

test('L3 lighting uses approved ground board and no source trees, gameplay, or CSS filters', () => {
    const source = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-lighting-lab.js', import.meta.url), 'utf8');
    const scene = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(source, /groundFoundationBoard\(state\.seed, 'trails'\)/);
    assert.match(source, /litWetMaterialPlan\(state\.board, FOUNDATION_COLUMNS/);
    assert.match(source, /calibrationEmitters\(/);
    assert.match(source, /drawGothicNight\(ctx/);
    assert.match(source, /drawCalibrationEmitterCores\(ctx, sources\)/);
    assert.match(scene, /gothicNightLightSources\(snapshot, spellLights/);
    assert.doesNotMatch(scene, /arena-lighting-calibration|arena-l3-material-atmosphere/);
    assert.doesNotMatch(source, /global-filter|CSSFilter|old-tree/);
});
