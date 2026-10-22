import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const path = new URL('../../tools/art/step3_wet_forest.py', import.meta.url);
const source = readFileSync(path, 'utf8');
const catalog = JSON.parse(readFileSync(
    new URL('../../art/source/environment/wet-forest/catalog.json', import.meta.url), 'utf8'));

test('new Step 3 tree models are original, editable and remain outside gameplay', () => {
    assert.equal(catalog.integration, 'none; production candidates only');
    assert.equal(catalog.sourceGenerator, 'tools/art/step3_wet_forest.py');
    assert.ok(catalog.assets.some(a => a.id === 'ancient_oak'));
    assert.ok(catalog.assets.some(a => a.id === 'dead_elm'));
    assert.ok(catalog.assets.every(a => a.review === 'missing'));
    assert.ok(catalog.rules.some(rule => rule.includes('No old sprites')));
    for (const a of catalog.assets.filter(a => a.state === 'source-ready-unrendered')) {
        assert.match(a.source, /\.blend$/);
        assert.match(a.sprite, /\.png$/);
    }
});

test('3D source preserves .blend and transparent sprite as separate artifacts', () => {
    assert.match(source, /bpy\.ops\.wm\.save_as_mainfile\(filepath=str\(blend\)\)/);
    assert.match(source, /if blend\.exists\(\) and not args\.force:/);
    assert.match(source, /scene\.render\.film_transparent = True/);
    assert.match(source, /scene\.render\.image_settings\.color_mode = "RGBA"/);
    assert.match(source, /separateGroundShadow/);
    assert.match(source, /bpy\.ops\.render\.render\(write_still=True\)/);
    assert.doesNotMatch(source, /import .*arena-|legacy.*\.png|oldAtlas|load.*environment\.png/);
});

test('Blender source syntax is checked even when Blender itself is not installed on CI', () => {
    const result = spawnSync('python3', [
        '-c', 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))',
        'tools/art/step3_wet_forest.py',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
});
