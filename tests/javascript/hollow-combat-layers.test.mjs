import test from 'node:test';
import assert from 'node:assert/strict';
import { createHollowCombatLayers,updateHollowCombatLayers,HOLLOW_ATTACK_DURATION } from
    '../../src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-combat-layers.js';

const step=(state, values={})=>updateHollowCombatLayers(state,{
    movementFacing:'E',targetFacing:'E',attackToken:13,attackElapsed:0,
    deltaSeconds:.08,crawling:false,...values,
});

test('a running Hollowed retains its stride channel throughout the committed swing',()=>{
    const state=createHollowCombatLayers();
    const start=step(state,{attackElapsed:0,movementFacing:'E'});
    const strike=step(state,{attackElapsed:.66,movementFacing:'E'});
    assert.equal(start.lowerFacing,'E');
    assert.equal(strike.actionActive,true);
    assert.equal(strike.lowerFacing,'E');
    assert.equal(strike.lowerPhaseContinuous,true);
    assert.ok(strike.actionWeight>.9);
    assert.equal(strike.committedFacing,'E');
    assert.equal(strike.actionFrame,7);
});

test('a player passing behind cannot cancel, rewind or flip the committed impact',()=>{
    const state=createHollowCombatLayers('E');
    step(state,{attackElapsed:.15,targetFacing:'E'});
    const impact=step(state,{attackElapsed:.70,targetFacing:'W',movementFacing:'W'});
    assert.equal(impact.actionActive,true);
    assert.equal(impact.upperFacing,'E','Claws remain committed during the actual strike');
    assert.equal(impact.lowerFacing,'W','Chase direction already responds to the moving player');
    const recover=step(state,{attackElapsed:.94,targetFacing:'W',movementFacing:'W'});
    assert.equal(recover.actionFrame,11,'Attack timeline never restarted when the target moved');
    assert.notEqual(recover.upperFacing,'E','Upper body begins turning after the impact');
    const chase=step(state,{attackToken:null,attackElapsed:HOLLOW_ATTACK_DURATION,targetFacing:'W',movementFacing:'W'});
    assert.equal(chase.actionActive,false);
    assert.equal(chase.lowerFacing,'W');
    assert.equal(chase.actionWeight,0);
});

test('crawler support is continuous during claw attacks and no standing gait is introduced',()=>{
    const state=createHollowCombatLayers('S');
    const sample=step(state,{crawling:true,attackElapsed:.7,movementFacing:'N',targetFacing:'E'});
    assert.equal(sample.locomotionKind,'crawl');
    assert.equal(sample.lowerFacing,'N');
    assert.equal(sample.lowerPhaseContinuous,true);
    assert.equal(sample.actionActive,true);
});

test('pause and freeze hold committed animation pose without advancing turns',()=>{
    const state=createHollowCombatLayers('E');
    const strike=step(state,{attackElapsed:.70});
    const paused=step(state,{attackElapsed:.8,targetFacing:'W',paused:true});
    assert.equal(paused.upperFacing,strike.upperFacing);
    assert.equal(paused.actionFrame,strike.actionFrame);
    const frozen=step(state,{attackElapsed:.9,targetFacing:'W',frozen:true});
    assert.equal(frozen.actionFrame,strike.actionFrame);
    assert.equal(frozen.upperFacing,strike.upperFacing);
});

test('reduced-motion still respects the committed action and returns to locomotion',()=>{
    const state=createHollowCombatLayers();
    const a=step(state,{attackElapsed:.65,reducedMotion:true});
    assert.equal(a.actionWeight,1);
    const b=step(state,{attackElapsed:2,attackToken:null,reducedMotion:true});
    assert.equal(b.actionActive,false);
    assert.equal(b.actionWeight,0);
});
