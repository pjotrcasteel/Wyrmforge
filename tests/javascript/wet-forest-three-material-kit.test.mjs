import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    threeMaterialPlan, validateWetForestRecipe, trailAt, MATERIAL_IDS, THREE_MATERIAL_REVIEW,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/wet-forest-three-material-kit.js';
import {
    inspectionSnapshot,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/wet-forest-gpu-material-review.js';
import { validateSnapshot } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js';

const recipe = () => ({
    site: 'broken-wagon', siteX: .75, siteY: .58,
    trail: [
        { x: .25, y: 0, width: .16 },
        { x: .48, y: .5, width: .14 },
        { x: .65, y: 1, width: .16 },
    ],
    ground: [
        { kind: 'moss', x: .13, y: .16, radiusX: .12, radiusY: .10 },
        { kind: 'mud', x: .87, y: .25, radiusX: .17, radiusY: .19 },
        { kind: 'puddle', x: .85, y: .70, radiusX: .08, radiusY: .05 },
        { kind: 'leafbed', x: .1, y: .75, radiusX: .08, radiusY: .1 },
    ],
});

test('three-material scene uses only C# authored trail, patch and site positions', () => {
    const source = recipe();
    const plan = threeMaterialPlan(source, 1204, 960, 1536);
    assert.ok(plan);
    assert.equal(plan.authority, 'HuntArenaGenerator.GenerateWetForest');
    assert.equal(plan.previewOnly, true);
    assert.equal(plan.columns, 60);
    assert.equal(plan.rows, 96);
    assert.equal(plan.board.length, 60 * 96);
    assert.deepEqual([...new Set(plan.board)].sort(), [0, 1, 3]);
    assert.ok(plan.counts.grass > 0 && plan.counts.mud > 0 && plan.counts.earth > 0);
    assert.deepEqual(plan, threeMaterialPlan(source, 1204, 960, 1536));

    // Walk the authored trail from north entrance to south exit: every row has soil.
    for (let row = 0; row < plan.rows; row++) {
        const track = trailAt(source, (row * 16 + 8) / plan.height);
        const col = Math.min(plan.columns - 1, Math.floor(track.x * plan.width / 16));
        const neighborhood = [
            col - 1, col, col + 1,
        ].filter(x => x >= 0 && x < plan.columns);
        assert.ok(neighborhood.some(x => plan.board[row * plan.columns + x] === MATERIAL_IDS.earth),
            'C# trail remains visible in each terrain row');
    }
    assert.equal(plan.board[0 * plan.columns + 0], MATERIAL_IDS.grass);
});

test('unknown water semantics stay visual-only mud; no physical water invented', () => {
    const source = recipe();
    const plan = threeMaterialPlan(source, 1204, 160, 256);
    // Puddle is classified only as provisional painted mud.
    assert.deepEqual(THREE_MATERIAL_REVIEW.selected, ['grass', 'dirt', 'mud']);
    assert.equal(THREE_MATERIAL_REVIEW.neutralAlbedoApproved, false);
    assert.equal(THREE_MATERIAL_REVIEW.runtimeAdopted, false);
    assert.equal(new Set(plan.board).has(2), false);
    assert.equal(new Set(plan.board).has(4), false);
    assert.equal(new Set(plan.board).has(5), false);
});

test('reject malformed or invented C# topology instead of silently generating new roads', () => {
    const valid = recipe();
    assert.equal(validateWetForestRecipe(valid), true);
    assert.equal(threeMaterialPlan(valid, 1204, 0, 100), null);
    assert.equal(threeMaterialPlan(valid, 1.5, 960, 1536), null);
    assert.equal(threeMaterialPlan(valid, 1204, 8192, 8192), null);
    assert.equal(validateWetForestRecipe({ ...valid, trail: [] }), false);
    assert.equal(validateWetForestRecipe({ ...valid, trail: [...valid.trail].reverse() }), false);
    assert.equal(validateWetForestRecipe({
        ...valid, ground: [{ kind: 'lava', x: .5, y: .5, radiusX: .1, radiusY: .1 }],
    }), false);
    assert.equal(trailAt(null, .5), null);
});

test('same G1 engine snapshots deliver night, neutral inspection and true zero-light world', () => {
    for (const profile of ['night', 'neutral', 'zero']) {
        const snapshot = inspectionSnapshot('ground-albedo', profile);
        assert.deepEqual(validateSnapshot(snapshot), snapshot);
        assert.equal(snapshot.objects.length, 1);
        assert.equal(snapshot.materials.length, 1);
        assert.equal(snapshot.materials[0].albedo, 'ground-albedo');
        assert.equal(snapshot.objects[0].geometry, 'ground-plane');
        assert.equal(snapshot.objects[0].castsShadow, false);
        if (profile === 'zero') {
            assert.equal(snapshot.environment.ambient, 0);
            assert.equal(snapshot.environment.emission, false);
            assert.equal(snapshot.lights.length, 0);
        }
        if (profile === 'neutral') {
            assert.ok(snapshot.environment.ambient > .5);
            assert.equal(snapshot.lights.length, 0);
        }
        if (profile === 'night') {
            assert.equal(snapshot.lights.length, 2);
            assert.ok(snapshot.lights.every(l => l.ownerId && l.enabled));
        }
    }
    assert.throws(() => inspectionSnapshot('ground', 'bright-preset'));
});

test('preview receives actual C# WetForestRecipe and does not replace live Hunts or add a renderer', () => {
    const web = 'src/Wyrmforge.Presentation.Web/';
    const read = path => readFileSync(new URL('../../' + web + path, import.meta.url), 'utf8');
    const page = read('Pages/ArenaMaterialKit.razor');
    const gpu = read('wwwroot/js/wet-forest-gpu-material-review.js');
    const kit = read('wwwroot/js/wet-forest-three-material-kit.js');
    const live = read('wwwroot/js/arena.js');
    assert.match(page, /HuntArenaGenerator\.GenerateWetForest\(seed\)/);
    assert.match(page, /initializeThreeMaterialReview/);
    assert.match(gpu, /import \{ LightingEngine \} from '.\/lighting\/engine\.js'/);
    assert.match(gpu, /new T\.CanvasTexture\(pixels\)/);
    assert.match(kit, /drawGroundMaterialTransitions/);
    assert.doesNotMatch(gpu, /new T\.WebGLRenderer|night-lighting|canvas\.style\.filter/);
    assert.doesNotMatch(live, /wet-forest-three-material-kit|wet-forest-gpu-material-review/);
});
