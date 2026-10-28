import fs from 'node:fs';
import {createSpriteAnimationState,updateSpriteAnimation} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js';
import {updateSourceSkinSupport} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/source-skin-support.js';
const dir=process.argv[2]??'artifacts/an-skin-lod12000',surface=JSON.parse(fs.readFileSync(dir+'/poses.json')),profile=JSON.parse(fs.readFileSync(dir+'/profile.json'));
const cases={forward:t=>[0,30*t],side:t=>[30*t,0],back:t=>[0,-30*t],corner:t=>[30*Math.max(0,t-1),30*Math.min(t,1)],reverse:t=>[0,30*(t<1?t:2-t)],idle:t=>[0,0],turn:t=>[0,0]};
const reports=[];
for(const [name,world] of Object.entries(cases))for(const hz of [15,30,60,120]){
 const state=createSpriteAnimationState(),contacts={};let old=world(0),travel=0,error=null,count=0,maxShift=0;
 for(let i=0;i<=hz*4;i++){
  const t=i/hz,p=world(t),dx=p[0]-old[0],dy=p[1]-old[1];travel+=Math.hypot(dx,dy);old=p;
  const intent={entityId:1,timestamp:t,travel,world:{x:p[0],y:p[1]},direction:name==='turn'&&t>.5?'N':'S',moving:!!(dx||dy),action:t>=.7?{name:'attack',token:'test',sequence:0}:null};
  try{const sample=updateSpriteAnimation(state,profile,intent),posed=updateSourceSkinSupport(contacts,surface,profile,sample,intent);count++;maxShift=Math.max(maxShift,Math.hypot(...(posed.sourcePose.sourceRepose?.bodyShift??[0,0,0])));}catch(e){error={t,message:e.message,details:e.sourcePoseFailure};break;}
 }
 reports.push({name,hz,count,maxShift,error});
}
console.log(JSON.stringify(reports,null,2));if(reports.some(r=>r.error))process.exitCode=1;
