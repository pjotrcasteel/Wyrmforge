import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatGroundState,updateCombatGround,drawCombatGround,drawBurningRemains,combatGroundDiagnostics} from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/arena-combat-ground.js';

const wound = (id=1,traits=3,killed=false) => ({
    id,x:120,y:170,radius:11,directionX:1,directionY:0,severity:.5,kind:0,traits,killed
});
const burst = (id=1,traits=3) => ({entityId:id,x:120,y:170,radius:11,bodyRadius:11,kind:0,traits});
const snapshot = (wounds=[],deaths=[],seconds=1,seed=42) => ({
    combatWounds:wounds,deathBursts:deaths,hud:{seconds},
    environment:{seed,habitat:'forest'},hunt:{stage:1}
});
function canvas() {
    const calls=[];
    return {calls,globalAlpha:1,save(){calls.push('save')},restore(){calls.push('restore')},
        beginPath(){},ellipse(...a){calls.push(['ellipse',...a])},moveTo(){},
        quadraticCurveTo(){},closePath(){},fill(){calls.push('fill')},set fillStyle(value){calls.push(value)}};
}
test('confirmed hit generates persistent dark blood without repeated frame decals',()=>{
    const state=createCombatGroundState();
    updateCombatGround(state,snapshot([wound(4,3,false)]),1.5);
    assert.equal(state.marks.length,1);
    assert.equal(state.flames.length,0);
    updateCombatGround(state,snapshot([wound(4,3,false)]),1.6);
    assert.equal(state.marks.length,1);
    const c=canvas();drawCombatGround(c,state,1.6);
    assert.ok(c.calls.some(v=>Array.isArray(v)&&v[0]==='ellipse'));
    assert.ok(c.calls.includes('rgba(73,22,25,.67)'));
    assert.deepEqual(combatGroundDiagnostics(state),{groundMarks:1,flamingRemains:0,bounded:true});
});
test('lethal fire scorches; composable explosive trait adds the stronger flame effect',()=>{
    const state=createCombatGroundState();
    updateCombatGround(state,snapshot([wound(3,3,true)],[burst(3,3)]),1.0);
    assert.equal(state.marks.length,2);
    assert.equal(state.flames.length,1);
    assert.equal(state.flames[0].explosive,true);
    const c=canvas();drawBurningRemains(c,state,1.2);
    assert.ok(c.calls.includes('rgba(224,92,32,.64)'));
    updateCombatGround(state,snapshot([wound(3,3,true)],[burst(3,3)]),1.3);
    assert.equal(state.flames.length,1);
    updateCombatGround(state,snapshot([],[burst(4,1)]),1.35);
    assert.equal(state.flames.length,2);
    assert.equal(state.flames[1].explosive,false);
    updateCombatGround(state,snapshot([]),3.7);
    assert.equal(state.flames.length,0);
});
test('same damage event with a missing, broken or nonfinite coordinate is ignored',()=>{
    const state=createCombatGroundState();
    updateCombatGround(state,snapshot([
        {...wound(1),x:NaN},{...wound(2),id:0},{...wound(3),severity:Infinity}
    ]),1);
    assert.equal(state.marks.length,0);
    updateCombatGround(state,snapshot([],[{...burst(55),y:Infinity}]),1.1);
    assert.equal(state.flames.length,0);
});
test('ground marks are bounded for long Hunts and cleared on route reset',()=>{
    const state=createCombatGroundState();
    updateCombatGround(state,snapshot(Array.from({length:180},(_,i)=>wound(i+1))),1);
    assert.equal(state.marks.length,96);
    assert.equal(combatGroundDiagnostics(state).bounded,true);
    updateCombatGround(state,snapshot([],[],2,900),10);
    assert.equal(state.marks.length,0);
    updateCombatGround(state,snapshot([wound(999)],[],4,900),11);
    assert.equal(state.marks.length,1);
    updateCombatGround(state,snapshot([],[],0,900),12);
    assert.equal(state.marks.length,0);
    const c=canvas();drawCombatGround(c,state,12,true);
    assert.equal(c.calls.length,0);
});
