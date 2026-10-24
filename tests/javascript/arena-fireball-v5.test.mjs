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
