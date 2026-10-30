// Native side-view authoring: explicit far boot/shaft, not a mirrored character.
export const project={id:'grey-wizard-fire-east-walk-v013',outputDirectory:'gothic-east-v013',source:'gothic-directions-v005/E.png',
 sourceCell:[160,160],exportCell:160,offset:[0,0],sourcePivot:[80,139],direction:'E',frames:16,fps:12,
 paletteSize:96,bleed:2,cleanIslandsMaxPixels:6,sourceStride:24,rootPerFrame:[1.5,0],walkingStick:true,
 noBleedLayers:['boot-left','boot-right'],noBleedBelowSourceY:126,
 protectStaffFootprint:true,
 trimLayerContours:[{names:['torso','cloak-right'],polygon:[[94,94],[99,94],[99,126],[93,126],[93,112]]}],
 status:'east source walk/hidden-leg reconstruction; not live locomotion or final art acceptance',
 staffRows:[[33,103,110],[34,107,110],[35,105,109],[36,106,111],[37,105,112],[38,103,111],[39,102,110],[40,102,110],[41,101,110],[42,101,111],[43,100,113],[44,104,113],[45,99,114],[46,99,114],[47,100,114],[48,100,113],[49,100,112],[50,102,112],[51,102,111],[52,102,105],[53,101,105],[54,102,105],[55,104,110],[56,102,105],[57,102,105],[58,102,105],[59,101,108],[60,101,107],[61,101,108],[62,101,107],[63,101,106],[64,101,106],[65,101,106],[66,99,106],[67,98,105],[68,98,105],[69,97,108],[70,97,108],[71,97,107],[72,98,107],[73,98,106],[74,98,106],[75,98,106],[76,98,105],[77,99,104],[78,98,105],[79,98,105],[80,97,104],[81,97,104],[82,96,104],[83,97,104],[84,96,104],[85,96,104],[86,96,104],[87,96,104],[88,97,104],[89,97,105],[90,97,105],[91,97,105],[92,97,104],[93,96,104],[94,96,104],[95,96,103],[96,96,103],[97,95,102],[98,94,102],[99,95,102],[100,95,102],[101,95,102],[102,95,102],[103,95,103],[104,96,103],[105,96,103],[106,96,104],[107,96,104],[108,96,103],[109,95,103],[110,95,102],[111,95,102],[112,95,102],[113,93,101],[114,93,101],[115,93,101],[116,93,101],[117,93,102],[118,93,102],[119,93,102],[120,93,102],[121,94,102],[122,94,101],[123,94,101],[124,94,101],[125,94,101],[126,93,101],[127,93,101],[128,93,101],[129,93,101],[130,93,101],[131,92,101],[132,92,101],[133,92,101],[134,94,100]],
 masks:[
  {name:'boot-left',polygon:[[71,127],[81,127],[84,130],[91,132],[96,136],[94,142],[73,143],[68,139],[68,132]]},
  {name:'boot-right',polygon:[[0,0],[1,0],[1,1],[0,1]]},
  {name:'staff-hand',polygon:[[98,68],[105,68],[107,72],[105,77],[99,77],[97,73]]},
  {name:'staff',polygon:[[103,33],[109,33],[112,44],[110,52],[106,58],[105,67],[104,79],[103,91],[101,105],[100,120],[98,135],[94,135],[94,120],[95,103],[96,89],[98,76],[98,64],[100,55],[100,43]]},
  {name:'hat',polygon:[[63,16],[87,16],[92,28],[102,31],[101,38],[91,43],[77,45],[62,43],[61,39]]},
  {name:'beard',polygon:[[88,43],[94,43],[96,50],[95,64],[92,66],[89,57],[87,49]]},
  {name:'head-hair',polygon:[[71,39],[88,37],[94,42],[92,49],[86,53],[75,50],[69,46]]},
  {name:'arm-staff',polygon:[[81,64],[89,63],[96,67],[100,68],[102,77],[99,85],[95,93],[89,94],[82,88],[79,79]]},
  {name:'cloak-left',polygon:[[67,49],[76,51],[75,73],[74,92],[70,107],[67,124],[63,134],[56,134],[50,125],[48,116],[50,105],[54,89],[56,73],[57,61]]},
  {name:'cloak-right',polygon:[[88,92],[94,89],[96,103],[94,119],[90,127],[86,125],[85,110]]},
 ],
 occludedLegs:[{name:'boot-left',polygon:[[73,112],[79,112],[82,133],[71,133]],donor:[73,130,6,3],garmentAboveY:128}],
 hiddenCopies:[{name:'boot-right',from:'boot-left',offset:[-2,-2],shade:.85}],
 drawOrder:['boot-right','boot-left','torso','cloak-left','cloak-right','head-hair','beard','hat','arm-staff','staff','staff-hand'],
};
// bodyX/bodyY, near/far foot progression/lift/pitch, cloth lag, staff dx/dy/pitch.
export const poses=[
 [ .2,0,6,0,0,-6,0,-.06,-.3,-3.5,-1,.05],
 [ .1,.3,4.5,0,0,-6,2,-.08,-.2,-3.5,-3,.04],
 [ 0,.6,3,0,0,-4.5,4,-.06,0,-2,-5,.015],
 [-.1,.7,1.5,0,0,-3,5,-.03,.2,1,-6,-.02],
 [-.2,.5,0,0,0,0,5,0,.3,4,-6,-.055],
 [-.1,.2,-1.5,0,0,3,4,.04,.4,7,-4,-.09],
 [ 0,-.1,-3,0,0,4.5,2,.05,.3,10,-2,-.12],
 [ .1,-.1,-4.5,0,0,6,0,0,.1,10,0,-.12],
 [ .2,0,-6,0,-.06,6,0,0,-.3,8.5,0,-.10],
 [ .1,.3,-6,2,-.08,4.5,0,0,-.2,7,0,-.08],
 [ 0,.6,-4.5,4,-.06,3,0,0,0,5.5,0,-.06],
 [-.1,.7,-3,5,-.03,1.5,0,0,.2,4,0,-.04],
 [-.2,.5,0,5,0,0,0,0,.3,2.5,0,-.02],
 [-.1,.2,3,4,.04,-1.5,0,0,.4,1,0,0],
 [ 0,-.1,4.5,2,.05,-3,0,0,.3,-.5,0,.02],
 [ .1,-.1,6,0,0,-4.5,0,0,.1,-2,0,.04],
];
export const idle=Array(12).fill(0);
export const staffTip=[96.5,134],staffGrip=[102,72];
const clamp=x=>Math.max(0,Math.min(1,x));
const rotate=(x,y,cx,cy,a)=>{const dx=x-cx,dy=y-cy;return [cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a)];};
export function staffPoint(x,y,p){const q=rotate(x,y,...staffTip,p[11]);return [q[0]+p[9],q[1]+p[10]];}
export function transform(name,x,y,p){
 const [bx,by,near,nLift,nPitch,far,fLift,fPitch,lag]=p;
 if(name==='boot-left'||name==='boot-right'){
  const n=name==='boot-left',q=rotate(x,y,n?76:74,n?132:130,n?nPitch:fPitch);
  return [q[0]+(n?near:far),q[1]-(n?nLift:fLift)];
 }
 if(name==='staff'||name==='staff-hand')return staffPoint(x,y,p);
 let dx=bx,dy=by;
 if(name==='arm-staff'){
  const target=staffPoint(...staffGrip,p),blend=clamp((x-81)/21)*(y<=73?clamp((y-62)/11):clamp((96-y)/23));
  dx+=(target[0]-staffGrip[0]-bx)*blend;dy+=(target[1]-staffGrip[1]-by)*blend;
 }else if(name==='cloak-left'||name==='cloak-right'){
  const low=clamp((y-72)/54),f=name==='cloak-left'?far:near;
  dx+=f*.22*low+lag*low;dy=by*(1-low*.4);
 }else if(name==='torso')dx+=lag*.25*clamp((y-86)/40);
 else if(name==='beard'){dx-=lag*.5*clamp((y-47)/18);dy+=Math.abs(lag)*.15;}
 return [x+dx,y+dy];
}
export function sourceContacts(warp,layers){
 const records=[];
 for(const[name,start]of [['boot-left',0],['boot-right',8]]){
  const points=[];for(let i=start;i<start+8;i++){const q=warp(layers[name],name,poses[i]).opaqueBounds();points.push({x:q.x+q.w-1+1.5*i,y:q.y+q.h-1});}
  records.push({name,frames:[start,start+7],sourceRasterSoleWorldXY:points,maxSpreadNativePixels:spread(points)});
 }
 const tips=[],raster=[];
 for(let i=7;i<16;i++){
  const tip=staffPoint(...staffTip,poses[i]);tips.push({x:tip[0]+1.5*i,y:tip[1]});
  const b=warp(layers.staff,'staff',poses[i]),q=b.opaqueBounds(),bottom=q.y+q.h-1,xs=[];
  for(let x=0;x<b.width;x++)if(b.alpha(x,bottom))xs.push(x);
  raster.push({x:xs.reduce((a,b)=>a+b,0)/xs.length+1.5*i,y:bottom});
 }
 const gripError=Math.max(...poses.map(p=>{const a=transform('staff',...staffGrip,p),b=transform('staff-hand',...staffGrip,p);return Math.hypot(a[0]-b[0],a[1]-b[1]);}));
 if(spread(tips)>1e-8||gripError>1e-8)throw Error('East support/grip detached');
 records.push({name:'staff-tip',frames:[7,15],sourceWorldTipXY:tips,sourceRasterBottomXY:raster,maxSpreadNativePixels:spread(raster),analyticalDrift:spread(tips),staffHandGripError:gripError,scope:'source-only contact under root[1.5i,0], not C# fit'});
 return records;
}
function spread(points){return Math.max(...['x','y'].map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))));}
