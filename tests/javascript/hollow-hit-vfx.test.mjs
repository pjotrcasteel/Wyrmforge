import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/', import.meta.url);
const source = readFileSync(new URL('js/hollow-hit-vfx.js', root), 'utf8')
    .replace("new URL('../art/vfx/hollowed-hit-gothic-pal.png', import.meta.url)",
        "new URL('https://example.test/art/vfx/hollowed-hit-gothic-pal.png')");
const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { HOLLOW_HIT, hollowHitFrame, preloadHollowHitVfx, drawHollowHitVfx } = mod;
const number = over => ({targetId: 7,amount:13,progress:.08,heavy:false,periodic:false,isDragon:false,...over});

test('only authoritative positive direct damage bound to a target identity triggers an impact', () => {
    assert.equal(hollowHitFrame(number()), 1);
    for (const change of [{targetId:undefined},{targetId:0},{isDragon:true},{periodic:true},
        {amount:0},{amount:-1},{progress:.5},{progress:NaN}])
        assert.equal(hollowHitFrame(number(change)),-1,JSON.stringify(change));
});
test('heavy feedback lasts longer; reduced motion has one short frame', () => {
    assert.equal(hollowHitFrame(number({progress:.40})),-1);
    assert.ok(hollowHitFrame(number({progress:.40,heavy:true}))>=0);
    assert.equal(hollowHitFrame(number({progress:.08}),true),3);
    assert.equal(hollowHitFrame(number({progress:.15}),true),-1);
});
test('recolored ZIP atlas is compact and preserves authored dimensions and palette', () => {
    const png=readFileSync(new URL('art/vfx/hollowed-hit-gothic-pal.png',root));
    assert.equal(png.readUInt32BE(16),HOLLOW_HIT.cellWidth*HOLLOW_HIT.frames);
    assert.equal(png.readUInt32BE(20),HOLLOW_HIT.cellHeight);
    assert.equal(createHash('sha256').update(png).digest('hex'),
        '9a58b3feaf8e3f2cb087f0588f138372f02fbfda9276d529c02a42ebcf38c805');
    assert.ok(png.length<4096);
});
test('the torso-aligned impact is crisp, bounded, and cannot modify gameplay',async()=>{
    const oldImage=globalThis.Image;
    globalThis.Image=class {
        set src(_) {this.naturalWidth=512;this.naturalHeight=60;queueMicrotask(()=>this.onload());}
    };
    try {
        assert.equal(await preloadHollowHitVfx(),true);
        const enemy={entityId:7,kind:0,x:100,y:160,radius:11};
        const ctx={calls:[],save(){},restore(){},drawImage(...args){this.calls.push(args);}};
        const items=[number(),number({targetId:8}),number({progress:.1,heavy:true})];
        assert.equal(drawHollowHitVfx(ctx,enemy,items),2);
        assert.equal(ctx.calls.length,2);
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.ok(ctx.calls.every(args=>args[6]<enemy.y-10));
        assert.deepEqual(enemy,{entityId:7,kind:0,x:100,y:160,radius:11});
        assert.equal(drawHollowHitVfx(ctx,{...enemy,kind:2},items),0);
        assert.equal(drawHollowHitVfx(ctx,enemy,[number({periodic:true})]),0);
    } finally {globalThis.Image=oldImage;}
});
