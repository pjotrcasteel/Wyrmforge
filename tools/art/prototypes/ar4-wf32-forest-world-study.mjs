// AR4-B WORLD-CONTINUOUS 32px pixel-art study, source-authored offline only.
// Companion to the original WF32 #429 kit, never a replacement or an AR3 terrain engine.
// Each dot and contour is a single intentional palette pixel; no RGB blur or tiled stamps.
import { Bitmap, rng, hex } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const WORLD_STUDY_VERSION = 'ar4b-world-forest-road.v2.provisional';
export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 2112;
export const WORLD_SEED = 1387;
const GREEN = Object.freeze(['#1d2923','#29372b','#354733','#40563c','#506645','#6c7953']);
const EARTH = Object.freeze(['#2f2c26','#4b4030','#715d40','#8c754e','#a78d60','#b9a174']);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function opaqueCanvas(color) {
    const b=new Bitmap(WORLD_WIDTH,WORLD_HEIGHT),rgba=hex(color);
    for(let i=0;i<b.data.length;i+=4) {
        b.data[i]=rgba[0];b.data[i+1]=rgba[1];b.data[i+2]=rgba[2];b.data[i+3]=255;
    }
    return b;
}
function contour(b,cx,cy,rx,ry,ink,random,phase=0) {
    // Irregular multi-lobed hand-pixel silhouette: NOT a stamped rectangle.
    const n=9+Math.floor(random()*4),points=[],inner=[];
    for(let j=0;j<n;j++) {
        const theta=j/n*Math.PI*2+phase;
        const scalar=.70+random()*.43;
        const x=Math.round(cx+Math.cos(theta)*rx*scalar);
        const y=Math.round(cy+Math.sin(theta)*ry*scalar);
        points.push([x,y]);
        inner.push([Math.round(cx+(x-cx)*.61),Math.round(cy+(y-cy)*.61)]);
    }
    b.poly(points,ink);
    return inner;
}
function subduedMoss(b,x,y,rx,ry,random,shade) {
    const inside=contour(b,x,y,rx,ry,GREEN[shade],random,random()*Math.PI);
    if(rx>7&&ry>4) {
        b.poly(inside,GREEN[shade===1?2:3]);
        const cut=Math.round(rx*.35),yy=Math.round(ry*.22);
        b.rect(Math.round(x-cut),Math.round(y+yy),Math.max(2,Math.round(rx*.42)),1,GREEN[2]);
    }
}
function tuft(b,x,y,random) {
    const tall=random()<.18,low=GREEN[1],mid=GREEN[3],hi=GREEN[4];
    b.rect(x-2,y,4+Math.round(random()),1,low);
    b.line(x,y,x-2,y-(tall?6:4),mid);
    b.line(x+1,y,x+3,y-(tall?5:3),hi);
    b.line(x,y,x,y-(tall?5:3),GREEN[5]);
    if(random()<.45)b.set(x-2,y-3,GREEN[4]);
}
function fern(b,x,y,random) {
    const reverse=random()<.5?-1:1;
    b.line(x,y,x+2*reverse,y-10,GREEN[3]);
    b.line(x,y,x-3*reverse,y-9,GREEN[4]);
    for(let k=2;k<10;k+=3) {
        b.line(x+Math.floor(k/4)*reverse,y-k,x+(4+Math.floor(k/4))*reverse,y-k-2,GREEN[5]);
        b.line(x-Math.floor(k/3)*reverse,y-k,x-(4+Math.floor(k/4))*reverse,y-k-3,GREEN[3]);
    }
    b.rect(x-2,y,5,2,GREEN[1]);
}
function leaf(b,x,y,random,wet=false) {
    const color=wet?'#75634e':'#5a543d',tip=wet?'#9b8660':'#75684b';
    const d=random()<.5?-1:1;
    b.line(x-3*d,y-1,x+2*d,y+1,color);
    b.line(x-d,y,x+d,y-1,tip);
    b.set(x+3*d,y,tip);
}
function earthWear(b,x,y,rx,ry,random,shade=1) {
    const inside=contour(b,x,y,rx,ry,EARTH[shade],random,random()*Math.PI);
    if(rx>8&&ry>4)b.poly(inside,EARTH[shade+1]);
}
function pebble(b,x,y,random) {
    const w=2+Math.floor(random()*4),h=1+Math.floor(random()*2);
    b.rect(x-1,y,w+2,h+1,EARTH[0]);
    b.rect(x,y-1,w,h,EARTH[4]);
    if(random()<.5)b.set(x+w-1,y-1,EARTH[5]);
}
function grassClump(b,x,y,random) {
    const count=3+Math.floor(random()*5);
    for(let j=0;j<count;j++) {
        const ox=Math.round((random()-.5)*15),oy=Math.round((random()-.5)*9);
        const w=2+Math.floor(random()*5),h=1+Math.floor(random()*3);
        const color=random()<.62?GREEN[1]:GREEN[3];
        b.rect(x+ox,y+oy,w,h,color);
        if(random()<.45)b.rect(x+ox+1,y+oy-1,2,1,GREEN[4]);
        if(random()<.25)b.set(x+ox+w,y+oy+1,GREEN[2]);
    }
}
function makeGrass(seed) {
    const random=rng(seed^0x649321af),b=opaqueCanvas(GREEN[2]);
    // Patchy canopies are constructed from MANY small connected pixel clusters.
    // No polygon masks, flat circles, concentric rims, tile-edge stamps or noise.
    for(let group=0;group<260;group++) {
        const cx=Math.floor(random()*WORLD_WIDTH),cy=Math.floor(random()*WORLD_HEIGHT);
        const shade=random()<.55?GREEN[1]:GREEN[3];
        const count=8+Math.floor(random()*16),radius=8+Math.floor(random()*23);
        for(let i=0;i<count;i++) {
            const x=Math.round(cx+(random()-.5)*2*radius);
            const y=Math.round(cy+(random()-.5)*radius);
            const w=2+Math.floor(random()*5);
            b.rect(x,y,w,1+Math.floor(random()*2),shade);
            if(random()<.3)b.set(x+1,y-1,GREEN[2]);
        }
    }
    // Hand-sized moss and lichen groupings, irregular rather than square.
    for(let i=0;i<740;i++) {
        const x=5+Math.floor(random()*(WORLD_WIDTH-10));
        const y=5+Math.floor(random()*(WORLD_HEIGHT-10));
        grassClump(b,x,y,random);
    }
    // Tufts and bent ferns are individually authored motifs at nonperiodic anchors.
    for(let i=0;i<690;i++) {
        const x=5+Math.floor(random()*(WORLD_WIDTH-10));
        const y=7+Math.floor(random()*(WORLD_HEIGHT-14));
        if(random()<.77)tuft(b,x,y,random);
    }
    for(let i=0;i<138;i++) {
        const x=8+Math.floor(random()*(WORLD_WIDTH-16));
        const y=14+Math.floor(random()*(WORLD_HEIGHT-28));
        if(random()<.58)fern(b,x,y,random);
        else leaf(b,x,y,random,false);
    }
    return b;
}
function makeRoad(seed) {
    const random=rng(seed^0xa82bc449),b=opaqueCanvas(EARTH[2]);
    for(let i=0;i<500;i++) {
        const x=Math.floor(random()*WORLD_WIDTH),y=Math.floor(random()*WORLD_HEIGHT);
        const rx=3+Math.floor(random()*16),ry=2+Math.floor(random()*8);
        earthWear(b,x,y,rx,ry,random,random()<.64?1:3);
    }
    // Scattered stone chips cluster organically, without repeated horizontal dash stamps.
    for(let i=0;i<700;i++) {
        const x=4+Math.floor(random()*(WORLD_WIDTH-8));
        const y=4+Math.floor(random()*(WORLD_HEIGHT-8));
        if(random()<.44)pebble(b,x,y,random);
        else if(random()<.26)leaf(b,x,y,random,true);
        else b.line(x-2,y,x+2+Math.round(random()*3),y+Math.round(random()),EARTH[1]);
    }
    for(let i=0;i<130;i++) {
        const x=5+Math.floor(random()*(WORLD_WIDTH-10));
        const y=5+Math.floor(random()*(WORLD_HEIGHT-10));
        b.rect(x,y,3+Math.floor(random()*5),2,EARTH[3]);
        b.set(x+2,y-1,EARTH[4]);
    }
    return b;
}
export function buildForestWorldStudy(seed=WORLD_SEED) {
    if(!Number.isInteger(seed))throw new TypeError('Whole-world source seed must be an integer');
    const grass=makeGrass(seed),road=makeRoad(seed);
    const manifest={
        revision:WORLD_STUDY_VERSION,status:'prototype-only',approved:false,
        width:WORLD_WIDTH,height:WORLD_HEIGHT,worldSeed:seed,pixelSize:1,
        tileGrid:'none; no 32px or 256px wrapping',
        pixels:'offline-authored native WF32 palette clusters, full world-coordinate phase',
        source:'WF32 #429 original terrain palette + morphology; review-only custom authored ecology',
        files:{grass:'grass-world.png',road:'road-world.png'},
    };
    return {grass,road,manifest};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
    const path=process.argv[2]??'src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-world';
    const {grass,road,manifest}=buildForestWorldStudy();
    mkdirSync(path,{recursive:true});
    writeFileSync(join(path,'grass-world.png'),encodePng(grass.width,grass.height,grass.data));
    writeFileSync(join(path,'road-world.png'),encodePng(road.width,road.height,road.data));
    writeFileSync(join(path,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(`Authored two ${WORLD_WIDTH}x${WORLD_HEIGHT} nonrepeating WF32 world windows`);
}
