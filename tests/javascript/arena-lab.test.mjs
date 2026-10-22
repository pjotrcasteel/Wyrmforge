import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groundFoundationBoard, clampGroundCamera, FOUNDATION_COLUMNS, FOUNDATION_ROWS }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-foundation.js';

test('ground foundation produces deterministic approved natural patches with NO paving or scorched material', () => {
    const natural = groundFoundationBoard(1204);
    assert.equal(natural.length, FOUNDATION_COLUMNS * FOUNDATION_ROWS);
    assert.deepEqual(natural, groundFoundationBoard(1204));
    assert.notDeepEqual(natural, groundFoundationBoard(1205));
    assert.ok([...new Set(natural)].every(m => [0, 1, 3, 5].includes(m)),
        'Do not use old cobblestones/roads, baked fire patches or non-approved art');
    assert.deepEqual(groundFoundationBoard(1204, false), new Uint8Array(natural.length));
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
    assert.match(razor, /Arena Ground Foundation/);
    assert.match(razor, /initializeGroundFoundation/);
    assert.doesNotMatch(razor, /ArenaEnvironmentState|LabMob|WyrmrealmMapState|Hit prop|drawMage|Pathing mobs/);
    assert.doesNotMatch(js, /arena-environment|arena-wet-forest-art|arena-lab\.js|drawTerritoryGround|drawMage|drawEnemy|drawMinimap/);
    assert.match(js, /naturalGroundPreview/);
    assert.match(js, /drawReferenceGroundBoard/);
    assert.match(js, /drawGroundMaterialTransitions/);
    assert.match(js, /buildGroundQuiltAtlas\(state\.source, state\.seed, undefined, false\)/);
    assert.match(js, /state\.atlasSeed !== state\.seed/, 'Quilt is cached across grass/natural switches');
    assert.match(js, /foundationAssets = '0'/);
    assert.match(js, /foundationCollision = '0'/);
    assert.match(js, /foundationRoads = '0'/);
    assert.match(js, /touchstart', preventScroll, \{ passive: false \}/);
    assert.match(js, /touchmove', preventScroll, \{ passive: false \}/);
    assert.match(css, /\.arena-stage\{touch-action:none\}/);
    assert.doesNotMatch(razor, /localStorage|SaveProgress|GrantEssence/);
});
