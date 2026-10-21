import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    CELL, COLS, ROWS, MATERIALS, GROUND_SOURCE_TILE_SIZE, GROUND_TILE_SIZE,
    GROUND_ATLAS_URL, GROUND_PATCH_SIZE, GROUND_PATCH_STEP,
    materialSampleBoard, paintGroundCells, drawReferenceGroundBoard,
    groundQuiltPatchPlan, groundMaterialVariationPlan, groundMaterialAccentPlan,
    groundMaterialBoundaryPlan, drawGroundMaterialTransitions, buildGroundQuiltAtlas,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js';

test('material studio starts with six standalone ground types, not an arena layout', () => {
    assert.deepEqual(MATERIALS.map(m => m.id),
        ['grass', 'mud', 'paving', 'dirt', 'scorched', 'marsh']);
    const board = materialSampleBoard();
    assert.equal(board.length, COLS * ROWS);
    for (let row = 0; row < ROWS; row++)
        assert.deepEqual([...board.slice(row * COLS, (row + 1) * COLS)],
            Array(COLS).fill(Math.floor(row * MATERIALS.length / ROWS)));
});

test('painting edits cells without altering collision or inventing props', () => {
    const board = materialSampleBoard();
    const before = board.slice();
    const changed = paintGroundCells(board, COLS, ROWS, 13 * CELL + 4, 20 * CELL + 4, 1, 3);
    assert.ok(changed > 10 && changed < 60);
    assert.equal(board[20 * COLS + 13], 1);
    assert.equal(board[0], before[0]);
    assert.equal(board.at(-1), before.at(-1));
    assert.equal(paintGroundCells(board, COLS, ROWS, -600, -600, 4, 2), 0);
    assert.equal(paintGroundCells(board, COLS, ROWS, 0, 0, 99, 1), 0);
    assert.notDeepEqual(board, before);
});

test('generated material atlas is a compact six-panel ground-only WebP', () => {
    const art = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/environment/wet-forest-materials-painted.webp', import.meta.url));
    assert.equal(art.toString('ascii', 0, 4), 'RIFF');
    assert.equal(art.toString('ascii', 8, 12), 'WEBP');
    assert.ok(art.length > 7000 && art.length < 25000);
    assert.equal(GROUND_SOURCE_TILE_SIZE, 112);
    assert.equal(GROUND_TILE_SIZE, 672);
    assert.equal(GROUND_PATCH_SIZE, 72);
    assert.equal(GROUND_PATCH_STEP, 48);
    assert.match(GROUND_ATLAS_URL, /wet-forest-materials-painted\.webp$/);
});

test('quilt patch placement is deterministic and avoids the 112px repeating grid', () => {
    for (let index = 0; index < MATERIALS.length; index++) {
        const patches = groundQuiltPatchPlan(index, 1441);
        assert.equal(patches.length, 196);
        assert.deepEqual(patches, groundQuiltPatchPlan(index, 1441));
        assert.notDeepEqual(patches, groundQuiltPatchPlan(index, 1442));
        assert.ok(patches.every(p =>
            p.sourceX >= index * GROUND_SOURCE_TILE_SIZE &&
            p.sourceX + GROUND_PATCH_SIZE <= (index + 1) * GROUND_SOURCE_TILE_SIZE &&
            p.sourceY >= 0 && p.sourceY + GROUND_PATCH_SIZE <= GROUND_SOURCE_TILE_SIZE));
        assert.ok(new Set(patches.map(p => p.sourceX + ':' + p.sourceY)).size >= 20,
            'Each painted swatch should use many different parts of the approved art');
        assert.ok(patches.some(p => p.flipX) && patches.some(p => !p.flipX) &&
            patches.some(p => p.flipY) && patches.some(p => !p.flipY));
    }
    assert.deepEqual(groundQuiltPatchPlan(99), []);
});

test('subtle variation keeps each approved surface recognizable and wraps without seams', () => {
    for (let index = 0; index < MATERIALS.length; index++) {
        const spots = groundMaterialVariationPlan(index, 1441);
        assert.equal(spots.length, 14);
        assert.deepEqual(spots, groundMaterialVariationPlan(index, 1441));
        assert.notDeepEqual(spots, groundMaterialVariationPlan(index, 1442));
        assert.ok(spots.every(s => Number.isInteger(s.x) && s.x >= 0 && s.x < GROUND_TILE_SIZE &&
            Number.isInteger(s.y) && s.y >= 0 && s.y < GROUND_TILE_SIZE &&
            s.radius >= 85 && s.radius <= 175 && s.opacity >= .16 && s.opacity <= .28));
        assert.equal(new Set(spots.map(s => s.tone)).size, 2);
    }
    assert.deepEqual(groundMaterialVariationPlan(-1), []);
    assert.deepEqual(groundMaterialVariationPlan(99), []);
});

test('actual macro variation comes from related ground artwork, not barely visible tint', () => {
    for (let index = 0; index < MATERIALS.length; index++) {
        const patches = groundMaterialAccentPlan(index, 1441);
        assert.equal(patches.length, 7);
        assert.deepEqual(patches, groundMaterialAccentPlan(index, 1441));
        assert.notDeepEqual(patches, groundMaterialAccentPlan(index, 1442));
        assert.ok(patches.every(p =>
            p.radius >= 64 && p.radius <= 112 &&
            p.opacity >= .23 && p.opacity <= .38 &&
            p.x >= 0 && p.x < GROUND_TILE_SIZE &&
            p.y >= 0 && p.y < GROUND_TILE_SIZE));
        assert.equal(new Set(patches.map(p => p.source)).size, 2);
        assert.ok(patches.every(p => p.source < MATERIALS.length && p.source !== index),
            'Accent blends must come from a different approved ground painting');
    }
    assert.deepEqual(groundMaterialAccentPlan(99), []);
});

test('mixed paint has seeded irregular material boundaries but uniform grass has none', () => {
    const grass = new Uint8Array(COLS * ROWS);
    assert.deepEqual(groundMaterialBoundaryPlan(grass), []);
    const board = grass.slice();
    paintGroundCells(board, COLS, ROWS, 13 * CELL + 4, 20 * CELL + 4, 3, 3);
    const a = groundMaterialBoundaryPlan(board);
    const b = groundMaterialBoundaryPlan(board, COLS, ROWS, 1442);
    assert.ok(a.length > 12 && a.length < 120);
    assert.deepEqual(a, groundMaterialBoundaryPlan(board));
    assert.notDeepEqual(a, b);
    assert.ok(a.some(e => e.vertical) && a.some(e => !e.vertical));
    assert.ok(a.every(e => e.a !== e.b &&
        e.a < MATERIALS.length && e.b < MATERIALS.length &&
        Number.isInteger(e.x) && Number.isInteger(e.y) &&
        e.x >= -2 && e.y >= -2 && e.x < COLS * CELL + 2 && e.y < ROWS * CELL + 2));
});

test('material transition painting blends both sides using world-aligned neighbor art', () => {
    const board = new Uint8Array(4);
    board.set([0, 1, 0, 1]);
    const atlas = { width: GROUND_TILE_SIZE * MATERIALS.length, height: GROUND_TILE_SIZE };
    const calls = [];
    const ctx = {
        globalAlpha: 1, save() {}, restore() {},
        drawImage(...args) { calls.push({ args, alpha: this.globalAlpha }); },
    };
    assert.equal(drawGroundMaterialTransitions(ctx, board, atlas, 2, 2), true);
    assert.ok(calls.length >= 32, 'Cross-material edges draw real overlaid texture strips');
    assert.ok(calls.some(c => c.args[1] < GROUND_TILE_SIZE) &&
        calls.some(c => c.args[1] >= GROUND_TILE_SIZE));
    assert.ok(calls.some(c => c.alpha >= .49) && calls.some(c => c.alpha <= .1));
    assert.equal(drawGroundMaterialTransitions(ctx, new Uint8Array(4), atlas, 2, 2), true);
    const all = calls.length;
    assert.equal(drawGroundMaterialTransitions(ctx, new Uint8Array(4), atlas, 2, 2), true);
    assert.equal(calls.length, all, 'Identical neighboring material has no seam to soften');
    assert.equal(drawGroundMaterialTransitions(ctx, board, null, 2, 2), false);
    assert.equal(drawGroundMaterialTransitions(ctx, board, { width: 112, height: 112 }, 2, 2), false);
    const edge = groundMaterialBoundaryPlan(board, 2, 2);
    assert.ok(edge.length >= 4, 'Both horizontal and vertical boundaries must be feathered');
});

test('quilt is baked once into six independent material panels', () => {
    const calls = { sourceReads: 0, outputDraws: 0, masks: 0, gradients: 0 };
    let next = 0;
    const factory = () => {
        const isOutput = next++ === 0;
        const ctx = {
            get fillStyle() { return this.color; },
            set fillStyle(v) { this.color = v; },
            globalCompositeOperation: 'source-over',
            imageSmoothingEnabled: false,
            save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
            clearRect() {}, translate() {}, scale() {}, fillRect() { calls.masks++; },
            createLinearGradient() { return { addColorStop() {} }; },
            createRadialGradient() { calls.gradients++; return { addColorStop() {} }; },
            drawImage() { if (isOutput) calls.outputDraws++; else calls.sourceReads++; },
        };
        return { width: 0, height: 0, getContext() { return ctx; } };
    };
    const raw = { width: GROUND_SOURCE_TILE_SIZE * 6, height: GROUND_SOURCE_TILE_SIZE };
    const quilt = buildGroundQuiltAtlas(raw, 1441, factory);
    assert.equal(quilt.width, GROUND_TILE_SIZE * 6);
    assert.equal(quilt.height, GROUND_TILE_SIZE);
    assert.equal(calls.sourceReads, 1176 + 7 * MATERIALS.length, 'Accents sample the original painted material atlas');
    assert.ok(calls.outputDraws > 1176, 'Periodic edges must be carried into the next large tile');
    assert.ok(calls.masks > 2352, 'Feathered patches plus baked tonal variation are drawn once');
    assert.equal(calls.gradients, (14 + 7) * MATERIALS.length,
        'Each material gets broad shading and real related-material accent patches');
    assert.equal(buildGroundQuiltAtlas({ width: 320, height: 64 }, 1441, factory), null);
});

test('painter samples a continuous world-aligned texture, never screenshot blocks', () => {
    const board = materialSampleBoard();
    const atlas = { width: GROUND_TILE_SIZE * MATERIALS.length, height: GROUND_TILE_SIZE };
    const calls = [];
    const ctx = { drawImage(...args) { calls.push(args); } };
    assert.equal(drawReferenceGroundBoard(ctx, board, atlas), true);
    assert.equal(calls.length, COLS * ROWS);
    for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++) {
            const [image,sx,sy,sw,sh,x,y,w,h] = calls[row * COLS + col];
            assert.equal(image, atlas);
            assert.equal(sx, board[row * COLS + col] * GROUND_TILE_SIZE +
                (col * CELL + (1441 % 7) * CELL) % GROUND_TILE_SIZE);
            assert.equal(sy, (row * CELL + (1441 % 7) * CELL) % GROUND_TILE_SIZE);
            assert.deepEqual([sw,sh,x,y,w,h],
                [CELL,CELL,col * CELL,row * CELL,CELL,CELL]);
        }
    assert.equal(drawReferenceGroundBoard(ctx, board, null), false);
    assert.equal(drawReferenceGroundBoard(ctx, board, { width: 320, height: 64 }), false);
});

test('iPhone touch drags work and previous procedural tile generators are not used', () => {
    const js = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-materials.js', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/Pages/ArenaMaterialsLab.razor.css', import.meta.url), 'utf8');
    assert.match(page, /@page "\/arena-materials"/);
    assert.match(page, /initMaterialsLab/);
    assert.match(page, /Pick\(5\)/);
    assert.match(js, /'touchstart', preventScroll, \{ passive: false \}/);
    assert.match(js, /'touchmove', preventScroll, \{ passive: false \}/);
    assert.match(js, /setPointerCapture/);
    assert.match(css, /touch-action:none/);
    assert.doesNotMatch(js, /MATERIAL_REFERENCE_ATLAS|const palettes|function materialNoise|function drawGroundMaterialTile|drawMaterialBoard|drawArenaEnvironment/);
    assert.ok(js.includes('buildGroundQuiltAtlas(atlas, state.seed)'));
});
