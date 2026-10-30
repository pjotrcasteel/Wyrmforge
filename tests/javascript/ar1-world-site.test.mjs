import test from 'node:test';
import assert from 'node:assert/strict';
import { drawSemanticSiteFloor, drawWorldSiteLandscape } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-environment.js';

function canvas() {
    const paths = [];
    const colors = [];
    const ctx = {
        save() {}, restore() {}, beginPath() { paths.push('begin'); },
        moveTo(x, y) { paths.push(['move', x, y]); },
        lineTo(x, y) { paths.push(['line', x, y]); },
        closePath() { paths.push('closed'); },
        arc() {}, fill() { colors.push(this.fillStyle); }, stroke() {},
        fillRect() { colors.push(this.fillStyle); }, fillText() {},
    };
    return { ctx, paths, colors };
}

const site = {
    version: 1, siteId: 'fire:opening',
    substrate: { material: 1 },
    ports: [{ edgeId: 'opening|fork', neighborNodeId: 'fork', entrance: false,
        direction: 'NE', localPoint: { x: .94, y: .06 } }],
    corridors: [{ edgeId: 'opening|fork', material: 2, width: .09,
        points: [{ x: .5, y: .5 }, { x: .94, y: .06 }] }],
    landscape: { kind: 'forest-fork', obstacles: [{ kind: 'tree-root', material: 1, height: .5,
        outline: [{ x: .12, y: .10 }, { x: .2, y: .10 }, { x: .2, y: .19 }, { x: .12, y: .19 }] }] },
};

test('AR1 live diagnostic uses the same C# polygon outline as physical collision, not random decoration', () => {
    const on = canvas();
    assert.equal(drawSemanticSiteFloor(on.ctx, site, 390, 844, true), true);
    assert.ok(on.paths.includes('closed'), 'Actual C# footprint must close into one physical polygon');
    assert.ok(on.colors.includes('#264a34'), 'Forest roots must use their typed solid surface');
    const off = canvas();
    assert.equal(drawSemanticSiteFloor(off.ctx, site, 390, 844, false), true);
    assert.ok(!off.colors.includes('#264a34'),
        'An AR0 palette toggle alone must never draw a collider that is inactive in C#');
});

test('AR1 mountain and lair semantic shapes have distinct physical material identities', () => {
    for (const [kind, expected] of [
        ['cliff', '#42525d'], ['glacier-cliff', '#7d9bac'],
        ['wyrm-rib', '#55434a'], ['ice-spire', '#b1d5e5'],
    ]) {
        const { ctx, colors } = canvas();
        assert.equal(drawWorldSiteLandscape(ctx, {
            landscape: { kind: 'wyrm-lair', obstacles: [{ kind, material: 4, height: 2,
                outline: [{ x: .1, y: .1 }, { x: .2, y: .1 }, { x: .2, y: .2 }] }] },
        }, 390, 844), true);
        assert.ok(colors.includes(expected), `Missing solid authored material for ${kind}`);
    }
});

test('AR1 local scenic roads are generated independently of Chart edge corridors', () => {
    const local = {
        ...site,
        scenicPaths: [{ edgeId: 'site-main-trail', material: 2, width: .07,
            points: [{ x: .21, y: .91 }, { x: .42, y: .62 }, { x: .61, y: .09 }] }],
    };
    const { ctx, paths } = canvas();
    assert.equal(drawSemanticSiteFloor(ctx, local, 390, 844, true), true);
    assert.ok(paths.some(point => Array.isArray(point) && point[0] === 'move' &&
        Math.abs(point[1] - .21 * 390) < .01 && Math.abs(point[2] - .91 * 844) < .01));
    assert.ok(!paths.some(point => Array.isArray(point) && point[0] === 'move' &&
        Math.abs(point[1] - .5 * 390) < .01 && Math.abs(point[2] - .5 * 844) < .01),
        'Graph-derived road must not appear as the local terrain path.');
});
