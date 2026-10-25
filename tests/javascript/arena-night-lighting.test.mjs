import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GOTHIC_NIGHT, gothicNightLightSources, gothicNightPlan, drawGothicNight } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-night-lighting.js';

const testFire = { x: 120, y: 180, radius: 88, strength: .85, family: 'fire', center: [249, 120, 64] };
const view = { x: 0, y: 0, width: 390, height: 680 };

test('all arena lighting is always dark, with a bounded player silhouette allowance', () => {
    const p = gothicNightPlan({ x: 180, y: 200 }, [], view);
    assert.equal(p.darkness, .90);
    assert.equal(p.sources.length, 1);
    assert.equal(p.sources[0].kind, 'moon');
    assert.equal(p.sources[0].color, null);
    assert.ok(p.sources[0].relief < .5);
    assert.ok(p.darkness >= .85);
    assert.equal(gothicNightPlan(null, [], view).sources.length, 0);
    assert.equal(gothicNightPlan(null, [], view, { darkness: 99 }).darkness, .97);
    assert.equal(gothicNightPlan(null, [], view, { darkness: -.2 }).darkness, .64);
    assert.equal(GOTHIC_NIGHT.maximumLights, 10);
});

test('fire spells emit warm, larger and more intense night light than cold spells', () => {
    const cold = { ...testFire, family: 'frost', center: [160, 210, 255] };
    const fire = gothicNightLightSources({}, [testFire])[0];
    const frost = gothicNightLightSources({}, [cold])[0];
    assert.equal(fire.kind, 'fire');
    assert.equal(frost.kind, 'spell');
    assert.ok(fire.radius > frost.radius);
    assert.ok(fire.relief > frost.relief);
    assert.deepEqual(fire.color, [255, 139, 66]);
    assert.deepEqual(frost.color, [160, 210, 255]);
    assert.equal(gothicNightLightSources({}, [{ ...testFire, strength: 0 }]).length, 0,
        'Extinguished spell sources must produce no phantom lingering light.');
    assert.ok(fire.relief > .70 && fire.relief < 1,
        'A real Fireball should meaningfully cut through the black night.');
});

test('real Fire Wyrm breath and authoritative burning-tree state illuminate without invented fire', () => {
    const dragonBreath = { x: 400, y: 500, directionX: 1, directionY: 0, range: 190 };
    const burning = [{ x: 270, y: 420, radius: 80, intensity: .3 }];
    const source = gothicNightLightSources({ dragon: { school: 1 }, dragonBreath }, [], 960, 1536, burning);
    assert.deepEqual(source.map(s => s.kind).sort(), ['burning-tree', 'wyrm-breath']);
    assert.ok(source.every(s => s.relief > .85 && s.radius >= 80));
    assert.deepEqual(gothicNightLightSources({ dragon: { school: 2 }, dragonBreath }, []), []);
    assert.deepEqual(gothicNightLightSources({ dragon: { school: 1 } }, []), []);
});

test('lights are bounded and only near their real world position, independent of viewport panning', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ ...testFire, x: i * 50 }));
    const lights = gothicNightLightSources({}, many, 350, 680);
    assert.ok(lights.length <= GOTHIC_NIGHT.maximumLights);
    assert.ok(lights.every(s => s.x - s.radius <= 350));
    const p1 = gothicNightPlan({ x: 180, y: 400 }, lights, view);
    const p2 = gothicNightPlan({ x: 180, y: 400 }, lights, { ...view, x: 20 });
    assert.equal(p1.sources[0].x, p2.sources[0].x, 'No viewport-local light positions');
    assert.deepEqual(gothicNightLightSources({}, [testFire]), gothicNightLightSources({}, [testFire]));
});

function context() {
    const ops = [];
    const stops = () => ({ addColorStop(t, c) { ops.push(['stop', t, c]); } });
    return {
        ops,
        save() { ops.push('save'); }, restore() { ops.push('restore'); },
        clearRect(...x) { ops.push(['clear', ...x]); },
        fillRect(...x) { ops.push(['fill', ...x]); },
        setTransform(...x) { ops.push(['transform', ...x]); },
        drawImage(...x) { ops.push(['image', ...x.slice(1)]); },
        createRadialGradient(...x) { ops.push(['radial', ...x]); return stops(); },
        set globalCompositeOperation(v) { ops.push(['composition', v]); },
        set fillStyle(v) { ops.push(['color', typeof v === 'string' ? v : 'gradient']); },
    };
}

test('nightmask draws black first, cuts holes, then restores canvas composition', () => {
    const painted = context(), mask = context();
    const canvas = { width: 0, height: 0, getContext: () => mask };
    const sources = gothicNightLightSources({}, [testFire]);
    const plan = gothicNightPlan({ x: 170, y: 200 }, sources, view);
    assert.equal(drawGothicNight(painted, plan, canvas), true);
    assert.equal(canvas.width, 390);
    assert.equal(canvas.height, 680);
    assert.ok(mask.ops.some(x => x[0] === 'composition' && x[1] === 'destination-out'));
    assert.ok(mask.ops.some(x => x[0] === 'color' && x[1] === 'rgba(0,0,0,0.900)'));
    assert.ok(painted.ops.some(x => x[0] === 'composition' && x[1] === 'screen'));
    assert.equal(mask.ops.at(-1), 'restore');
    assert.equal(painted.ops.at(-1), 'restore');
    assert.equal(drawGothicNight(painted, null, canvas), false);
});

test('only presentation renderer owns darkness; C# arena, existing material lab and approved ground stay untouched', () => {
    const arena = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    const material = readFileSync(new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-ground-foundation.js', import.meta.url), 'utf8');
    assert.match(arena, /gothicNightLightSources\(snapshot, spellLights/);
    assert.match(arena, /drawGothicNight\(ctx, gothicNightPlan\(snapshot.player/);
    assert.match(arena, /for \(const enemy of snapshot.enemies\) drawEnemyTelegraph\(ctx, enemy\)/);
    assert.match(arena, /createWetForestFirelightPlan\(snapshot.environment/);
    assert.doesNotMatch(material, /arena-night-lighting/);
    assert.doesNotMatch(arena, /localStorage\.night|snapshot\.night\s*=|environment\.lights\s*=/);
});
