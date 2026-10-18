import test from 'node:test';
import assert from 'node:assert/strict';
import { drawGlassReliquaryGround, drawGlassReliquaryAir, drawTether, drawPrisonFloor, drawPrisonWall, isGlassTelegraph, LANTERN_OFFSETS,
    PRISON_SPIKES, GLASS_RELIQUARY_KIND, CRYSTAL_WARD_KIND, GLASS_FALSE_FORM_KIND }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-glass-reliquary-vfx.js';
import { drawReliquaryBar, reliquaryTheme } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-reliquary-vfx.js';
import { drawEnemyTelegraph } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-telegraphs.js';
import { ENEMY_KIND_COUNT } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-enemy-art.js';

function mockContext() {
    const calls = [];
    return new Proxy({ calls }, {
        get(target, key) {
            if (key in target) return target[key];
            return (...args) => calls.push([key, ...args]);
        },
        set(target, key, value) { calls.push(['set', key, value]); return true; },
    });
}

const named = (ctx, name) => ctx.calls.filter(c => c[0] === name);
const sets = (ctx, key) => ctx.calls.filter(c => c[0] === 'set' && c[1] === key).map(c => c[2]);
const DANGER = 'rgba(226, 84, 74, 0.9)';

test('nothing is drawn on a road without the glass reliquary', () => {
    const ctx = mockContext();
    drawGlassReliquaryGround(ctx, null);
    drawGlassReliquaryGround(ctx, { glassTethers: [], glassPrisons: [] });
    drawGlassReliquaryAir(ctx, null);
    drawGlassReliquaryAir(ctx, { enemies: [{ kind: GLASS_RELIQUARY_KIND, x: 0, y: 0 }], reliquary: { variant: 'glass', veiled: false } });
    assert.equal(ctx.calls.length, 0);
});

test('a kindling tether is a dashed thread; a lit one burns with the danger edge at its hurting width', () => {
    const kindling = mockContext();
    drawTether(kindling, { x1: 0, y1: 0, x2: 100, y2: 0, halfWidth: 7, lit: 0.5 });
    assert.ok(named(kindling, 'setLineDash').some(c => c[1].length > 0), 'kindling is dashed');
    assert.ok(!sets(kindling, 'strokeStyle').includes(DANGER), 'a kindling thread does not hurt, so no danger edge');

    const lit = mockContext();
    drawTether(lit, { x1: 0, y1: 0, x2: 100, y2: 0, halfWidth: 7, lit: 1 });
    assert.ok(sets(lit, 'strokeStyle').includes(DANGER));
    assert.equal(sets(lit, 'lineWidth')[0], 16, 'the danger band spans the full hit width plus its edge');
    assert.deepEqual(named(lit, 'moveTo')[0].slice(1), [0, 0]);
    assert.deepEqual(named(lit, 'lineTo')[0].slice(1), [100, 0]);
});

test('a prison floor marks its exact radius while rising and its wall band once standing', () => {
    const rising = mockContext();
    drawPrisonFloor(rising, { x: 50, y: 60, radius: 72, rise: 0.5, risen: false, life: 1, trapped: false });
    assert.deepEqual(named(rising, 'translate')[0].slice(1), [50, 60]);
    const risingArcs = named(rising, 'arc');
    assert.ok(risingArcs.every(c => c[3] === 72), 'the closing mark sits exactly on the cage');
    const closing = risingArcs.at(-1);
    assert.ok(Math.abs((closing[5] - closing[4]) - Math.PI) < 1e-9, 'half risen: half the ring has closed');

    const standing = mockContext();
    drawPrisonFloor(standing, { x: 0, y: 0, radius: 72, rise: 1, risen: true, life: 1, trapped: true });
    const radii = named(standing, 'arc').map(c => c[3]);
    assert.ok(radii.includes(64) && radii.includes(80), 'danger edges bracket the wall band');
    assert.ok(sets(standing, 'strokeStyle').includes(DANGER));
});

test('prison bars stand on the circumference and grow as the cage rises', () => {
    const none = mockContext();
    drawPrisonWall(none, { x: 0, y: 0, radius: 72, rise: 0, risen: false, life: 1 });
    assert.equal(none.calls.length, 0, 'no bars before the cage begins to rise');

    const standing = mockContext();
    drawPrisonWall(standing, { x: 10, y: 20, radius: 72, rise: 1, risen: true, life: 1 });
    const bases = named(standing, 'moveTo');
    assert.equal(bases.length, PRISON_SPIKES);
    for (const [i, [, x, y]] of bases.entries()) {
        const w = 4 + i % 3;
        assert.ok(Math.abs(Math.hypot(x + w / 2 - 10, y - 20) - 72) < 1e-6, 'every bar is rooted on the cage edge');
    }
});

test('only a veiled glass reliquary shows the lantern tell, at its lanterns', () => {
    const veiled = mockContext();
    const boss = { kind: GLASS_RELIQUARY_KIND, x: 200, y: 300, radius: 27 };
    const forms = [{ kind: GLASS_FALSE_FORM_KIND, x: 80, y: 300, radius: 27 }];
    drawGlassReliquaryAir(veiled, { enemies: [...forms, boss], reliquary: { variant: 'glass', veiled: true } });
    const glows = named(veiled, 'arc');
    assert.equal(glows.length, LANTERN_OFFSETS.length);
    for (const [i, o] of LANTERN_OFFSETS.entries()) assert.deepEqual(glows[i].slice(1, 3), [boss.x + o.x, boss.y + o.y]);

    const fire = mockContext();
    drawGlassReliquaryAir(fire, { enemies: [boss], reliquary: { variant: 'fire', veiled: true } });
    assert.equal(fire.calls.length, 0);
});

test('the glass telegraphs are recognised and dispatched by the enemy telegraph layer', () => {
    for (const kind of ['glass-ward', 'glass-veil', 'glass-prison', 'glass-shatter', 'glass-exposed']) {
        assert.ok(isGlassTelegraph(kind));
        const ctx = mockContext();
        drawEnemyTelegraph(ctx, { x: 0, y: 0, radius: 27, telegraph: { kind, progress: 0.5, radius: 72, targetX: 40, targetY: 50 } });
        assert.ok(ctx.calls.length > 0, `${kind} draws`);
    }
    assert.ok(!isGlassTelegraph('bell-toll'));
});

test('the reliquary bar wears the glass theme and puts the most urgent hint first', () => {
    assert.equal(reliquaryTheme({ variant: 'glass' }).title, 'THE RELIQUARY OF GLASS');
    assert.equal(reliquaryTheme({}).title, 'THE RELIQUARY');
    const texts = reliquary => {
        const ctx = mockContext();
        drawReliquaryBar(ctx, { stage: 'duel', healthRatio: 0.6, variant: 'glass', ...reliquary }, 800);
        return named(ctx, 'fillText').map(c => c[1]);
    };
    assert.deepEqual(texts({ shifted: true }), ['THE RELIQUARY OF GLASS • SHATTERED']);
    assert.ok(texts({ warded: true, veiled: true }).includes('VEILED • FIND THE LIT LANTERNS'));
    assert.ok(texts({ warded: true, veiled: true, exposed: true }).includes('EXPOSED • STRIKE NOW'));
    assert.ok(texts({ warded: true }).includes('WARDED • BREAK THE CRYSTALS'));
});

test('kinds 18-20 have fallback palettes', () => {
    assert.ok(ENEMY_KIND_COUNT > CRYSTAL_WARD_KIND && ENEMY_KIND_COUNT > GLASS_FALSE_FORM_KIND);
});
