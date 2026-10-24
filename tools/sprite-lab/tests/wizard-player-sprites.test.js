import test from 'node:test';
import assert from 'node:assert/strict';
import {createWizardPlayerSprites,isApprovedWizardManifest,WIZARD_DIRECTIONS,WIZARD_VISUAL_ID,WIZARD_CLIPS} from '../../../src/Wyrmforge.Presentation.Web/wwwroot/js/wizard-player-sprites.js';

const goodManifest=()=>({
    schemaVersion:1,directions:[...WIZARD_DIRECTIONS],
    acceptance:{visualId:WIZARD_VISUAL_ID,ownerApproved:true,nativeGameplayReviewed:true,sharedLightingVerified:true},
    clips:Object.fromEntries(Object.entries(WIZARD_CLIPS).map(([name,frames])=>
        [name,{frames,cell:128,anchor:[64,106],worldSize:72,image:name+'.png'}])),
});
const profile={
    maxDeltaSeconds:.1,
    facing:{directions:['E','SE','S','SW','W','NW','N','NE'],degreesPerSecond:720},
    locomotion:{clip:'walk',frames:16,stride:18},
    idle:{clip:'idle',frames:12,fps:12},
    actions:{
        cast:{clip:'cast',frames:20,fps:20,priority:10,reducedFrame:10},
        hurt:{clip:'hurt',frames:10,fps:18,priority:30},
        death:{clip:'death',frames:24,fps:12,priority:100,hold:true},
    },
};
function renderer(manifest,loaded=true){
    const frames=[];
    return{frames,ready:()=>loaded,preload:async()=>loaded,getManifest:()=>manifest,getAnimationProfile:()=>profile,
        drawFrame:(...args)=>{frames.push(args);return true;}};
}
const player=(x=100,y=150)=>({x,y,radius:12});
test('requires entire original eight-facing production set and three approvals',()=>{
    const m=goodManifest();assert.equal(isApprovedWizardManifest(m),true);
    assert.equal(isApprovedWizardManifest({...m,clips:{walk:m.clips.walk}}),false);
    assert.equal(isApprovedWizardManifest({...m,directions:[...m.directions].reverse()}),false);
    assert.equal(isApprovedWizardManifest({...m,acceptance:{...m.acceptance,ownerApproved:false}}),false);
    assert.equal(isApprovedWizardManifest({...m,acceptance:{...m.acceptance,sharedLightingVerified:false}}),false);
    assert.equal(isApprovedWizardManifest({...m,acceptance:{...m.acceptance,nativeGameplayReviewed:false}}),false);
    assert.equal(isApprovedWizardManifest(null),false);
});
test('missing or rejected sprites fail closed; no fake still-frame replacement',async()=>{
    for(const manifest of [null,{...goodManifest(),acceptance:{ownerApproved:false}}]){
        const drawing=renderer(manifest),sprites=createWizardPlayerSprites({renderer:drawing});
        assert.equal(await sprites.preload(),false);
        assert.equal(sprites.draw({},player(),null,0,sprites.createState()),false);
        assert.equal(drawing.frames.length,0);
    }
});
test('accepted 8-view frames render via shared atlas path at actual player feet',async()=>{
    const drawing=renderer(goodManifest()),sprites=createWizardPlayerSprites({renderer:drawing});
    assert.equal(await sprites.preload(),true);
    const state=sprites.createState();
    assert.equal(sprites.draw({},player(),null,0,state),true);
    assert.equal(drawing.frames[0][1],'idle');
    sprites.draw({},player(102,150),null,.09,state);
    assert.equal(drawing.frames.at(-1)[1],'walk');
    sprites.draw({},player(104,150),{progress:.3,angle:0},.17,state);
    assert.equal(drawing.frames.at(-1)[1],'cast');
    assert.equal(drawing.frames.at(-1)[4],104);
    assert.equal(drawing.frames.at(-1)[5],150);
});
test('teleport does not advance locomotion phase; paused casts hold rather than mutate C#',async()=>{
    const drawing=renderer(goodManifest()),sprites=createWizardPlayerSprites({renderer:drawing});
    await sprites.preload();const state=sprites.createState();
    sprites.draw({},player(),null,0,state);
    sprites.draw({},player(300,150),null,.1,state);
    assert.equal(drawing.frames.at(-1)[1],'idle');
    sprites.draw({},player(300,150),{progress:.4,angle:1},.2,state);
    const last=drawing.frames.at(-1);
    sprites.draw({},player(300,150),{progress:.4,angle:1},.2,state,{paused:true});
    assert.equal(drawing.frames.at(-1)[2],last[2]);
});
