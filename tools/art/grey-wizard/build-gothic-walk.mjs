// Offline 2D authoring/export only. Runtime playback stays in sprite-animation.js.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Bitmap} from '../lib/painter.mjs';
import {decodePng,encodePng} from '../lib/png.mjs';
const overlap=process.argv.includes('--overlap-fix');
const repair=overlap||process.argv.includes('--repair-stick');
const walkingStick=repair||process.argv.includes('--walking-stick');
const southeast=walkingStick||process.argv.includes('--southeast');
const sourceModule=overlap?'./gothic-walking-stick-overlap.mjs':repair?'./gothic-walking-stick-repair.mjs':walkingStick?'./gothic-walking-stick-project.mjs':southeast?'./gothic-southeast-project.mjs':'./gothic-project.mjs';
const source=await import(sourceModule),{project,poses,idle}=source;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const out=join(root,'art/source/characters/grey-wizard',project.outputDirectory??'gothic-south-v003');
const check=process.argv.includes('--check'),files=new Map(),size=project.exportCell;
const hash=x=>createHash('sha256').update(x).digest('hex');
const readBitmap=name=>{const d=decodePng(readFileSync(join(out,name)));const b=new Bitmap(d.width,d.height);b.data.set(d.rgba);return b;};
const master=readBitmap('source-master.png');
const layers=Object.fromEntries(project.drawOrder.map(n=>[n,readBitmap('source-layers/'+n+'.png')]));
const emit=(name,b)=>files.set(name,encodePng(b.width,b.height,b.data));
const json=(name,o)=>files.set(name,Buffer.from(JSON.stringify(o,null,2)+'\n'));
const clamp=x=>Math.max(0,Math.min(1,x));
const lerp=(a,b,t)=>a+(b-a)*clamp(t);
function turn(x,y,cx,cy,a){const dx=x-cx,dy=y-cy;return [cx+dx*Math.cos(a)-dy*Math.sin(a),cy+dx*Math.sin(a)+dy*Math.cos(a)];}
function transform(name,x,y,p){
    if(source.transform)return source.transform(name,x,y,p);
    const [bx,by,lx,ly,la,rx,ry,ra,free,hand,angle,beard,hem]=p;
    let dx=bx,dy=by;
    if(name==='boot-left'||name==='boot-right'){
        const left=name==='boot-left',q=turn(x,y,left?24:48,125,left?la:ra);
        return [q[0]+(left?lx:rx),q[1]+(left?ly:ry)];
    }
    if(name==='staff'){
        const q=turn(x,y,11,52,angle);return [q[0]+bx,q[1]+by+hand];
    }
    if(name==='staff-hand')return [x+bx,y+by+hand];
    if(name==='arm-staff'){
        const bend=clamp((y-36)/16);dx+=-.3*hand*Math.sin(bend*Math.PI);dy+=hand*bend;
    }else if(name==='arm-free'){
        const bend=clamp((y-44)/34);dx+=free*.22*bend;dy+=free*bend;
    }else if(name==='beard'){
        const tip=clamp((y-31)/17);dx+=beard*tip;dy+=Math.abs(beard)*tip*.25;
    }else if(name==='cloak-left'||name==='cloak-right'){
        const left=name==='cloak-left',f=left?ly:ry,knee=clamp((y-66)/45),edge=clamp((y-100)/23);
        dx+=(left?lx:rx)*.5*knee+(left?hem:-hem)*edge;
        dy=by*(1-edge*.5)+f*.3*knee;
    }else if(name==='torso'){
        const low=clamp((y-70)/52),side=(x-36)/28;
        dx+=hem*low*.3;dy=by*(1-low*.5)+(ly*(1-side)+ry*(1+side))*.075*low;
    }else if(name==='head-hair'||name==='hat'){
        dx-=beard*.15;
    }
    return [x+dx,y+dy];
}
function hiddenBleed(b){
    // Two-pixel hidden edge extension within the source's existing silhouette.
    // This is seam support, not invented anatomy or reviewed hidden-source painting.
    const r=new Bitmap(b.width,b.height);
    for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)if(master.alpha(x,y)&&!b.alpha(x,y)){
        let chosen=null,best=Infinity;
        for(let oy=-project.bleed;oy<=project.bleed;oy++)for(let ox=-project.bleed;ox<=project.bleed;ox++)if(b.alpha(x+ox,y+oy)){
            const d=ox*ox+oy*oy;if(d<best){best=d;chosen=b.get(x+ox,y+oy);}
        }
        if(chosen)r.set(x,y,chosen);
    }
    return r;
}
const bleed=Object.fromEntries(project.drawOrder.map(n=>[n,hiddenBleed(layers[n])]));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function triangle(dst,texture,uv,xy){
    const det=cross(xy[0],xy[1],xy[2]);if(Math.abs(det)<1e-8)return;
    const minX=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[0])))),maxX=Math.min(size-1,Math.ceil(Math.max(...xy.map(p=>p[0]))));
    const minY=Math.max(0,Math.floor(Math.min(...xy.map(p=>p[1])))),maxY=Math.min(size-1,Math.ceil(Math.max(...xy.map(p=>p[1]))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        const p=[x+.5,y+.5],a=cross(p,xy[1],xy[2])/det,b=cross(xy[0],p,xy[2])/det,c=1-a-b;
        if(Math.min(a,b,c)<-1e-7)continue;
        const u=Math.floor(a*uv[0][0]+b*uv[1][0]+c*uv[2][0]);
        const v=Math.floor(a*uv[0][1]+b*uv[1][1]+c*uv[2][1]);
        const pigment=texture.get(u,v);if(pigment[3])dst.set(x,y,pigment);
    }
}
function warp(texture,name,p){
    const dst=new Bitmap(size,size),step=4;
    for(let y=0;y<texture.height;y+=step)for(let x=0;x<texture.width;x+=step){
        const uv=[[x,y],[Math.min(texture.width,x+step),y],[Math.min(texture.width,x+step),Math.min(texture.height,y+step)],[x,Math.min(texture.height,y+step)]];
        const xy=uv.map(([u,v])=>{const q=transform(name,u,v,p);return [q[0]+project.offset[0],q[1]+project.offset[1]];});
        for(const ids of [[0,1,2],[0,2,3]])triangle(dst,texture,ids.map(i=>uv[i]),ids.map(i=>xy[i]));
    }
    return dst;
}
const emissionSource=new Bitmap(...project.sourceCell);
for(let y=0;y<master.height;y++)for(let x=0;x<master.width;x++){
    const c=layers.staff.get(x,y);
    if(c[3]&&c[0]>135&&c[0]>c[1]*1.35&&c[0]>c[2]*1.7)emissionSource.set(x,y,c);
}
function render(p){
    const dst=new Bitmap(size,size);
    for(const name of project.drawOrder)dst.blit(warp(bleed[name],name,p),0,0);
    for(const name of project.drawOrder)dst.blit(warp(layers[name],name,p),0,0);
    if(project.cleanIslandsMaxPixels){
        const seen=new Set();
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){
            const key=y*size+x;if(!dst.alpha(x,y)||seen.has(key))continue;
            const part=[key];seen.add(key);
            for(let i=0;i<part.length;i++){
                const px=part[i]%size,py=Math.floor(part[i]/size);
                for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
                    const nx=px+ox,ny=py+oy,k=ny*size+nx;
                    if(dst.inside(nx,ny)&&dst.alpha(nx,ny)&&!seen.has(k)){seen.add(k);part.push(k);}
                }
            }
            if(part.length<=project.cleanIslandsMaxPixels)for(const k of part)dst.clear(k%size,Math.floor(k/size));
        }
    }
    return dst;
}
function up(b,factor){const r=new Bitmap(b.width*factor,b.height*factor);for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)r.set(x,y,b.get(Math.floor(x/factor),Math.floor(y/factor)));return r;}
const idleImage=render(idle);
const reference=new Bitmap(size,size).blit(master,...project.offset);
assert.deepEqual(idleImage.data,reference.data,'idle source mesh alters approved reconstruction');
emit('idle.png',idleImage);emit('idle-2x.png',up(idleImage,2));
const frames=poses.map(render),atlas=new Bitmap(size*16,size),emission=new Bitmap(size*16,size),unique=new Set();
let minX=size,minY=size,maxX=0,maxY=0;
for(let i=0;i<16;i++){
    const b=frames[i];unique.add(hash(b.data));const bounds=b.opaqueBounds();
    assert.ok(bounds.x>2&&bounds.y>2&&bounds.x+bounds.w<size-2&&bounds.y+bounds.h<size-2,'clipped walk source');
    minX=Math.min(minX,bounds.x);minY=Math.min(minY,bounds.y);maxX=Math.max(maxX,bounds.x+bounds.w-1);maxY=Math.max(maxY,bounds.y+bounds.h-1);
    for(let p=3;p<b.data.length;p+=4)assert.ok(b.data[p]===0||b.data[p]===255);
    atlas.blit(b,size*i,0);emission.blit(warp(emissionSource,'staff',poses[i]),size*i,0);emit(`frames/walk-${String(i).padStart(2,'0')}.png`,b);
}
assert.equal(unique.size,16,'duplicated walk poses');
emit('walk.png',atlas);emit('walk-emission.png',emission);
const board=new Bitmap(size*4*2,size*4*2);for(let i=0;i<16;i++)board.blit(up(frames[i],2),(i%4)*size*2,Math.floor(i/4)*size*2);emit('walk-contact-2x.png',board);
const anchor=project.sourcePivot.map((v,i)=>v+project.offset[i]);
const calibration=JSON.parse(readFileSync(join(out,'scale-calibration.json'),'utf8'));
const worldSize=calibration.wizardWorldSize;
assert.ok(Math.abs((calibration.wizardSourceSoleY-calibration.wizardSourceCrownY)*worldSize/size-calibration.standingBodyWorldHeight)<.001,'body-scale calibration mismatch');
const profile={schemaVersion:1,maxDeltaSeconds:.1,facing:{directions:[project.direction],degreesPerSecond:360,hysteresisDegrees:3},locomotion:{clip:'walk',frames:16,stride:project.sourceStride*worldSize/size,sourceFps:project.fps,calibration:'source stride only; actual C# speed and frame cadence not accepted'},actions:{}};
json('animation-profile.json',profile);
json('manifest.json',{schemaVersion:1,directions:[project.direction],status:project.status,clips:{idle:{image:'idle.png',frames:1,cell:size,anchor,worldSize},walk:{image:'walk.png',frames:16,cell:size,anchor,worldSize}},emission:{walk:'walk-emission.png'},sourceExport:'art/source/characters/grey-wizard/'+(project.outputDirectory??'gothic-south-v003')});
json('motion.json',{source:'tools/art/grey-wizard/'+sourceModule.slice(2),coordinates:'native source x/y; no gameplay authority',poses,sourceStride:project.sourceStride,sourceContacts:poses.map((p,i)=>({frame:i,left:i<8,right:i>=8,...(walkingStick?{staffPlanted:i>=7}:{}),...(southeast?{rootX:i,rootY:i}:{rootY:2*i})})),scope:'authored 2D study only; masks, overlap, foot fit and source art need review'});
// Measure source boot raster sole during its declared stance. This is NOT a
// C# root replay, general biomechanics validation or real Hunt contact proof.
const contacts=source.sourceContacts?source.sourceContacts(warp,layers):[];
for(const [name,start]of source.sourceContacts?[]:[['boot-left',0],['boot-right',8]]){
    const sole=[];for(let i=start;i<start+8;i++){const b=warp(layers[name],name,poses[i]);const q=b.opaqueBounds();sole.push(q.y+q.h-1+2*i);}
    const drift=Math.max(...sole)-Math.min(...sole);assert.ok(drift<=1,'source raster stance drift '+name);
    contacts.push({name,frames:[start,start+7],sourceRasterSoleWorldY:sole,maxSpreadNativePixels:drift});
}
for(const contact of contacts)assert.ok(contact.maxSpreadNativePixels<=1,'source raster stance drift '+contact.name);
const shared=readFileSync(join(root,'src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js'),'utf8');
const {createSpriteAnimationState,updateSpriteAnimation}=await import('data:text/javascript;base64,'+Buffer.from(shared).toString('base64'));
const state=createSpriteAnimationState(),sequence=[];
for(let i=0;i<16;i++)sequence.push(updateSpriteAnimation(state,profile,{direction:project.direction,distance:i?profile.locomotion.stride/16:0,deltaSeconds:1/project.fps,moving:true}).baseFrame);
assert.deepEqual(sequence,Array.from({length:16},(_,i)=>i));
const paused=updateSpriteAnimation(state,profile,{direction:'S',distance:10,deltaSeconds:.1,moving:true,paused:true});assert.equal(paused.baseFrame,15);
const reduced=updateSpriteAnimation(state,profile,{direction:'S',distance:0,deltaSeconds:0,moving:true,reducedMotion:true});assert.equal(reduced.baseFrame,0);
json('verification.json',{status:project.status,sourceLayerRecompositionExact:true,idleRasterExact:true,uniqueFrames:unique.size,binaryAlpha:true,paletteSize:project.paletteSize,sourceBounds:{minX,minY,maxX,maxY},cell:size,anchor,decodedAlbedoBytes:atlas.data.length,decodedEmissionBytes:emission.data.length,sharedControllerSequence:sequence,pause:true,reducedMotion:true,contacts,sourceProjectSha256:hash(readFileSync(new URL(sourceModule,import.meta.url))),controllerSha256:hash(shared),runtimeIntegrated:false,artisticallyApproved:false,physicalDeviceTested:false,limitations:['diagnostic extracted emission; source-light still baked in albedo','two-pixel hidden edge fills, not fully painted hidden anatomy','single source view only','source-only contact does not establish C# root-speed fitting','native world scale and actual phones open']});
for(const[name,data]of files){const path=join(out,name);if(check){assert.ok(existsSync(path),'missing '+name);assert.deepEqual(readFileSync(path),data,'stale '+name);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}}
console.log(JSON.stringify({mode:check?'check':'build',files:files.size,frames:unique.size,contacts,mapsDecodedBytes:atlas.data.length+emission.data.length}));
