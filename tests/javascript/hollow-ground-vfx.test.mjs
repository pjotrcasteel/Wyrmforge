import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/', import.meta.url);
const source = readFileSync(new URL('js/hollow-ground-vfx.js', root), 'utf8')
    .replace("new URL('../art/vfx/hollowed-ground-dust-h3.png', import.meta.url)",
        "new URL('https://example.test/art/vfx/hollowed-ground-dust-h3.png')");
const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const { HOLLOW_GROUND, hollowGroundMaterial, createHollowGroundState, updateHollowGroundVfx,
    preloadHollowGroundVfx, drawHollowGroundVfx, hollowGroundDiagnostics } = mod;
const enemy = (over = {}) => ({ kind: 0, entityId: 7, x: 120, y: 120, z: 0, radius: 11, ...over });
const pose = (over = {}) => ({ distance: 0, clip: 'walk', direction: 'E', ...over });
const sample = (state, ground, actor = enemy(), p = pose(), flags = {}) => {
    updateHollowGroundVfx(state, {enemies: [actor], ...flags}, {entities: new Map([[7, p]]), clock: ground}, null);
};

test('foot scrapes require actual traversed distance; duplicates, pauses and frozen actors cannot emit', () => {
    const state = createHollowGroundState();
    sample(state, 0);
    sample(state, .1, enemy({x: 139}), pose({distance: 17}));
    assert.equal(hollowGroundDiagnostics(state).footfalls, 1);
    const event = state.puffs[0];
    assert.ok(event.x < 139, 'foot stays behind forward-facing body');
    sample(state, .12, enemy({x: 139}), pose({distance: 17}));
    sample(state, .14, enemy({x: 160, frozen: true}), pose({distance: 34}));
    sample(state, .16, enemy({x: 160}), pose({distance: 34}), { paused: true });
    assert.equal(state.footfalls, 1);
    sample(state, .2, enemy({x: 179}), pose({distance: 49.92, clip:'attack'}));
    assert.equal(state.footfalls, 1);
    sample(state, .3, enemy({x: 197}), pose({distance: 66.56}));
    assert.equal(state.footfalls, 2);
    assert.ok(state.puffs.length <= 2);
    sample(state, .85, enemy({x:197}), pose({distance:66.56}));
    assert.equal(state.puffs.length, 0);
});

test('terrain material reads existing C# grid without painting or guessing on lava', () => {
    const frame = { columns: 3, rows: 2, material: [0,1,2,3,4,5] };
    assert.equal(hollowGroundMaterial(frame, 2,2), 'soil');
    assert.equal(hollowGroundMaterial(frame, 35,2), 'ash');
    assert.equal(hollowGroundMaterial(frame, 70,2), 'stone');
    assert.equal(hollowGroundMaterial(frame, 4,40), 'lava');
    assert.equal(hollowGroundMaterial(frame, 35,40), 'stone');
    assert.equal(hollowGroundMaterial(frame, 70,40), 'stone');
    assert.equal(hollowGroundMaterial(null,10,10), 'soil');
    assert.equal(hollowGroundMaterial(frame,-1,10), 'soil');
    const state = createHollowGroundState();
    updateHollowGroundVfx(state, {enemies:[enemy({x:4,y:40})]}, {entities:new Map([[7,pose()]]),clock:0}, frame);
    updateHollowGroundVfx(state, {enemies:[enemy({x:20,y:40})]}, {entities:new Map([[7,pose({distance:17})]]),clock:.1}, frame);
    assert.equal(state.puffs.length,0);
    assert.deepEqual(frame.material,[0,1,2,3,4,5]);
});

test('existing C# crawl emergence does not create walking events or fake effects', () => {
    const state = createHollowGroundState();
    sample(state, 0, enemy({emergeProgress:.10}));
    sample(state, .2, enemy({emergeProgress:.32}), pose({distance:30}));
    assert.equal(state.puffs.length,0);
    sample(state, .5, enemy({emergeProgress:null}), pose({distance:30}));
    assert.equal(state.puffs.length,0);
});

test('the particle budget, reset and enemy removal are bounded and deterministic', () => {
    const state = createHollowGroundState();
    const actors = Array.from({length:64},(_,i)=>enemy({entityId:i+1,x:120+i*2}));
    const poses = (distance) => new Map(actors.map(a=>[a.entityId,pose({distance})]));
    updateHollowGroundVfx(state,{enemies:actors},{entities:poses(0),clock:0},null);
    updateHollowGroundVfx(state,{enemies:actors},{entities:poses(17),clock:.1},null);
    assert.equal(state.puffs.length,HOLLOW_GROUND.maxPuffs);
    assert.equal(state.footfalls,64);
    updateHollowGroundVfx(state,{enemies:[]},{entities:new Map(),clock:.2},null);
    assert.equal(state.walkers.size,0);
    updateHollowGroundVfx(state,{enemies:[]},{entities:new Map(),clock:0},null);
    assert.equal(state.puffs.length,0);
    assert.equal(state.footfalls,0);
});

test('art is exactly the source-recolored 8-frame indexed atlas, no blended scaling', async () => {
    const png = readFileSync(new URL('art/vfx/hollowed-ground-dust-h3.png',root));
    assert.equal(png.readUInt32BE(16),HOLLOW_GROUND.width*HOLLOW_GROUND.frames);
    assert.equal(png.readUInt32BE(20),HOLLOW_GROUND.height*3);
    assert.equal(createHash('sha256').update(png).digest('hex'),
        '397dff03baa3377fefad423e376f1f21aa0dd3a44bce0bf6d36bc159456fff58');
    assert.ok(png.length<4096);
    const prior=globalThis.Image;
    globalThis.Image=class{set src(_){this.naturalWidth=288;this.naturalHeight=60;queueMicrotask(()=>this.onload());}};
    try {
        assert.equal(await preloadHollowGroundVfx(),true);
        const state=createHollowGroundState();
        sample(state,0);
        sample(state,.1,enemy({x:139}),pose({distance:17}));
        const calls=[];
        const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args);}};
        assert.equal(drawHollowGroundVfx(ctx,enemy({x:139}),state,null,0),1);
        assert.equal(ctx.imageSmoothingEnabled,false);
        assert.equal(calls.length,1);
        assert.equal(drawHollowGroundVfx(ctx,enemy({kind:2}),state,null,0),0);
        assert.equal(drawHollowGroundVfx(ctx,enemy({emergeProgress:.3}),state,null,0),1);
        assert.equal(drawHollowGroundVfx(ctx,enemy({emergeProgress:.3}),state,
            {columns:4,rows:4,material:Array(16).fill(3)},0),0);
        assert.equal(drawHollowGroundVfx(ctx,enemy({emergeProgress:.3}),state,null,0,true),0);
        assert.equal(drawHollowGroundVfx(ctx,enemy({emergeProgress:.2}),state,null,0,true),1);
    } finally {globalThis.Image=prior;}
});


test('H4 death dust reuses H3 source atlas at the ground, no terrain writes', () => {
    assert.equal(mod.hollowGroundAtlasReady(), true);
    const ctx={globalAlpha:1,calls:[],save(){},restore(){},drawImage(...args){this.calls.push(args);}};
    assert.equal(mod.drawHollowDeathDustFrame(ctx, 'soil', 120, 150, 4, 38, .55), true);
    assert.equal(ctx.imageSmoothingEnabled, false);
    assert.equal(ctx.calls.length, 1);
    assert.equal(mod.drawHollowDeathDustFrame(ctx, 'lava', 120, 150, 4, 38, .55), false);
    assert.equal(mod.drawHollowDeathDustFrame(ctx, 'stone', 120, 150, 9, 38, .55), false);
});
