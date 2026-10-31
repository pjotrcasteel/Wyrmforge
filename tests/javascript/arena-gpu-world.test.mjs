import test from 'node:test';
import assert from 'node:assert/strict';
import { huntLightFrame, HuntGpuWorld } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js';

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

test('Only visible actor billboards face the Hunt camera; shadow casters stay in world space', async () => {
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const { alignHuntActorBillboards } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const camera = new T.Object3D();
    camera.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), 1.1);
    const actor = { quaternion: new T.Quaternion() };
    const vertical = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    const caster = { quaternion: vertical.clone() };
    const authoredCaster = { quaternion: new T.Quaternion() };
    const ground = { quaternion: new T.Quaternion() };
    const engine = { camera, objects: new Map([
        ['actor', { mesh: actor, caster }],
        ['authored', { mesh: { quaternion: new T.Quaternion() }, caster: authoredCaster }],
        ['ground', { mesh: ground }],
    ]) };
    alignHuntActorBillboards([
        { id: 'actor', geometry: 'hunt-billboard', occluderGeometry: 'hunt-shadow-silhouette' },
        { id: 'authored', geometry: 'hunt-billboard', occluderGeometry: 'custom-3d-caster' },
        { id: 'ground', geometry: 'hunt-plane' },
        { id: 'missing', geometry: 'hunt-billboard' },
    ], engine);
    assert.ok(actor.quaternion.angleTo(camera.quaternion) < 1e-7);
    assert.ok(caster.quaternion.angleTo(vertical) < 1e-7,
        'Sprite occluders must be upright in world space, independent of camera pitch.');
    assert.ok(authoredCaster.quaternion.angleTo(new T.Quaternion()) < 1e-7,
        'Authored 3D casters retain their own rotation.');
    assert.ok(ground.quaternion.angleTo(new T.Quaternion()) < 1e-7,
        'Terrain receiver keeps its world rotation.');
});

test('Crossed shadow impostor has two perpendicular alpha faces and one GPU geometry', async () => {
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const { huntCrossedShadowGeometry } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const geometry = huntCrossedShadowGeometry();
    try {
        assert.equal(geometry.getAttribute('position').count, 8);
        assert.equal(geometry.index.count, 12, 'Two quads merge into one indexed shadow draw call.');
        const n = geometry.getAttribute('normal');
        const faceA = new T.Vector3().fromBufferAttribute(n, 0);
        const faceB = new T.Vector3().fromBufferAttribute(n, 4);
        assert.ok(Math.abs(faceA.dot(faceB)) < 1e-7,
            'Lights from X or Y must see an alpha face; one infinitely thin billboard cannot provide it.');
        const uv = geometry.getAttribute('uv');
        for (let i = 0; i < 4; i++) {
            assert.equal(uv.getX(i), uv.getX(i + 4));
            assert.equal(uv.getY(i), uv.getY(i + 4));
        }
        const p = geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
            assert.ok(p.getY(i) >= -1e-7 && p.getY(i) <= 1 + 1e-7,
                'The shared foot line and whole sprite height survive both rotated faces.');
    } finally {
        geometry.dispose();
    }
});

test('World-upright alpha casters preserve source pixels and meet the authored foot anchor', async () => {
    const { huntCaptureSilhouetteCaster } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    for (const height of [32, 64, 96, 160, 320]) {
        for (const footFraction of [.75, .92, 1]) {
            const caster = huntCaptureSilhouetteCaster(100, 200, height, height, footFraction);
            assert.equal(caster.occluderGeometry, 'hunt-shadow-silhouette');
            assert.deepEqual(caster.occluderRotation, [Math.PI / 2, 0, 0],
                'The occluder stands vertically in world coordinates, not in camera space.');
            assert.equal(caster.occluderScale[1], height * Math.SQRT2 / 48,
                'Camera projection must restore the source-pixel vertical scale.');
            assert.equal(caster.occluderScale[0], height / 48,
                'The alpha cutout retains source-pixel width and transparent padding.');
            assert.equal(caster.occluderPosition[0], (100 + height / 2) / 48);
            assert.ok(Math.abs(caster.occluderPosition[1] +
                (200 + height * footFraction) * Math.SQRT2 / 48) < 1e-12);
            const physicalFootZ = caster.occluderPosition[2] +
                (1 - footFraction) * caster.occluderScale[1];
            assert.ok(Math.abs(physicalFootZ) < 1e-12,
                'The painted foot line touches z=0, regardless of transparent padding.');
            assert.ok(caster.occluderScale[1] > 0);
        }
    }
    assert.throws(() => huntCaptureSilhouetteCaster(0, 0, 160, 160, 0), RangeError);
    assert.throws(() => huntCaptureSilhouetteCaster(0, 0, 160, 160, .8, 0), RangeError);
    assert.throws(() => huntCaptureSilhouetteCaster(0, 0, 160, 160, .8, NaN), RangeError);
    const physical = huntCaptureSilhouetteCaster(100, 200, 160, 160, .825, 32);
    assert.equal(physical.occluderScale[1], 32 / 48,
        'The collision/asset world height controls the shadow, not transparent capture padding.');
    assert.equal(physical.occluderScale[0], 160 / 48,
        'The alpha source maintains its full original width and UVs.');
    assert.ok(Math.abs(physical.occluderPosition[2] + .175 * 32 / 48) < 1e-12);
});

test('A padded enemy silhouette has an independent physical height, not a light-height clamp', async () => {
    const { huntCaptureSilhouetteCaster } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const caster = huntCaptureSilhouetteCaster(20, 100, 160, 160, .9, 32);
    assert.equal(caster.occluderScale[1], 32 / 48,
        'Physical caster dimensions must come from the standing-body contract.');
    assert.equal(caster.occluderScale[0], 160 / 48);
    assert.ok(caster.occluderScale[1] < 160 * Math.SQRT2 / 48,
        'Transparent capture padding is not physical world height.');
});

test('Moving and differently elevated lights cannot resize or reorient an actor silhouette', async () => {
    const T = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js');
    const { alignHuntActorBillboards, huntCaptureSilhouetteCaster } =
        await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const descriptor = { id: 'actor', geometry: 'hunt-billboard',
        ...huntCaptureSilhouetteCaster(20, 100, 160, 160, .9) };
    const expectedRotation = new T.Quaternion().setFromEuler(new T.Euler(...descriptor.occluderRotation));
    const mesh = { quaternion: new T.Quaternion() };
    const caster = { quaternion: expectedRotation.clone(), scale: { y: descriptor.occluderScale[1] },
        position: { z: descriptor.occluderPosition[2] } };
    const camera = new T.Object3D();
    camera.quaternion.setFromAxisAngle(new T.Vector3(1, 0, 0), .8);
    const engine = { camera, objects: new Map([['actor', { mesh, caster }]]),
        selected: [{ shadow: true, type: 'point', position: [0, 0, .5] }] };
    for (const height of [.1, .5, 2, 10]) {
        engine.selected[0].position[2] = height;
        alignHuntActorBillboards([descriptor], engine);
        assert.equal(caster.scale.y, descriptor.occluderScale[1]);
        assert.equal(caster.position.z, descriptor.occluderPosition[2]);
        assert.ok(caster.quaternion.angleTo(expectedRotation) < 1e-7);
        assert.ok(mesh.quaternion.angleTo(camera.quaternion) < 1e-7);
    }
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
        assert.equal(capture.occluderHeightPx, Math.max(4, Math.round(capture.size * .6 / 4) * 4),
            'A padded raster silhouette must retain enough upright pixel coverage to cast a real shadow.');
        const mesh = huntSurfaceRenderable(capture.id, capture.x, capture.y,
            capture.size, capture.size, true, { footFraction: capture.footFraction });
        assert.equal(mesh.geometry, 'hunt-billboard');
        assert.ok(layer.kind === 'enemy' ? capture.footFraction === .75 :
            capture.footFraction > .75 && capture.footFraction <= 1,
            'Enemy sprite atlas anchors use canonical C# feet; mage/Wyrm retain legacy painted offsets');
        if (layer.kind === 'enemy')
            assert.equal(capture.y + capture.size * capture.footFraction, actor.y,
                'The enemy shadow caster is planted at the same authoritative Y as its sprite and target sigil.');
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


test('Hollowed and Ashling shadow anchors do not drift south as capture sizes vary', async () => {
    const { huntLayerCapture } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/hunt-gpu-layers.js');
    const { huntCaptureSilhouetteCaster } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    for (const radius of [8, 11, 24, 44]) {
        const enemy = { entityId: radius, x: 260, y: 340, radius };
        const capture = huntLayerCapture({ kind: 'enemy', enemy }, null);
        assert.equal(capture.footFraction, .75);
        assert.equal(capture.occluderHeightPx, Math.max(4, Math.round(capture.size * .6 / 4) * 4));
        assert.equal(capture.y + capture.size * capture.footFraction, enemy.y);
        const caster = huntCaptureSilhouetteCaster(capture.x, capture.y, capture.size,
            capture.size, capture.footFraction, capture.occluderHeightPx);
        assert.ok(Math.abs(-caster.occluderPosition[1] * 48 / Math.SQRT2 - enemy.y) < 1e-10,
            'The projected GPU caster foot must coincide with the canonical world foot.');
    }
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


test('A cutout keeps translucent padding out of the shadow while grounding the opaque feet', async () => {
    const { huntCaptureSilhouetteCaster, huntSurfaceMaterial } =
        await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const height = 160, footFraction = 146 / 160;
    const caster = huntCaptureSilhouetteCaster(20, 100, 160, height, footFraction);
    const alphaFootV = 1 - footFraction;
    const opaqueFootZ = caster.occluderPosition[2] + alphaFootV * caster.occluderScale[1];
    assert.ok(Math.abs(opaqueFootZ) < 1e-12);
    const material = huntSurfaceMaterial('silhouette');
    assert.ok(material.alphaCutoff > 0, 'G1 material alpha test discards transparent pixels in the depth pass.');
    assert.equal(caster.occluderScale[0], 160 / 48);
    assert.equal(caster.occluderScale[1], 160 * Math.SQRT2 / 48);
});

test('live GPU shadow pixel proof isolates one real light and restores its renderer state', () => {
    const light = { castShadow: true };
    const frames = [];
    const lit = Uint8Array.from([0, 0, 0, 255, 200, 200, 200, 255]);
    const unshadowed = Uint8Array.from([30, 30, 30, 255, 200, 200, 200, 255]);
    const actor = { visible: true };
    const engine = {
        lights: new Map([['projectile:proof', light]]),
        objects: new Map([['hunt-ground', { mesh: { visible: true } }], ['hunt-enemy:proof', { mesh: actor }]]),
        canvas: { width: 2, height: 1 },
        render() { frames.push(light.castShadow); },
        pixels() { return light.castShadow ? lit : unshadowed; },
    };
    const world = { engine, width: 2, height: 1 };
    const measured = HuntGpuWorld.prototype.shadowPixelProof.call(world, 'projectile:proof');
    assert.deepEqual(measured, {
        sourceId: 'projectile:proof', available: true, changedPixels: 1,
        maxPixelDelta: 90, groundOnly: true, framebuffer: [2, 1],
    });
    assert.deepEqual(frames, [true, false, true],
        'The test renders the same scene with one source shadow disabled, then restores it.');
    assert.equal(light.castShadow, true, 'A visual proof cannot alter subsequent gameplay frames.');
    assert.equal(actor.visible, true, 'A ground-only proof must restore actor presentation.');
    assert.equal(HuntGpuWorld.prototype.shadowPixelProof.call(world, 'unknown').available, false);
});

test('live Hunt reports authoritative shadow demand separately from the one-point-light mobile budget', async () => {
    const { huntShadowAllocationReport } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-gpu-world.js');
    const { selectLights } = await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/registry.js');
    const create=(id,x,y,intensity,castsShadow,priority=0,type='point')=>({
        id,ownerId:id,type,enabled:true,position:[x,y,type==='directional'?256:24],
        direction:[0,0,-1],color:'#ff7835',intensity,range:type==='directional'?8192:144,
        coneAngle:Math.PI/4,penumbra:0,castsShadow,priority
    });
    // Mirrors the kinds of C# and presentation emitters coexisting during a
    // Hunt. One mobile cubemap (six views) cannot shadow two Fireballs.
    const frame={lights:[
        create('sky:moon',0,0,2.2,false,0,'directional'),
        create('hunter:night-visibility',195,320,14,false),
        create('target-selection:underlight',225,300,.9,false,1),
        create('projectile:one',195,282,6,true),
        create('projectile:two',195,378,6,true),
    ]};
    const converted=huntLightFrame(frame,{x:0,y:0},{width:390,height:660});
    const chosen=selectLights(converted,6,8,
        {minX:0,maxX:390/48,minY:-660*Math.SQRT2/48,maxY:0});
    const report=huntShadowAllocationReport(converted.lights,chosen,6);
    assert.deepEqual(report.requestedIds,['projectile:one','projectile:two']);
    assert.equal(report.shadowedIds.length,1,
        'The real mobile budget physically supports one point-light cubemap, not two.');
    assert.equal(report.allocatedViews,6);
    assert.equal(report.capacity,6);
    assert.deepEqual(report.notSelectedIds,[]);
    assert.equal(report.selectedWithoutShadowIds.length,1,
        'The second visible, luminous Fireball has no actual shadow map.');
    assert.ok(report.shadowedIds[0].startsWith('projectile:'));
    assert.deepEqual(huntShadowAllocationReport([],[],6),{
        requestedIds:[],shadowedIds:[],notSelectedIds:[],
        selectedWithoutShadowIds:[],allocatedViews:0,capacity:6
    });
});
