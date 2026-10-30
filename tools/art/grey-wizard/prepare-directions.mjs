// Offline source sampling only: never manufactures animation or runtime approval.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {decodePng,encodePng} from '../lib/png.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const refined=process.argv.includes('--rear-refinement');
const base=join(root,'art/source/characters/grey-wizard'),out=join(base,refined?'gothic-directions-v005':'gothic-directions-v004');
const bytes=readFileSync(join(base,'gothic-directions-v004-corrected-study.png'));
const original=decodePng(bytes);assert.deepEqual([original.width,original.height],[1536,1024]);
const rearBytes=refined?readFileSync(join(base,'gothic-directions-v005-rear-study.png')):null;
const rear=rearBytes?decodePng(rearBytes):null;
if(rear)assert.deepEqual([rear.width,rear.height],[1536,1024]);
const palette=JSON.parse(readFileSync(join(base,'gothic-south-v003/project.json'),'utf8')).palette.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
const directions=['S','SW','W','NW','N','NE','E','SE'],cell=160,threshold=128;
const atlas=new Uint8Array(cell*8*cell*4),board=new Uint8Array(cell*4*cell*2*4),records=[];
const files=new Map(),cache=new Map();
function color(r,g,b){const key=(r<<16)|(g<<8)|b;if(cache.has(key))return cache.get(key);let best=0,d=Infinity;palette.forEach((p,i)=>{const v=2*(p[0]-r)**2+3*(p[1]-g)**2+(p[2]-b)**2;if(v<d){d=v;best=i;}});cache.set(key,palette[best]);return palette[best];}
for(let i=0;i<8;i++){
 const src=refined&&(i===3||i===5)?rear:original;
 const cx=(i%4)*384,cy=i<4?0:496,ph=i<4?496:528;let x0=384,y0=ph,x1=-1,y1=-1;
 for(let y=0;y<ph;y++)for(let x=0;x<384;x++)if(src.rgba[((cy+y)*src.width+cx+x)*4+3]>=threshold){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 assert.ok(x1>x0&&y1>y0);const h=y1-y0+1,w=x1-x0+1,scale=128/h,nw=Math.round(w*scale),left=80-Math.floor(nw/2),top=14;
 assert.ok(left>0&&left+nw<cell);const pixels=new Uint8Array(cell*cell*4);
 for(let y=0;y<128;y++)for(let x=0;x<nw;x++){
  const sx=cx+x0+Math.min(w-1,Math.floor((x+.5)/scale)),sy=cy+y0+Math.min(h-1,Math.floor((y+.5)/scale)),p=(sy*src.width+sx)*4;
  if(src.rgba[p+3]<threshold)continue;
  const rgba=[...color(...src.rgba.slice(p,p+3)),255],dx=left+x,dy=top+y;
  pixels.set(rgba,(dy*cell+dx)*4);atlas.set(rgba,(dy*cell*8+i*cell+dx)*4);
  board.set(rgba,((Math.floor(i/4)*cell+dy)*cell*4+(i%4)*cell+dx)*4);
 }
 files.set(directions[i]+'.png',encodePng(cell,cell,pixels));
 records.push({direction:directions[i],...(refined?{source:src===rear?'gothic-directions-v005-rear-study.png':'gothic-directions-v004-corrected-study.png'}:{}),sourcePanel:[cx,cy,384,ph],alphaBounds:[x0,y0,x1,y1],scale,visibleHeight:128,anchor:[80,141],limitation:'Silhouette-height normalization only; anatomical crown/stance registration needs review'});
}
files.set('idle-study.png',encodePng(cell*8,cell,atlas));files.set('contact-sheet.png',encodePng(cell*4,cell*2,board));
files.set('sampling.json',Buffer.from(JSON.stringify({status:'unapproved directional idle study; not production animation',sourceSha256:createHash('sha256').update(bytes).digest('hex'),...(refined?{rearSourceSha256:createHash('sha256').update(rearBytes).digest('hex')}:{}),directions,cell,alphaThreshold:threshold,paletteSource:'gothic-south-v003/project.json',paletteSize:palette.length,worldSizeGuide:72.944643,records,openIssues:[refined?'Rear facings now distinct; exact angle/projection still needs scene review':'NW approaches N; distinct three-quarter rear perspective unresolved','Source garment/staff details drift across directions','128px visible height matches source density only; anatomical alignment not established','No directional walk, cast, hurt, death or material maps created']},null,2)+'\n'));
mkdirSync(out,{recursive:true});const check=process.argv.includes('--check');
for(const [name,data]of files){const p=join(out,name);if(check)assert.deepEqual(readFileSync(p),data,name);else writeFileSync(p,data);}
console.log(JSON.stringify({mode:check?'check':'write',files:files.size,directions:8,palette:palette.length,binaryAlpha:true,scope:'offline native idle study only'}));
