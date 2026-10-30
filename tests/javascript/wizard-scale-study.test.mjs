import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWizardScaleStudy,wizardScaleStudyEnabled} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/wizard-scale-study.js';
test('wizard source opt-in is restricted to explicit existing Enemy Lab',()=>{
    for(const pathname of ['/','/hunt','/enemy-lab-other'])assert.equal(wizardScaleStudyEnabled({pathname,search:'?wizardStudy=gothic-south-v003'}),false);
    assert.equal(wizardScaleStudyEnabled({pathname:'/enemy-lab',search:''}),false);
    assert.equal(wizardScaleStudyEnabled({pathname:'/Wyrmforge/enemy-lab',search:'?wizardStudy=gothic-south-v003'}),true);
});
test('study uses source manifest anchor/world size and paused shared frame, never changes player',async()=>{
    const base=new URL('../../art/source/characters/grey-wizard/gothic-south-v003/',import.meta.url);
    class Picture {set src(url){const name=new URL(url).pathname.split('/').pop();this.naturalWidth=name==='walk.png'?2560:160;this.naturalHeight=160;queueMicrotask(()=>this.onload());}}
    const study=createWizardScaleStudy({enabled:true,base,ImageType:Picture,fetcher:async url=>({ok:true,json:async()=>JSON.parse(readFileSync(url,'utf8'))})});
    assert.equal(await study.preload(),true);
    const player=Object.freeze({x:100,y:200,radius:12});study.update(player,1);study.update({...player,y:201},1.05);const frame=study.diagnostics().frame;
    study.update({...player,y:201},1.1,false,true);assert.equal(study.diagnostics().frame,frame);
    const calls=[];const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push(a);}};
    assert.equal(study.draw(ctx,player,null),true);
    const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8')),clip=manifest.clips.walk;
    const args=calls[0];assert.equal(args[7],clip.worldSize);assert.equal(args[8],clip.worldSize);
    assert.equal(args[5],player.x-clip.anchor[0]/clip.cell*clip.worldSize);
    assert.equal(args[6],player.y-clip.anchor[1]/clip.cell*clip.worldSize);
    assert.equal(study.draw(ctx,player,{progress:.2}),false);
});
test('missing study asset keeps production fallback available',async()=>{
    const study=createWizardScaleStudy({enabled:true,ImageType:class{},fetcher:async()=>({ok:false})});
    assert.equal(await study.preload(),false);assert.equal(study.draw({}, {x:0,y:0},null),false);
    assert.ok(study.diagnostics().error);
});
