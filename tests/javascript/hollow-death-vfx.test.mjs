import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../src/Wyrmforge.Presentation.Web/wwwroot/', import.meta.url);
const original = readFileSync(new URL('js/hollow-death-vfx.js',root), 'utf8');
const imported = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const hitStub = imported(`
    export const hollowHitAtlasReady = () => true;
    export function drawHollowDeathSplatFrame(...args) { globalThis.__h4Draws.push(['blood', ...args.slice(1)]); return true; }
`);
const groundStub = imported(`
    export const hollowGroundAtlasReady = () => true;
    export const HOLLOW_GROUND = { frames: 8 };
    export const hollowGroundMaterial = (frame, x, y) => frame?.material ?? 'soil';
    export function drawHollowDeathDustFrame(...args) { globalThis.__h4Draws.push(['dust', ...args.slice(1)]); return true; }
`);
const source = original
    .replace("'./hollow-hit-vfx.js?v=20261108-hollow-hit-h4'", JSON.stringify(hitStub))
    .replace("'./hollow-ground-vfx.js?v=20261108-hollow-ground-h4'", JSON.stringify(groundStub));
const mod = await import(imported(source));
const {createHollowDeathVfxState, updateHollowDeathVfx, hollowDeathContact,
    drawHollowDeathAccentVfx, drawHollowDeathGroundVfx, hollowDeathVfxDiagnostics,
    hollowDeathArtReady, HOLLOW_DEATH_VFX} = mod;
const death = (values={}) => ({kind:0,entityId:7,x:120,y:160,bodyRadius:11,progress:0,...values});
const update = (state, clock, deaths=[], authored=false, corpses=new Map()) =>
    updateHollowDeathVfx(state,{deathBursts:deaths},clock,authored,corpses);
const ctx = {globalAlpha:1,save(){},restore(){},drawImage(){}};
test('only real identified C# Hollowed death creates one effect, duplicates are idempotent',()=>{
    const state=createHollowDeathVfxState();
    update(state,0,[death(),death(),death({kind:2,entityId:8}),death({entityId:null})]);
    assert.equal(state.confirmedDeaths,1);
    assert.equal(state.events.size,1);
    update(state,.12,[death({progress:.5})]);
    assert.equal(state.confirmedDeaths,1,'same event must not restart when C# repeats it');
    assert.deepEqual(hollowDeathVfxDiagnostics(state).styles.map(x=>x.id),[7]);
    update(state,1.5,[]);
    assert.equal(state.events.size,0);
    update(state,0,[]);
    assert.equal(state.confirmedDeaths,0,'new run must reset without retaining corpses');
});
test('authored collapse, full body fall and fracture have distinctly timed grounded contact',()=>{
    const a=createHollowDeathVfxState(),b=createHollowDeathVfxState(),c=createHollowDeathVfxState();
    update(a,0,[death()],true);
    update(b,0,[death()],false,new Map([['7:0',{deathStyle:'fracture'}]]));
    update(c,0,[death()]);
    assert.equal(hollowDeathContact(a.events.get(7)),HOLLOW_DEATH_VFX.authoredContact);
    assert.equal(hollowDeathContact(b.events.get(7)),HOLLOW_DEATH_VFX.fractureContact);
    assert.equal(hollowDeathContact(c.events.get(7)),HOLLOW_DEATH_VFX.collapseContact);
    globalThis.__h4Draws=[];
    update(a,.39,[]);
    assert.equal(drawHollowDeathGroundVfx(ctx,a,null),0,'authored rig has not hit the floor yet');
    update(b,.39,[]);
    assert.ok(drawHollowDeathGroundVfx(ctx,b,null)>0,'fracture has already landed');
    update(c,.39,[]);
    assert.equal(drawHollowDeathGroundVfx(ctx,c,null),0,'long collapse is still falling');
    update(a,.55,[]);
    assert.ok(drawHollowDeathGroundVfx(ctx,a,null)>0,'authored 4-frame contact uses first three authored frame durations');
    update(c,.79,[]);
    assert.ok(drawHollowDeathGroundVfx(ctx,c,null)>0);
});
test('confirmed killing blow hits immediately; grounded dust is two restrained atlas puffs',()=>{
    const state=createHollowDeathVfxState();
    update(state,0,[death({progress:.25})]);
    globalThis.__h4Draws=[];
    assert.ok(drawHollowDeathAccentVfx(ctx,state)>0);
    assert.equal(globalThis.__h4Draws[0][0],'blood');
    update(state,.65,[]);
    assert.equal(drawHollowDeathAccentVfx(ctx,state),0);
    update(state,.8,[]);
    assert.equal(drawHollowDeathGroundVfx(ctx,state,{material:'lava'}),0);
    assert.equal(drawHollowDeathGroundVfx(ctx,state,{material:'soil'}),2);
    assert.deepEqual(globalThis.__h4Draws.map(a=>a[0]).slice(-2),['dust','dust']);
    assert.equal(hollowDeathArtReady(),true);
});
test('reduced motion prevents prolonged particles; pack budget is bounded and no RNG or terrain mutation',()=>{
    const state=createHollowDeathVfxState();
    const many=Array.from({length:64},(_,i)=>death({entityId:i+1}));
    update(state,.1,many,false);
    assert.equal(state.confirmedDeaths,64);
    assert.equal(state.events.size,HOLLOW_DEATH_VFX.maxTracked);
    update(state,.22,[]);
    globalThis.__h4Draws=[];
    assert.equal(drawHollowDeathAccentVfx(ctx,state,true),0);
    update(state,1.04,[]);
    assert.equal(drawHollowDeathGroundVfx(ctx,state,null,0,true),0);
    assert.equal(state.events.size,HOLLOW_DEATH_VFX.maxTracked);
    assert.deepEqual(many[0],death({entityId:1}));
});
test('lab exposes same-seed death toggle and renderer gates generic white ring',()=>{
    const arena=readFileSync(new URL('js/arena.js',root),'utf8');
    const lab=readFileSync(new URL('../Pages/EnemyLab.razor',root),'utf8');
    assert.match(arena,/updateHollowDeathVfx\(state\.hollowDeath/);
    assert.match(arena,/drawHollowDeathGroundVfx\(/);
    assert.match(arena,/drawHollowDeathAccentVfx\(/);
    assert.match(arena,/hollowDeathArtReady\(\)/);
    assert.match(lab,/Hollowed death VFX/);
    assert.match(lab,/SwitchHollowDeathFx/);
});
