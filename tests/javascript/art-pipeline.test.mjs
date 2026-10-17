import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng } from '../../tools/art/lib/png.mjs';
import { artReady, drawArtFrame, hasArtFrame, installArtForTesting, resetArtForTesting, loadArt, atlasImageUrl } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/art-atlas.js';
import { createTerritoryWallLayers, runeLit, territoryRuneSchool, territoryWallStyle, drawTerritoryWall } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-territory-walls.js';
import { mageFacing, resolveMageFacing } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-mage.js';
import { enemyFacing, enemySpriteName } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-art.js';
import { createDecalPlan, createForestEdgePlan } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

const artRoot = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/art/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', artRoot), 'utf8'));
const frames = atlas => manifest.atlases[atlas].frames;

test('committed runtime art matches the deterministic generator', () => {
    const result = spawnSync(process.execPath, ['tools/art/build-art.mjs', '--check'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('manifest declares provenance and one art pixel per world unit', () => {
    assert.equal(manifest.pixelsPerWorldUnit, 1);
    assert.match(manifest.provenance, /original|generated|code/i);
    for (const atlas of ['actors', 'wyrms', 'tiles', 'environment', 'icons']) assert.ok(manifest.atlases[atlas], atlas);
});

test('every atlas png decodes at its declared size and every frame lies inside it', () => {
    for (const [name, atlas] of Object.entries(manifest.atlases)) {
        const png = decodePng(readFileSync(new URL(atlas.image, artRoot)));
        assert.equal(png.width, atlas.width, `${name} width`);
        assert.equal(png.height, atlas.height, `${name} height`);
        for (const [id, f] of Object.entries(atlas.frames)) {
            assert.ok(f.w > 0 && f.h > 0, id);
            assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= atlas.width && f.y + f.h <= atlas.height, `${id} inside ${name}`);
            assert.ok(Number.isFinite(f.ax) && Number.isFinite(f.ay), `${id} anchor`);
            let opaque = 0;
            for (let y = f.y; y < f.y + f.h && !opaque; y++) for (let x = f.x; x < f.x + f.w; x++) if (png.rgba[(y * png.width + x) * 4 + 3]) { opaque++; break; }
            assert.ok(opaque, `${id} is not empty`);
        }
    }
    const hub = decodePng(readFileSync(new URL(manifest.images.hubBackdrop.image, artRoot)));
    assert.deepEqual([hub.width, hub.height], [manifest.images.hubBackdrop.width, manifest.images.hubBackdrop.height]);
});

test('mage has every facing, pose and hit variant the renderer requests', () => {
    for (const face of ['S', 'N', 'E']) for (const pose of ['idle', 'walkA', 'walkB', 'windup', 'release', 'followThrough', 'surgeRelease'])
        for (const hit of ['', '.hit']) assert.ok(frames('actors')[`mage.${face}.${pose}${hit}`], `mage.${face}.${pose}${hit}`);
});

test('every enemy kind, walk phase, attack pose and state, and every wyrm phase has a sprite', () => {
    for (let kind = 0; kind < 10; kind++) for (const telegraph of [null, { kind: 'pounce' }])
        for (let phase = 0; phase < 3; phase++) for (const state of [{}, { hitFlash: true }, { frozen: true }]) {
            const name = enemySpriteName({ kind, telegraph, ...state }, phase);
            assert.ok(frames('actors')[name], name);
            assert.ok(frames('actors')[name].radius > 0, `${name} radius`);
        }
    for (let kind = 0; kind < 4; kind++) {
        assert.ok(frames('wyrms')[`wyrm.${kind}.frozen`]);
        for (const p of [1, 2]) for (const f of [0, 1]) assert.ok(frames('wyrms')[`wyrm.${kind}.p${p}.f${f}`]);
    }
});

test('environment covers biome walls, school runes, landmarks, shards, caches and tiles', () => {
    for (const biome of ['valley', 'ash', 'ridge']) {
        for (const part of ['cap', 'face', 'foot']) assert.ok(frames('environment')[`wall.${biome}.${part}`]);
        assert.ok(frames('tiles')[`tile.${biome}`]);
    }
    for (const school of ['arcane', 'fire', 'frost', 'storm']) for (const s of ['lit', 'dim']) assert.ok(frames('environment')[`rune.${school}.${s}`]);
    for (const kind of ['pyre', 'forge', 'caravan', 'watchtower', 'ossuary', 'banner', 'chapel', 'waystation', 'altar']) assert.ok(frames('environment')[`ruin.${kind}`], kind);
    for (const size of ['small', 'medium', 'large']) for (const g of [0, 1]) assert.ok(frames('environment')[`shard.${size}.${g}`]);
    for (const c of ['experience', 'health']) for (const s of ['open', 'sealed']) assert.ok(frames('environment')[`cache.${c}.${s}`]);
    for (const id of ['wall.portcullis', 'wall.rubble', 'exit.waystone', 'ruin.slab', 'ruin.rubble']) assert.ok(frames('environment')[id], id);
});

test('generated icon css exposes every icon at 1x, 2x and 3x', () => {
    const css = readFileSync(new URL('icons.css', artRoot), 'utf8');
    for (const cls of ['.px-icon', '.px-sm', '.px-lg']) assert.ok(css.includes(cls), cls);
    for (const id of Object.keys(frames('icons'))) assert.ok(css.includes(`.px-${id.slice(5)}`), id);
    assert.match(css, /image-rendering:\s*pixelated/);
});

test('art loader degrades to code-painted fallbacks outside the browser', async () => {
    resetArtForTesting();
    assert.equal(await loadArt('art/'), false);
    assert.equal(artReady(), false);
    assert.equal(drawArtFrame({ drawImage() { throw new Error('should not draw'); } }, 'actors', 'mage.S.idle', 0, 0), false);
    resetArtForTesting();
});

test('drawArtFrame anchors, scales and mirrors frames', () => {
    installArtForTesting(manifest, { actors: { tag: 'actors' } });
    try {
        const calls = [];
        const ctx = { save() {}, restore() {}, translate: (x, y) => calls.push(['t', x, y]), scale: (x, y) => calls.push(['s', x, y]),
            drawImage: (...args) => calls.push(['d', ...args]), set globalAlpha(v) { calls.push(['a', v]); }, get globalAlpha() { return 1; }, imageSmoothingEnabled: true };
        const f = frames('actors')['mage.E.idle'];
        assert.equal(drawArtFrame(ctx, 'actors', 'mage.E.idle', 100, 50, { scale: 2, flipX: true }), true);
        const draw = calls.find(c => c[0] === 'd');
        assert.equal(draw[1].tag, 'actors');
        assert.deepEqual(draw.slice(2, 6), [f.x, f.y, f.w, f.h]);
        assert.ok(calls.some(c => c[0] === 's' && c[1] < 0), 'mirrored');
        assert.equal(ctx.imageSmoothingEnabled, false);
        assert.equal(drawArtFrame(ctx, 'actors', 'mage.missing', 0, 0), false);
        assert.equal(hasArtFrame('actors', 'mage.N.walkA'), true);
    } finally { resetArtForTesting(); }
});

test('mage facing follows dominant travel and turns toward an active cast', () => {
    assert.equal(mageFacing(5, 0), 'E');
    assert.equal(mageFacing(-5, 1), 'W');
    assert.equal(mageFacing(0, -3), 'N');
    assert.equal(mageFacing(1, 3), 'S');
    assert.equal(mageFacing(1, 1, 'E'), 'S', 'diagonals prefer the vertical read');
    assert.equal(mageFacing(0, 0, 'N'), 'N', 'standing still keeps the previous facing');
    assert.equal(resolveMageFacing('S', { angle: 0, progress: .3 }), 'E');
    assert.equal(resolveMageFacing('S', { angle: -Math.PI / 2, progress: .5 }), 'N');
    assert.equal(resolveMageFacing('W', { angle: 0, progress: 1 }), 'W', 'finished casts release the facing');
    assert.equal(resolveMageFacing(undefined, null), 'S');
});

test('enemy sprite names clamp kind and phase and prioritise hit over frozen', () => {
    assert.equal(enemySpriteName({ kind: 3 }, 2), 'enemy.3.2.normal');
    assert.equal(enemySpriteName({ kind: 11, hitFlash: true, frozen: true }, 7), 'enemy.9.2.hit');
    assert.equal(enemySpriteName({ kind: 1, telegraph: { kind: 'pounce' } }, 2), 'enemy.1.3.normal', 'committed attacks show the attack pose');
    assert.equal(enemySpriteName({ kind: -1, frozen: true }), 'enemy.0.0.frozen');
    assert.equal(enemyFacing(null, 4), 1);
    assert.equal(enemyFacing({ entities: new Map([[4, { facing: -1 }]]) }, '4'), -1);
});

test('territory walls project only closed barriers, outside cloisters, once art is ready', () => {
    const environment = { element: 'frost', barriers: [
        { x: .1, y: .3, width: .5, height: .02, open: false },
        { x: .6, y: .5, width: .2, height: .02, open: true },
        { x: .2, y: .7, width: 0, height: .02, open: false },
    ] };
    const plan = { biome: 'ash', story: { seed: 3 } };
    resetArtForTesting();
    assert.deepEqual(createTerritoryWallLayers(environment, plan, 1000, 2000), [], 'no art, no projection');
    installArtForTesting(manifest, {});
    try {
        const layers = createTerritoryWallLayers(environment, plan, 1000, 2000, 4);
        assert.equal(layers.length, 1);
        assert.equal(layers[0].kind, 'masonry');
        assert.equal(layers[0].style, 'territory');
        assert.equal(layers[0].depth, (.3 + .02) * 2000);
        assert.equal(layers[0].wallStyle, 'ash');
        assert.equal(layers[0].school, 'frost');
        assert.deepEqual(createTerritoryWallLayers(environment, { ...plan, story: { cloister: true } }, 1000, 2000), []);
        assert.equal(drawTerritoryWall({}, { ...layers[0], barrier: { ...layers[0].barrier, open: true } }), false);
    } finally { resetArtForTesting(); }
    assert.equal(territoryWallStyle('unknown'), 'valley');
    assert.equal(territoryRuneSchool('poison'), 'arcane');
});

test('mounted runes flicker deterministically and stay mostly lit', () => {
    const samples = Array.from({ length: 400 }, (_, i) => runeLit(i % 7, i * .05, 11));
    assert.deepEqual(samples, Array.from({ length: 400 }, (_, i) => runeLit(i % 7, i * .05, 11)));
    const lit = samples.filter(Boolean).length / samples.length;
    assert.ok(lit > .7 && lit < 1, `lit ratio ${lit}`);
});

test('every catalog glyph icon resolves to a generated pixel icon', () => {
    const repo = new URL('../../', import.meta.url);
    const mapSource = readFileSync(new URL('src/Wyrmforge.Presentation.Web/Shared/GameIconMap.cs', repo), 'utf8');
    const mapped = new Map([...mapSource.matchAll(/\["([^"]+)"\] = "([a-z]+)"/g)].map(m => [m[1], m[2]]));
    for (const id of new Set(mapped.values())) assert.ok(frames('icons')[`icon.${id}`], `icon.${id} exists`);
    const catalogs = ['src/Wyrmforge.Domain', 'src/Wyrmforge.Application'];
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const missing = new Set();
    const walk = dir => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) { if (!['bin', 'obj'].includes(entry.name)) walk(path); continue; }
            if (!/(Catalog|Presentation)\.cs$/.test(entry.name)) continue;
            for (const [, glyph] of readFileSync(path, 'utf8').matchAll(/"([^"\x00-\x7F]{1,3})"/g))
                for (const { segment } of segmenter.segment(glyph)) {
                    const symbol = segment.replace(/[\uFE0E\uFE0F]/g, '');
                    if (symbol && !['•', '—'].includes(symbol) && !mapped.has(symbol)) missing.add(`${symbol} (${entry.name})`);
                }
        }
    };
    for (const dir of catalogs) walk(fileURLToPath(new URL(dir, repo)));
    assert.deepEqual([...missing], [], 'add new catalog glyphs to Shared/GameIconMap.cs');
});

test('ground decals and forest edges are seeded, bounded and biome specific', () => {
    const plan = { biome: 'ridge', story: { seed: 42 } };
    const a = createDecalPlan(plan, 1200, 2100), b = createDecalPlan(plan, 1200, 2100);
    assert.deepEqual(a, b);
    assert.ok(a.length > 0 && a.length <= 300);
    assert.ok(a.every(d => d.x >= 0 && d.x <= 1200 && d.y >= 0 && d.y <= 2100 && frames('environment')[d.name]));
    assert.notDeepEqual(createDecalPlan({ ...plan, story: { seed: 43 } }, 1200, 2100), a);
    const edges = createForestEdgePlan(plan, 1200, 2100);
    assert.deepEqual(edges, createForestEdgePlan(plan, 1200, 2100));
    assert.ok(edges.every(p => frames('environment')[p.name] && (p.x < 40 || p.x > 1160)), 'props hug the outer band');
    assert.ok(edges.every((p, i) => i === 0 || edges[i - 1].y <= p.y), 'sorted by foot line');
});

test('atlas urls carry the content hash of the exact image the frame table was packed for', () => {
    for (const [name, atlas] of Object.entries(manifest.atlases)) {
        const digest = createHash('sha256').update(readFileSync(new URL(atlas.image, artRoot))).digest('hex').slice(0, 12);
        assert.equal(atlas.hash, digest, `${name} hash`);
        assert.equal(atlasImageUrl('art/', atlas), `art/${atlas.image}?v=${digest}`);
    }
    assert.equal(atlasImageUrl('art/', { image: 'x.png' }), 'art/x.png');
    assert.ok(readFileSync(new URL('icons.css', artRoot), 'utf8').includes(`icons.png?v=${manifest.atlases.icons.hash}`));
});
