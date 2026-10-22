import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groundFoundationBoard, clampGroundCamera, FOUNDATION_COLUMNS, FOUNDATION_ROWS }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-foundation.js';
import { forestTrailPlan, composeForestTrailGround }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-trails.js';

test('ground foundation produces deterministic approved natural patches with NO paving or scorched material', () => {
    const natural = groundFoundationBoard(1204, 'natural');
    assert.equal(natural.length, FOUNDATION_COLUMNS * FOUNDATION_ROWS);
    assert.deepEqual(natural, groundFoundationBoard(1204, 'natural'));
    assert.notDeepEqual(natural, groundFoundationBoard(1205, 'natural'));
    assert.ok([...new Set(natural)].every(m => [0, 1, 3, 5].includes(m)),
        'Do not use old cobblestones/roads, baked fire patches or non-approved art');
    assert.deepEqual(groundFoundationBoard(1204, false), new Uint8Array(natural.length));
    assert.deepEqual(groundFoundationBoard(1204, 'grass'), new Uint8Array(natural.length));
    assert.deepEqual(groundFoundationBoard(1204, true), natural);
});

test('ground-only mobile pan stays inside the unblocked flat world', () => {
    assert.deepEqual(clampGroundCamera({ x: -50, y: 9999 }, 390, 600), { x: 0, y: 936 });
    assert.deepEqual(clampGroundCamera({ x: 9999, y: -5 }, 390, 600), { x: 570, y: 0 });
});

test('phase 1 does not import or render legacy arena assets, gameplay or topology', () => {
    const read = file => readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/' + file, import.meta.url), 'utf8');
    const razor = read('Pages/ArenaLab.razor');
    const js = read('wwwroot/js/arena-ground-foundation.js');
    const css = read('Pages/ArenaLab.razor.css');
    assert.match(razor, /@page "\/arena-lab"/);
    assert.match(razor, /Natural Terrain & Forest Trails/);
    assert.match(razor, /Forest trails/);
    assert.match(razor, /Step 2/);
    assert.match(razor, /initializeGroundFoundation/);
    assert.doesNotMatch(razor, /ArenaEnvironmentState|LabMob|WyrmrealmMapState|Hit prop|drawMage|Pathing mobs/);
    assert.doesNotMatch(js, /arena-environment|arena-wet-forest-art|arena-lab\.js|drawTerritoryGround|drawMage|drawEnemy|drawMinimap/);
    assert.match(js, /naturalGroundPreview/);
    assert.match(js, /composeForestTrailGround/);
    assert.match(js, /drawReferenceGroundBoard/);
    assert.match(js, /drawGroundMaterialTransitions/);
    assert.match(js, /buildGroundQuiltAtlas\(state\.source, state\.seed, undefined, false\)/);
    assert.match(js, /state\.atlasSeed !== state\.seed/, 'Quilt is cached across grass/natural switches');
    assert.match(js, /foundationAssets = '0'/);
    assert.match(js, /foundationCollision = '0'/);
    assert.match(js, /foundationRoads = '0'/);
    assert.match(js, /foundationTrails = state.mode === 'trails' \? '2' : '0'/);
    assert.match(js, /touchstart', preventScroll, \{ passive: false \}/);
    assert.match(js, /touchmove', preventScroll, \{ passive: false \}/);
    assert.match(css, /\.arena-stage\{touch-action:none\}/);
    assert.doesNotMatch(razor, /localStorage|SaveProgress|GrantEssence/);
});

test('Step 2 generates a seeded, connected forest footpath with two linked clearings', () => {
    const columns = FOUNDATION_COLUMNS, rows = FOUNDATION_ROWS;
    for (const seed of [1204, 1205, 1441, 1977, -37, 0]) {
        const p = forestTrailPlan(seed, columns, rows);
        assert.ok(p);
        assert.equal(p.spine.length, rows);
        assert.equal(p.clearings.length, 2);
        assert.ok(p.spine.every(x => x > columns * .18 && x < columns * .82));
        for (let row = 1; row < rows; row++)
            assert.ok(Math.abs(p.spine[row] - p.spine[row - 1]) < 2,
                'The route is continuous from the top of the world to the bottom.');
        const baseline = groundFoundationBoard(seed, 'natural');
        const original = baseline.slice();
        const result = composeForestTrailGround(baseline, seed, columns, rows);
        assert.ok(result);
        assert.deepEqual(baseline, original, 'No mutation of the approved baseline board');
        assert.deepEqual(result.board, groundFoundationBoard(seed, 'trails'));
        assert.notDeepEqual(result.board, baseline);
        assert.ok([...new Set(result.board)].every(m => [0, 1, 3, 5].includes(m)),
            'No paving, scorched tiles or invented art may enter Wet Forest');
        for (let row = 0; row < rows; row++) {
            const x = Math.floor(p.spine[row]);
            assert.ok([1, 3].includes(result.board[row * columns + x]),
                'The entire spine must remain visibly worn dirt/mud');
        }
        for (const clearing of p.clearings) {
            const cell = Math.round(clearing.cy) * columns + Math.floor(clearing.cx);
            assert.ok([1, 3].includes(result.board[cell]),
                'Each branch terminates in an actual visible dirt/mud clearing');
            assert.ok(Math.abs(clearing.cx - clearing.fromX) < columns * .30);
        }
    }
    assert.notDeepEqual(forestTrailPlan(1204, columns, rows), forestTrailPlan(1205, columns, rows));
    assert.equal(forestTrailPlan(1, 5, 10), null);
    assert.equal(composeForestTrailGround(new Uint8Array(3), 1, columns, rows), null);
});

test('Step 2 is only a new floor recipe; no legacy scene objects, gameplay or sprites are reintroduced', () => {
    const read = name => readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/' + name, import.meta.url), 'utf8');
    const recipe = read('wwwroot/js/arena-ground-trails.js');
    const page = read('Pages/ArenaLab.razor');
    assert.doesNotMatch(recipe, /import |drawImage|drawMage|createWetForestTilePlan|physics|collision\s*=/);
    assert.doesNotMatch(page, /Hit prop|Blast area|Pathing mobs|ArenaEnvironmentState|LabMob/);
    assert.match(recipe, /distanceToSegment/);
    assert.match(recipe, /natural.*clearings|Side branches|clearings/);
    assert.match(page, /@onclick="ShowTrails"/);
    assert.match(page, /20261022-forest-trails-1/);
});
