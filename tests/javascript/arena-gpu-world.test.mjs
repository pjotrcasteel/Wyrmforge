import test from 'node:test';
import assert from 'node:assert/strict';
import { huntLightFrame } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

test('Hunt lights track camera with the same world scale and handedness as receivers', () => {
    const frame = { version: 1, time: 2, environment: { ambient: 0 }, lights: [{
        id: 'source', position: [144, 240, 24], direction: [1, 2, -1], range: 144,
        intensity: 1, enabled: true, castsShadow: true,
    }] };
    const original = structuredClone(frame);
    const projected = huntLightFrame(frame, { x: 48, y: 96 });
    assert.deepEqual(projected.lights[0].position, [2, -3 * Math.SQRT2, .5]);
    assert.deepEqual(projected.lights[0].direction, [1, -2 * Math.SQRT2, -1].map(v => v / Math.sqrt(10)));
    assert.equal(projected.lights[0].range, 3);
    assert.equal(projected.lights[0].intensity, 1);
    assert.deepEqual(frame, original);
    assert.equal(projected.environment.ambient, 0);
    assert.deepEqual(huntLightFrame({ ...frame, lights: [] }, { x: 0, y: 0 }).lights, []);
});

test('authored sprite foot anchor stays on the ground and its billboard faces the Hunt camera', async () => {
    const { huntActorGeometry } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const geometry = huntActorGeometry();
    const normal = new T.Vector3().fromBufferAttribute(geometry.attributes.normal, 0);
    assert.ok(normal.dot(new T.Vector3(0, 0, 1)) > .99999,
        'Billboard geometry remains unpitched until the actual camera orientation is applied.');
    const top = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 0);
    const bottom = new T.Vector3().fromBufferAttribute(geometry.attributes.position, 2);
    const up = new T.Vector3(0, 1, 0);
    assert.ok(Math.abs(bottom.y) < 1e-8 && Math.abs(bottom.z) < 1e-8,
        'The unrotated sprite foot edge is the local origin, never a vertical image crop.');
    assert.ok(Math.abs(top.clone().sub(bottom).dot(up) - 1) < 1e-6,
        'The original sprite has exactly one full unit of local height.');
    for (let i = 0; i < geometry.attributes.position.count; i++) {
        const vertex = new T.Vector3().fromBufferAttribute(geometry.attributes.position, i);
        assert.ok(vertex.z >= -1e-8, 'No actor pixels may be hidden underneath the ground mesh.');
    }
    const uv = geometry.getAttribute('uv');
    assert.equal(uv.getY(2), 0, 'Atlas bounds, not shared geometry, specify the painted foot crop.');
    assert.equal(uv.getY(0), 1, 'The source sprite head must never be cropped.');
    geometry.dispose();
});

test('G4 aligns only standing actor planes to the live camera without altering ground and lights', async () => {
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const { alignHuntActorBillboards } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const camera = new T.Object3D();
    camera.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), 1.1);
    const actor = { quaternion: new T.Quaternion() };
    const caster = { quaternion: new T.Quaternion() };
    const ground = { quaternion: new T.Quaternion() };
    const engine = { camera, objects: new Map([
        ['actor', { mesh: actor, caster }],
        ['ground', { mesh: ground }],
    ]) };
    alignHuntActorBillboards([
        { id: 'actor', geometry: 'hunt-billboard' },
        { id: 'ground', geometry: 'hunt-plane' },
        { id: 'missing', geometry: 'hunt-billboard' },
    ], engine);
    assert.ok(actor.quaternion.angleTo(camera.quaternion) < 1e-7);
    assert.ok(caster.quaternion.angleTo(camera.quaternion) < 1e-7);
    assert.ok(ground.quaternion.angleTo(new T.Quaternion()) < 1e-7,
        'Terrain receiver must retain its original world orientation.');
});

test('mage, Warden and Wyrm retain their own painted foot line without ground penetration', async () => {
    const { huntSurfaceRenderable } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    for (const layer of [
        { kind: 'mage', depth: 320 },
        { kind: 'enemy', enemy: { entityId: 'warden', x: 400, y: 320, radius: 44 } },
        { kind: 'dragon', dragon: { entityId: 'wyrm', x: 400, y: 320, radius: 90 } },
    ]) {
        const actor = layer.enemy ?? layer.dragon ?? { x: 400, y: 320, radius: 12 };
        const capture = huntLayerCapture(layer, actor);
        const mesh = huntSurfaceRenderable(capture.id, capture.x, capture.y,
            capture.size, capture.size, true, { footFraction: capture.footFraction });
        assert.equal(mesh.geometry, 'hunt-billboard');
        assert.ok(capture.footFraction > .75 && capture.footFraction <= 1,
            'Painted ankles, bell body and wyrm tail must remain in the texture');
        assert.equal(mesh.scale[1], capture.size / 48,
            'The full source sprite height must survive every painted-foot pivot.');
        assert.equal(mesh.scale[0], mesh.scale[1],
            'Square captures must never be squashed by the grounding adapter.');
        assert.equal(mesh.frame, undefined, 'Do not crop authored legs or tail artwork.');
        const sourceBottomY = capture.y + capture.size;
        assert.ok(Math.abs(-mesh.position[1] * 48 / Math.SQRT2 - sourceBottomY) < 1e-8,
            'Visible sprite bottom must match the exact existing Canvas capture rectangle.');
    }
    const invalid = () => huntSurfaceRenderable('bad', 0, 0, 100, 100, true, { footFraction: 1.5 });
    assert.throws(invalid, RangeError);
});

test('G4 mage Warden Wyrm project to exact Canvas source pixels at every phone aspect ratio', async () => {
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const { huntActorGeometry, huntSurfaceRenderable } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const geometry = huntActorGeometry();
    try {
        for (const [viewportWidth, viewportHeight] of [[320, 568], [390, 844], [402, 656], [844, 390]]) {
            const halfWidth = viewportWidth / 48 / 2;
            const centerY = -viewportHeight * Math.SQRT2 / 48 / 2;
            const camera = new T.OrthographicCamera(-halfWidth, halfWidth,
                halfWidth * viewportHeight / viewportWidth,
                -halfWidth * viewportHeight / viewportWidth, .1, 80);
            camera.up.set(0, 0, 1);
            camera.position.set(halfWidth, centerY - 30, 30);
            camera.lookAt(halfWidth, centerY, 0);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld();

            for (const layer of [
                { kind: 'mage', depth: 320 },
                { kind: 'enemy', enemy: { entityId: 'bell-warden', x: 210, y: 320, radius: 44 } },
                { kind: 'dragon', dragon: { entityId: 'ashfang-wyrm', x: 210, y: 320, radius: 90 } },
            ]) {
                const actor = layer.enemy ?? layer.dragon ?? { x: 210, y: 320, radius: 12 };
                const capture = huntLayerCapture(layer, actor);
                const x = capture.x - 50, y = capture.y - 70;
                const sprite = huntSurfaceRenderable(capture.id, x, y,
                    capture.size, capture.size, true, { footFraction: capture.footFraction });
                const pixels = [];
                for (let index = 0; index < geometry.attributes.position.count; index++) {
                    const vertex = new T.Vector3().fromBufferAttribute(geometry.attributes.position, index);
                    vertex.multiply(new T.Vector3(...sprite.scale))
                        .applyQuaternion(camera.quaternion)
                        .add(new T.Vector3(...sprite.position))
                        .project(camera);
                    pixels.push({
                        x: (vertex.x + 1) * viewportWidth / 2,
                        y: (1 - vertex.y) * viewportHeight / 2,
                    });
                }
                const bounds = {
                    left: Math.min(...pixels.map(point => point.x)),
                    right: Math.max(...pixels.map(point => point.x)),
                    top: Math.min(...pixels.map(point => point.y)),
                    bottom: Math.max(...pixels.map(point => point.y)),
                };
                const error = Math.max(
                    Math.abs(bounds.left - x),
                    Math.abs(bounds.right - (x + capture.size)),
                    Math.abs(bounds.top - y),
                    Math.abs(bounds.bottom - (y + capture.size)));
                // The 0.001-unit Z lift avoids depth fighting and shifts the
                // projected image by only ~0.034px; no actual texel is stretched.
                assert.ok(error < .05,
                    layer.kind + ' at ' + viewportWidth + 'x' + viewportHeight +
                    ' shifted or distorted by ' + error + 'px: ' +
                    JSON.stringify({ source: { x, y, size: capture.size }, bounds }));
            }
        }
    } finally {
        geometry.dispose();
    }
});

test('same-depth walls keep distinct stable GPU IDs and crop their own footprints', async () => {
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const left = { kind: 'masonry', depth: 325, width: 1000, height: 1000,
        barrier: { kind: 'ruin', x: 0, y: .3, width: .38, height: .025 } };
    const right = { ...left, barrier: { ...left.barrier, x: .62 } };
    const a = huntLayerCapture(left, { x: 500, y: 800 });
    const b = huntLayerCapture(right, { x: 500, y: 800 });
    assert.notEqual(a.id, b.id, 'Shared depth is not a unique material identity.');
    assert.deepEqual(a, huntLayerCapture(left, { x: 10, y: 20 }));
    assert.ok(a.x <= 0 && a.x + a.size >= 380);
    assert.ok(a.y <= 300 && a.y + a.size >= 325);
    assert.ok(b.x <= 620 && b.x + b.size >= 1000);
});

test('prop and dead-boss GPU resources stay at their own world positions', async () => {
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const player = { x: 20, y: 30 };
    const prop = huntLayerCapture({ kind: 'masonry', width: 1000, height: 1500,
        prop: { id: 7, x: .8, y: .6, radius: 16 } }, player);
    assert.equal(prop.id, 'hunt-prop:7');
    assert.equal(prop.x + prop.size / 2, 800);
    assert.equal(prop.y + prop.size * .75, 900);
    const death = huntLayerCapture({ kind: 'dragonDeath', depth: 600 }, player, { id: 9, x: 700, y: 600, radius: 60 });
    assert.equal(death.id, 'hunt-dragonDeath:9');
    assert.equal(death.x + death.size / 2, 700);
    assert.equal(death.y + death.size * .75, 600);
});


test('Generic directional emitters preserve orientation and unit length across camera movement', () => {
    for (const direction of [[1,0,0],[0,1,0],[0,0,-1],[.3,.4,-.5],[0,0,0]]) {
        const frame={ lights:[{id:'arbitrary-emitter',position:[10,20,30],direction,range:120,intensity:2,expiresAt:4}] };
        const a=huntLightFrame(frame,{x:0,y:0}).lights[0];
        const b=huntLightFrame(frame,{x:300,y:-200}).lights[0];
        assert.deepEqual(a.direction,b.direction);
        assert.ok(Math.abs(Math.hypot(...a.direction)-(Math.hypot(...direction)>0?1:0))<1e-12);
        assert.equal(a.expiresAt,4);
        assert.equal(a.id,'arbitrary-emitter');
    }
});


test('Offscreen sources cannot consume the budget needed by visible explosions', async () => {
    const { selectLights } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js');
    const source=(id,x,type='point')=>({id,type,position:[x,100,24],direction:[0,0,-1],range:80,intensity:1,enabled:true,priority:0,castsShadow:false});
    const frame={time:0,lights:[...Array.from({length:12},(_,i)=>source('a-distant-'+i,2000+i)),source('z-explosion',200)]};
    const original=structuredClone(frame);
    const visible=huntLightFrame(frame,{x:0,y:0},{width:390,height:844});
    assert.deepEqual(selectLights(visible,6,8).map(l=>l.id),['z-explosion']);
    assert.deepEqual(frame,original);
    frame.lights=[source('spill',-79),source('outside',-81),source('sun',2000,'directional')];
    assert.deepEqual(huntLightFrame(frame,{x:0,y:0},{width:390,height:844}).lights.map(l=>l.id),['spill','sun']);
    assert.deepEqual(huntLightFrame(frame,{x:1900,y:0},{width:390,height:844}).lights.map(l=>l.id),['sun']);
});

test('live Hunt maintains one legacy enemy draw and one shared GPU path after main integration', async () => {
    const { readFile } = await import('node:fs/promises');
    const url = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url);
    const code = await readFile(url, 'utf8');
    const begin = code.indexOf("} else if (layer.kind === 'enemy') {");
    const mageBranch = /}\s*else\s*\{\s*\n\s*drawMage\(/.exec(code.slice(begin));
    const end = mageBranch ? begin + mageBranch.index : -1;
    assert.ok(begin >= 0 && end > begin, 'Enemy rendering must remain depth-sorted');
    const enemyBranch = code.slice(begin, end);
    assert.equal((enemyBranch.match(/drawActorWithEmitter\(/g) ?? []).length, 1,
        'Legacy alpha-isolated actor draw must not be duplicated during merges');
    assert.equal((enemyBranch.match(/drawEliteCrest\(/g) ?? []).length, 1,
        'Elite crests must be painted exactly once');
    assert.match(enemyBranch, /if \(gpu\)/);
    assert.match(enemyBranch, /else\s*\{/);
    assert.match(code, /gpu\.render\(ctx, state\.sharedLightingFrame\)/,
        'The selected C# authoritative frame must feed the shared GPU engine');
    assert.match(code, /drawDamageNumbers\(ctx, snapshot\.damageNumbers/);
    assert.match(code, /drawTargetIndicator\(ctx, targetIndicator, 'ground'/);
});


test('GPU light quality profiles retain mobile shadow budgets without asset decisions', async () => {
    const { lightingQualityBudget } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/quality.js');
    const mobile = lightingQualityBudget('mobile'), balanced = lightingQualityBudget(), high = lightingQualityBudget('high');
    assert.deepEqual(balanced, { maxLights: 8, shadowViews: 6, shadowMapSize: 512 },
        'Existing Hunt quality must not change without explicit opt-in');
    assert.deepEqual(mobile, { maxLights: 6, shadowViews: 6, shadowMapSize: 256 });
    assert.deepEqual(high, { maxLights: 12, shadowViews: 8, shadowMapSize: 1024 });
    assert.ok(mobile.maxLights <= balanced.maxLights && balanced.maxLights <= high.maxLights);
    mobile.shadowMapSize = 4096;
    assert.equal(lightingQualityBudget('mobile').shadowMapSize, 256,
        'Renderer budgets must not be mutable through an asset descriptor');
    assert.throws(() => lightingQualityBudget('invalid'), RangeError);
    assert.throws(() => lightingQualityBudget('toString'), RangeError);
});

test('camera-relative Hunt light budget tracks the GPU view and maintains shadow cost', async () => {
    const { selectLights } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js');
    const budget = { maxLights: 1, shadowViews: 6 };
    const light = (id, x, intensity = 8) => ({
        id, ownerId: id, enabled: true, type: 'point', color: '#ffccaa',
        position: [x, 320, 24], direction: [0, 0, -1], range: 160,
        intensity, coneAngle: .5, penumbra: 0, priority: 1, castsShadow: true,
    });
    const sources = { version: 1, time: 0, lights: [light('a-left', 140), light('z-right', 340)] };
    const view = { minX: 0, maxX: 390 / 48, minY: -844 * Math.SQRT2 / 48, maxY: 0 };
    const selectForCamera = camera => {
        const projected = huntLightFrame(sources, camera, { width: 390, height: 844 });
        return selectLights(projected, budget.shadowViews, budget.maxLights, view);
    };
    const first = selectForCamera({ x: 0, y: 0 });
    const second = selectForCamera({ x: 200, y: 0 });
    assert.deepEqual(first.map(l => l.id), ['a-left']);
    assert.deepEqual(second.map(l => l.id), ['z-right']);
    assert.deepEqual(first.map(l => l.shadowViews), [6]);
    assert.deepEqual(second.map(l => l.shadowViews), [6]);
    assert.equal(sources.lights[0].position[0], 140);
});


test('authoritative projectile point light retains one mobile shadow budget and lit Hollowed cutout', async () => {
    const { selectLights } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js');
    const { huntSurfaceRenderable } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const snapshot = { version: 1, time: 3, lights: [
        { id: 'sky:moon', ownerId: 'night-sky', type: 'directional', enabled: true,
            position: [0, 0, 256], direction: [0, 0, -1], color: '#91a6c5',
            intensity: 2.2, range: 8192, castsShadow: false, priority: 0 },
        { id: 'hunter:night-visibility', ownerId: 'hunter', type: 'point', enabled: true,
            position: [180, 200, 64], direction: [0, 0, 0], color: '#bfc9dc',
            intensity: 14, range: 210, castsShadow: false, priority: 0 },
        { id: 'projectile:fire-test', ownerId: 'fire-test', type: 'point', enabled: true,
            position: [240, 220, 24], direction: [0, 0, 0], color: '#ff7835',
            intensity: 6, range: 144, castsShadow: true, priority: 0 },
    ] };
    const projected = huntLightFrame(snapshot, { x: 0, y: 0 },
        { width: 390, height: 844 });
    const selected = selectLights(projected, 6, 6,
        { minX: 0, maxX: 390 / 48, minY: -844 * Math.SQRT2 / 48, maxY: 0 });
    const fire = selected.find(light => light.id === 'projectile:fire-test');
    assert.ok(fire && fire.shadow && fire.shadowViews === 6,
        'Fireball casts a point shadow rather than being silently budgeted out.');
    const hollowed = huntSurfaceRenderable('hunt-enemy:hollowed', 190, 120, 160, 160,
        true, { footFraction: .8 });
    assert.equal(hollowed.receivesLight, true);
    assert.equal(hollowed.receivesShadow, true);
    assert.equal(hollowed.castsShadow, true);
    assert.equal(hollowed.frame, undefined, 'Actor should not be compressed or cropped.');
});
