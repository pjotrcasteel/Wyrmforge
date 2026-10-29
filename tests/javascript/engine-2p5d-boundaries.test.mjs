import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../../', import.meta.url));
const scripts = join(project, 'src/Wyrmforge.Presentation.Web/wwwroot/js');
const read = path => readFileSync(join(project, path), 'utf8');

// Audit only first-party runtime code. The bundled Three.js renderer is a permitted
// implementation detail for orthographic sprite planes, not a 3D character system.
function firstPartySources(folder = scripts) {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return entry.name === 'vendor' ? [] : firstPartySources(path);
        return entry.isFile() && entry.name.endsWith('.js')
            ? [{ path: relative(scripts, path).replaceAll('\\', '/'), source: readFileSync(path, 'utf8') }]
            : [];
    });
}

test('runtime has one shared GPU lighting engine, not a second scene-owned lighting engine', () => {
    const owners = firstPartySources().filter(file => /\bclass\s+LightingEngine\b/.test(file.source));
    assert.deepEqual(owners.map(file => file.path), ['lighting/engine.js']);
});

test('2.5D GPU lighting uses orthographic projection and sprite planes, not a runtime character mesh requirement', () => {
    const engine = read('src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/engine.js');
    const sprite = read('src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/lit-sprite.js');
    assert.match(engine, /new T\.OrthographicCamera\s*\(/);
    assert.match(sprite, /new THREE\.PlaneGeometry\s*\(/);
    assert.match(sprite, /clip\.anchor/);
    assert.match(sprite, /clip\.cell/);
});

test('authored actors remain 2D atlas sprites with native pixel sampling', () => {
    const actors = read('src/Wyrmforge.Presentation.Web/wwwroot/js/rigged-sprites.js');
    assert.match(actors, /ctx\.drawImage\s*\(/);
    assert.match(actors, /ctx\.imageSmoothingEnabled\s*=\s*false/);
    assert.match(actors, /manifest\.directions/);
});

test('3D model loaders and runtime skeletal mesh animation cannot be added silently', () => {
    const prohibited = /\b(?:GLTFLoader|FBXLoader|OBJLoader|SkinnedMesh|AnimationMixer)\b|['"][^'"]+\.(?:glb|gltf|fbx)(?:[?'"])/;
    const offenders = firstPartySources().filter(file => prohibited.test(file.source)).map(file => file.path);
    assert.deepEqual(offenders, [],
        'A live 3D-model runtime needs explicit owner approval and a mobile 2.5D comparison');
});

test('C# remains the single gameplay authority behind the pixel-art Hunt', () => {
    const simulation = read('src/Wyrmforge.Application/Runs/Simulation/RunSimulation.cs');
    const arena = read('src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js');
    assert.match(simulation, /public sealed partial class RunSimulation/);
    assert.match(arena, /invokeMethodAsync\('Frame'/);
});
