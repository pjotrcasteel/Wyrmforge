// AR4-B source32d: review-only native-pixel rock, escarpment, ground paving and road study.
// Designed as offline-authored world-phase PNGs. Geometry and collision remain authoritative C# AR3.
// No procedural pixel source generation is allowed in the Hunt render loop.
import { Bitmap, rng, hex } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const STONE_STUDY_REVISION='ar4b-ground-stone-road.v1.provisional';
export const WIDTH=1024,HEIGHT=2112,SEED=1387;
const ROCK=['#26343b','#314047','#3c4d53','#4d5e62','#627176','#788584'];
const FACE=['#222c34','#2c3841','#394850','#4a5b62','#68777a'];
const PAVE=['#363632','#57564c','#747264','#898679','#a7a18c','#c0b6a0'];
const ROAD=['#3c352b','#594934','#766046','#937a57','#ad926b','#c2ac86'];
function integer(random,n){return Math.floor(random()*n);}
function opaque(color) {
  const b=new Bitmap(WIDTH,HEIGHT),v=hex(color);
  for(let i=0;i<b.data.length;i+=4){b.data[i]=v[0];b.data[i+1]=v[1];b.data[i+2]=v[2];b.data[i+3]=255;}
  return b;
}
function stroke(b,x,y,length,random,ink,thickness=1) {
  let xx=x,yy=y;
  for(let i=0;i<length;i+=4+integer(random,7)){
    const n=Math.min(length-i,4+integer(random,7));
    b.rect(xx,yy,n,thickness,ink);
    xx+=n;yy+=integer(random,3)-1;
  }
}
function rockFacet(b,x,y,w,h,random,palette) {
  if(w<4||h<2)return;
  const chip=1+integer(random,Math.max(2,Math.floor(w/5)));
  const points=[[x+chip,y],[x+w-chip,y],[x+w,y+1+integer(random,Math.max(1,h/3))],
    [x+w-2,y+h-1],[x+chip,y+h],[x,y+h-1]];
  const shade=2+integer(random,3);
  b.poly(points,palette[shade]);
  b.line(x+chip,y,x+w-chip,y,palette[Math.min(shade+1,palette.length-1)]);
  if(random()<.73)b.line(x+chip+1,y+h-1,x+w-4,y+h-1,palette[1]);
  if(random()<.3)b.rect(x+2+integer(random,Math.max(1,w-5)),y+1,2,1,palette[0]);
}
function makeRock(seed) {
  const random=rng(seed^0x73a8c2d1),b=opaque(ROCK[2]);
  // Broad staggered sediment shelves; no 32px grid and no continuous horizontal grid rows.
  for(let i=0;i<1750;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT);
    const w=7+integer(random,36),h=2+integer(random,9);
    rockFacet(b,x,y,w,h,random,ROCK);
  }
  for(let i=0;i<1250;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT),len=5+integer(random,48);
    stroke(b,x,y,len,random,random()<.55?ROCK[1]:ROCK[4]);
    if(random()<.25)b.rect(x+3,y+2,3+integer(random,9),1,ROCK[0]);
  }
  // Rock fissures, mica highlights and occasional inlaid lichen are single authored clusters.
  for(let i=0;i<3100;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT),v=random();
    if(v<.42)b.rect(x,y,2+integer(random,6),1,ROCK[0]);
    else if(v<.82)b.rect(x,y,2+integer(random,8),1,ROCK[4]);
    else {b.rect(x,y,2+integer(random,4),2,'#5d6c5a');b.set(x+1,y-1,'#78866b');}
  }
  return b;
}
function makeFace(seed) {
  const random=rng(seed^0x63ca7b2e),b=opaque(FACE[1]);
  // Facing strata are horizontally bedded, broken by staggered vertical cracks.
  // Source pixels are distinct from horizontal top-rock facets.
  for(let y=6;y<HEIGHT;y+=10+integer(random,13)){
    let x=-integer(random,35);
    while(x<WIDTH){
      const len=16+integer(random,77),offset=integer(random,5)-2;
      stroke(b,x,y+offset,len,random,FACE[0],1+integer(random,2));
      if(random()<.84)b.rect(x+2,y+offset-2,Math.max(2,len-6),1,FACE[3]);
      if(random()<.36)b.rect(x+7,y+offset+3,7+integer(random,15),1,FACE[4]);
      x+=len+2+integer(random,20);
    }
  }
  for(let i=0;i<2050;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT);
    if(random()<.62){
      b.line(x,y,x+integer(random,4)-2,y+3+integer(random,11),FACE[0]);
      if(random()<.48)b.set(x+1,y,FACE[3]);
    }else rockFacet(b,x,y,5+integer(random,16),2+integer(random,5),random,FACE);
  }
  return b;
}
function makePaving(seed){
  const random=rng(seed^0xb1bc4437),b=opaque(PAVE[0]);
  // Running-bond stone with chipped corners and interrupted lime seams.
  for(let y=-19,row=0;y<HEIGHT+20;row++){
    const h=10+integer(random,7);
    let x=-(row%2?13:0)-integer(random,5);
    while(x<WIDTH){
      const w=19+integer(random,17),tone=1+integer(random,4);
      b.rect(x+1,y+1,w-2,h-2,PAVE[tone]);
      b.rect(x+3,y+1,Math.max(2,w-7),1,PAVE[Math.min(tone+1,5)]);
      b.line(x+2,y+h-2,x+w-3,y+h-2,PAVE[Math.max(0,tone-1)]);
      if(random()<.55)b.rect(x+3+integer(random,Math.max(1,w-8)),y+3+integer(random,Math.max(1,h-6)),2+integer(random,3),1,PAVE[Math.max(0,tone-1)]);
      if(random()<.18)b.rect(x+w-4,y+h-3,2,2,PAVE[0]);
      x+=w;
    }
    y+=h;
  }
  for(let i=0;i<450;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT);
    if(random()<.7)b.rect(x,y,2+integer(random,5),1,'#454c3f');
    else b.rect(x,y,3,2,PAVE[4]);
  }
  return b;
}
function makeRoad(seed){
  const random=rng(seed^0x9ad571b3),b=opaque(ROAD[2]);
  // Compressed earth flecks, embedded stone clasts and long fine ruts.
  // Every mark is an offline authored palette cluster; no Gaussian noise in-game.
  for(let i=0;i<2400;i++) {
    const x=integer(random,WIDTH),y=integer(random,HEIGHT);
    const w=4+integer(random,28),h=2+integer(random,7),shade=random()<.56?1:3;
    b.poly([[x+2,y],[x+w-3,y],[x+w,y+2],[x+w-2,y+h],[x+1,y+h],[x,y+1]],ROAD[shade]);
    if(random()<.62)b.rect(x+2,y,Math.max(2,w-8),1,ROAD[shade===1?0:4]);
  }
  for(let i=0;i<3300;i++){
    const x=integer(random,WIDTH),y=integer(random,HEIGHT),v=random();
    if(v<.4){
      const w=3+integer(random,7),h=2+integer(random,3);
      b.rect(x,y,w+2,h,ROAD[0]);b.rect(x+1,y-1,w,h,ROAD[4]);b.rect(x+2,y-1,Math.max(1,w-3),1,ROAD[5]);
    } else if(v<.74){
      b.rect(x,y,4+integer(random,14),1,ROAD[random()<.55?0:3]);
    } else {
      b.rect(x,y,2+integer(random,4),2,'#64614b');
      b.set(x+1,y-1,'#7a7658');
    }
  }
  return b;
}
export function buildStoneRoadStudy(seed=SEED){
  if(!Number.isInteger(seed))throw new TypeError('Study seed must be integer');
  return {rock:makeRock(seed),cliff:makeFace(seed),paving:makePaving(seed),road:makeRoad(seed),manifest:{revision:STONE_STUDY_REVISION,
      status:'prototype-only',approved:false,width:WIDTH,height:HEIGHT,worldSeed:seed,pixelSize:1,
      origin:'entire C# site, 1 authored pixel per site pixel; no runtime texture generation',
      models:'top-rock facets / bedded vertical cliff faces / running-bond ground paving / compressed earth',
      source:'WF32 review-only companion; original art branch #429 unchanged',
      families:['rock','cliff','paving','road']}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const destination=process.argv[2]??'src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-stone';
  const study=buildStoneRoadStudy();
  mkdirSync(destination,{recursive:true});
  for(const family of study.manifest.families){
    const b=study[family];
    writeFileSync(join(destination,`${family}-world.png`),encodePng(b.width,b.height,b.data));
  }
  writeFileSync(join(destination,'manifest.json'),JSON.stringify(study.manifest,null,2)+'\n');
  console.log('AR4-B native authored stone/architecture/road study:',study.manifest.revision);
}
