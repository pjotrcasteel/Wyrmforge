// Native source preparation: format/palette/semantic masks, never generates poses.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodePng,encodePng} from '../lib/png.mjs';
import {Bitmap} from '../lib/painter.mjs';
const {project}=await import(process.argv.includes('--east')?'./gothic-east-project.mjs':process.argv.includes('--leg-coverage')?'./gothic-south-legs.mjs':process.argv.includes('--boot-cleanup')?'./gothic-south-boots.mjs':process.argv.includes('--south-stick')?'./gothic-south-stick.mjs':process.argv.includes('--overlap-fix')?'./gothic-walking-stick-overlap.mjs':process.argv.includes('--repair-stick')?'./gothic-walking-stick-repair.mjs':process.argv.includes('--walking-stick')?'./gothic-walking-stick-project.mjs':process.argv.includes('--southeast')?'./gothic-southeast-project.mjs':'./gothic-project.mjs');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const base=join(root,'art/source/characters/grey-wizard'),out=join(base,project.outputDirectory??'gothic-south-v003');
mkdirSync(join(out,'source-layers'),{recursive:true});
const bytes=readFileSync(join(base,project.source)),source=decodePng(bytes);
assert.deepEqual([source.width,source.height],project.sourceCell);
const width=source.width,height=source.height,rgba=source.rgba;
const histogram=new Map();
for(let p=0;p<rgba.length;p+=4)if(rgba[p+3]){
    const k=(rgba[p]<<16)|(rgba[p+1]<<8)|rgba[p+2];histogram.set(k,(histogram.get(k)||0)+1);
}
const initial=[...histogram].map(([key,n])=>({rgb:[key>>16,(key>>8)&255,key&255],n,key}));
const range=box=>[0,1,2].map(c=>Math.max(...box.map(p=>p.rgb[c]))-Math.min(...box.map(p=>p.rgb[c])));
const boxes=[initial];
while(boxes.length<project.paletteSize){
    let chosen=-1,score=-1,axis=0;
    boxes.forEach((box,i)=>{if(box.length<2)return;const r=range(box);const c=r.indexOf(Math.max(...r));const s=r[c]*Math.sqrt(box.reduce((n,p)=>n+p.n,0));if(s>score){chosen=i;score=s;axis=c;}});
    if(chosen<0)break;
    const box=boxes.splice(chosen,1)[0].sort((a,b)=>a.rgb[axis]-b.rgb[axis]||a.key-b.key);
    const total=box.reduce((n,p)=>n+p.n,0);let weight=0,at=1;
    for(let i=0;i<box.length-1;i++){weight+=box[i].n;if(weight>=total/2){at=i+1;break;}}
    boxes.push(box.slice(0,at),box.slice(at));
}
const palette=boxes.map(box=>{const n=box.reduce((s,p)=>s+p.n,0);return [0,1,2].map(c=>Math.round(box.reduce((s,p)=>s+p.n*p.rgb[c],0)/n));});
const nearest=new Map(initial.map(p=>{
    let best=0,distance=Infinity;palette.forEach((rgb,i)=>{const d=rgb.reduce((s,c,k)=>s+(c-p.rgb[k])**2*[2,3,1][k],0);if(d<distance){distance=d;best=i;}});return [p.key,best];
}));
const master=new Bitmap(width,height),indices=new Array(width*height).fill(-1);
for(let p=0;p<rgba.length;p+=4)if(rgba[p+3]){
    const key=(rgba[p]<<16)|(rgba[p+1]<<8)|rgba[p+2],index=nearest.get(key);indices[p/4]=index;
    master.data.set([...palette[index],255],p);
}
for(const [x,y]of project.clearPixels??[]){assert.ok(master.alpha(x,y),'authored cleanup pixel missing');master.clear(x,y);}
if(project.cleanIslandsMaxPixels){
    const seen=new Set();
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const key=y*width+x;if(!master.alpha(x,y)||seen.has(key))continue;
        const component=[key];seen.add(key);
        for(let i=0;i<component.length;i++){
            const px=component[i]%width,py=Math.floor(component[i]/width);
            for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
                const nx=px+dx,ny=py+dy,k=ny*width+nx;
                if(master.inside(nx,ny)&&master.alpha(nx,ny)&&!seen.has(k)){seen.add(k);component.push(k);}
            }
        }
        if(component.length<=project.cleanIslandsMaxPixels)for(const k of component)master.clear(k%width,Math.floor(k/width));
    }
}
const names=[...project.masks.map(m=>m.name),'torso',...(project.underpaint??[]).map(p=>p.name)];
const layers=Object.fromEntries(names.map(n=>[n,new Bitmap(width,height)]));
const owner=new Array(width*height).fill(null);
const staffRows=new Map((project.staffRows??[]).map(([y,left,right])=>[y,[left,right]]));
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(master.alpha(x,y)){
    const name=project.masks.find(m=>m.name==='staff'&&staffRows.has(y)?x>=staffRows.get(y)[0]&&x<staffRows.get(y)[1]:inside(x+.5,y+.5,m.polygon))?.name||'torso';
    layers[name].set(x,y,master.get(x,y));owner[y*width+x]=name;
}
for(const trim of project.trimLayerContours??[])for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(!inside(x+.5,y+.5,trim.polygon))continue;
    for(const name of trim.names)if(layers[name].alpha(x,y)){layers[name].clear(x,y);master.clear(x,y);}
}
// Explicit source painting behind an occluding staff; existing source pigments only.
// Filled pixels are hidden in the resting source, exposed by authored staff travel.
for(const paint of project.underpaint??[])for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(!layers[paint.owner].alpha(x,y)||!inside(x+.5,y+.5,paint.polygon))continue;
    const pigment=master.get(x+paint.sampleOffset[0],y+paint.sampleOffset[1]);
    assert.ok(pigment[3],'underpaint donor missing');layers[paint.name].set(x,y,pigment);
}
const counts={};let recomposed=new Bitmap(width,height);
// Extend the painted boot shafts under the opaque neutral robe. The existing
// body layers occlude these at rest; when a foot advances they expose real leg
// coverage instead of a transparent bar. Source donor rectangles are explicit.
for(const leg of project.occludedLegs??[]){
for(let y=0;y<(leg.garmentAboveY??0);y++)for(let x=0;x<width;x++)if(layers[leg.name].alpha(x,y)){
    layers.torso.set(x,y,layers[leg.name].get(x,y));layers[leg.name].clear(x,y);
}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(!master.alpha(x,y)||layers[leg.name].alpha(x,y)||!inside(x+.5,y+.5,leg.polygon))continue;
    const [sx,sy,sw,sh]=leg.donor,pigment=master.get(sx+(x%sw),sy+(y%sh));
    assert.ok(pigment[3],'leg pigment donor missing');layers[leg.name].set(x,y,pigment);
}
}
// Reconstruct an occluded limb as editable native source; keep body and near limb
// in front. Any newly exposed rest silhouette is explicitly part of the master.
for(const copy of project.hiddenCopies??[]){
    const original=layers[copy.from],target=layers[copy.name];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(original.alpha(x,y)){
        const tx=x+copy.offset[0],ty=y+copy.offset[1];if(!target.inside(tx,ty))continue;
        const color=original.get(x,y),shade=copy.shade??1;let pigment=color;
        if(shade!==1){
            let distance=Infinity;
            for(const rgb of palette){const d=rgb.reduce((s,c,k)=>s+(c-color[k]*shade)**2,0);if(d<distance){distance=d;pigment=[...rgb,255];}}
        }
        target.set(tx,ty,pigment);if(!master.alpha(tx,ty))master.set(tx,ty,pigment);
    }
}
for(const n of project.drawOrder){const b=layers[n];counts[n]=b.count();assert.ok(counts[n]>0,'empty authored layer '+n);recomposed.blit(b,0,0);writeFileSync(join(out,'source-layers',n+'.png'),encodePng(width,height,b.data));}
assert.deepEqual(recomposed.data,master.data,'semantic layers alter resting appearance');
writeFileSync(join(out,'source-master.png'),encodePng(width,height,master.data));
writeFileSync(join(out,'project.json'),JSON.stringify({...project,palette:palette.map(c=>'#'+Buffer.from(c).toString('hex')),layers:project.drawOrder.map(n=>({name:n,file:'source-layers/'+n+'.png',pixels:counts[n]})),sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourcePixels:master.count(),restRecompositionExact:true,
    scope:'native palette/semantic source only; masks and hidden areas need art review; no runtime approval'},null,2)+'\n');
console.log(JSON.stringify({sourcePixels:master.count(),palette:palette.length,layers:counts,restRecompositionExact:true}));
