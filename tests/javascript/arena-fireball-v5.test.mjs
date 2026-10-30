import test from 'node:test';
import assert from 'node:assert/strict';
import {
    fireballV5Frame, drawFireballV5, installFireballV5ForTesting,
    resetFireballV5ForTesting,
} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-fireball-v5.js';
import { drawSpellProjectile } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-spell-vfx.js';

function capture() {
    const calls = [];
    const ctx = {
        globalAlpha: 1, imageSmoothingEnabled: true,
        save() { calls.push(['save']); },
        restore() { calls.push(['restore']); },
        translate(x,y) { calls.push(['translate',x,y]); },
        rotate(a) { calls.push(['rotate',a]); },
        drawImage(...args) { calls.push(['drawImage',...args]); },
        fillRect(...args) { calls.push(['fillRect',...args]); },
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {},
        ellipse() {}, stroke() {}, fill() {}, arc() {},
    };
    return {ctx, calls};
}

test('16 real sprite frames loop and reduced-motion pins a stable source frame', () => {
    assert.equal(fireballV5Frame(0, 16), 0);
    assert.equal(fireballV5Frame(.083, 16), 1);
    assert.equal(fireballV5Frame(.083 * 16, 16), 0);
    assert.equal(fireballV5Frame(.083 * 5, 1), 6);
    assert.equal(fireballV5Frame(.083 * 5, 1, true), 0);
    assert.ok(fireballV5Frame(-100, -1) >= 0);
});

test('V5 uses one C# projectile with aligned albedo/emissive layers and no new lighting', () => {
    resetFireballV5ForTesting();
    const {ctx,calls} = capture();
    const p = {spell:1,x:20,y:30,angle:.3,radius:14,fireballSourceId:16};
    assert.equal(drawFireballV5(ctx,p,0), false);
    const a = {naturalWidth:1920,naturalHeight:72};
    const e = {naturalWidth:1920,naturalHeight:72};
    installFireballV5ForTesting(a,e);
    assert.equal(drawFireballV5(ctx,p,.083), true);
    const layers = calls.filter(x => x[0] === 'drawImage');
    assert.equal(layers.length, 2);
    assert.equal(layers[0][1], a);
    assert.equal(layers[1][1], e);
    assert.deepEqual(layers[0].slice(2), [120,0,120,72,-87,-36,120,72]);
    assert.deepEqual(layers[1].slice(2), layers[0].slice(2));
    assert.equal(calls.filter(x => x[0] === 'fillRect').length, 0);
    resetFireballV5ForTesting();
});

test('existing renderer handles V5 only for actual base Fireball, preserving other spells and fallback', () => {
    const {ctx,calls} = capture();
    installFireballV5ForTesting({}, {});
    drawSpellProjectile(ctx,{spell:1,x:20,y:30,angle:0,radius:7},true,23);
    assert.equal(calls.filter(c => c[0] === 'drawImage').length,2);
    calls.length = 0;
    drawSpellProjectile(ctx,{spell:4,x:20,y:30,angle:0,radius:7},true,23);
    assert.equal(calls.filter(c => c[0] === 'drawImage').length,0);
    assert.ok(calls.some(c => c[0] === 'fillRect'));
    calls.length = 0;
    drawSpellProjectile(ctx,{spell:1,combination:0,x:20,y:30,angle:0,radius:7},true,23);
    assert.equal(calls.filter(c => c[0] === 'drawImage').length,0);
    resetFireballV5ForTesting();
    calls.length = 0;
    drawSpellProjectile(ctx,{spell:1,x:20,y:30,angle:0,radius:7},true,23);
    assert.ok(calls.some(c => c[0] === 'fillRect'));
});


test('G4 Fireball is fully visible for eight C# firing directions with original art proportions', () => {
    const albedo = { naturalWidth: 1920, naturalHeight: 72 };
    const emissive = { naturalWidth: 1920, naturalHeight: 72 };
    installFireballV5ForTesting(albedo, emissive);
    try {
        for (let facing = 0; facing < 8; facing++) {
            const angle = facing * Math.PI / 4;
            const { ctx, calls } = capture();
            drawSpellProjectile(ctx, { spell: 1, x: 240, y: 300, angle, radius: 14,
                fireballSourceId: 42 }, false, 1);
            assert.deepEqual(calls.find(call => call[0] === 'translate'),
                ['translate', 240, 300], 'The real projectile position must be preserved.');
            assert.deepEqual(calls.find(call => call[0] === 'rotate'),
                ['rotate', angle], 'The 2D sprite must face the full C# aim direction.');
            const draws = calls.filter(call => call[0] === 'drawImage');
            assert.equal(draws.length, 2, 'Both Fireball and glow remain visible at every angle.');
            assert.deepEqual(draws[0].slice(-4), [-87, -36, 120, 72],
                'No angle can squash or mirror the native sprite frame.');
            assert.deepEqual(draws[1].slice(2), draws[0].slice(2),
                'Both authored channels sample the same animation frame.');
        }
    } finally {
        resetFireballV5ForTesting();
    }
});

test('the G4 Hunt draws projectile art after GPU world shading without edge-on GPU sprite culling', async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(
        new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js', import.meta.url), 'utf8');
    assert.match(source, /for \(const projectile of snapshot\.projectiles\)\s*drawSpellProjectile\(/);
    assert.doesNotMatch(source, /submitGpuFireballs\(gpu/);
    assert.ok(source.indexOf('gpu.render(ctx, state.sharedLightingFrame)') <
        source.indexOf('for (const projectile of snapshot.projectiles)\n        drawSpellProjectile('));
    assert.match(source, /params\.get\('g4StageFrames'\) === '1'/,
        'High-bandwidth staging is now opt-in only, rather than a phone default.');
});
