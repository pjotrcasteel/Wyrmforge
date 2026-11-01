// AR4-B visual study: source-authored 32px quiet forest + compacted path (NOT approved).
// Keeps #429 original WF32 v2 atlas untouched. No procedural textures run in the game.
// Every palette color and pixel cluster here is offline authored; no light/shadow baked in.
import { Bitmap, packAtlas } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const GRASS = Object.freeze(['#1d2923', '#29372b', '#354733', '#475b3e', '#5b704a', '#79815d']);
const EARTH = Object.freeze(['#2b2b27', '#413c30', '#60523d', '#786749', '#95805c', '#a99870']);
export const REVISION = 'ar4b-quiet-grass-road.v1.provisional';
export const TILE_SIZE = 32;

// Stable hand-positioned clusters leave uninterrupted ground visible between landmarks.
const PATCHES = [
    [[4,5,8,3],[22,18,7,4],[13,28,5,2]],
    [[17,3,8,5],[3,23,9,4],[25,27,5,2]],
    [[6,15,10,4],[20,26,8,3],[23,6,5,3]],
    [[19,11,9,4],[4,3,7,3],[8,27,8,2]],
    [[3,27,10,3],[15,6,11,4],[24,21,6,3]],
    [[3,11,7,4],[16,25,12,3],[22,3,6,2]],
];
const TUFTS = [
    [[8,20],[25,7],[17,28]],
    [[5,11],[24,24]],
    [[12,6],[27,21],[5,28]],
    [[7,27],[24,12]],
    [[14,19],[27,7],[6,8]],
    [[8,6],[22,22]],
];
function tuft(b, x, y, index) {
    const p = GRASS, tall = index % 3 === 0;
    b.rect(x-2,y,5,2,p[1]);
    b.line(x,y,x-2,y-(tall ? 5 : 3),p[3]);
    b.line(x+1,y,x+3,y-4,p[4]);
    b.line(x,y,x+1,y-(tall ? 4 : 3),p[5]);
    b.set(x-2,y-(tall ? 5 : 3),p[5]);
    b.set(x+3,y-4,p[2]);
}
function grassTile(variant) {
    const b = new Bitmap(TILE_SIZE,TILE_SIZE); b.wrap=true;
    b.rect(0,0,32,32,GRASS[2]);
    for (const [x,y,w,h] of PATCHES[variant]) {
        b.rect(x,y,w,h,GRASS[1]);
        b.rect(x+1,y+1,Math.max(2,w-3),Math.max(1,h-2),GRASS[3]);
        b.rect(x+2,y+h-1,Math.max(2,w-4),1,GRASS[2]);
    }
    TUFTS[variant].forEach(([x,y],i)=>tuft(b,x,y,variant+i));
    const seed = variant*7;
    b.rect((seed+11)%30, (seed+21)%30, 3,2,GRASS[4]);
    b.line((seed+2)%29, (seed+14)%29, (seed+5)%29, (seed+13)%29, GRASS[1]);
    return b;
}
const RUTS = [
    [[3,7,12,4],[18,24,10,3]],
    [[18,5,9,4],[3,19,12,5]],
    [[8,4,13,3],[20,20,10,5]],
    [[2,25,14,4],[17,9,12,4]],
];
const PEBBLES = [
    [[7,23],[22,9],[28,27]],
    [[4,5],[17,15],[25,29]],
    [[14,12],[5,27],[26,7]],
    [[9,6],[22,26],[29,16]],
];
function roadTile(variant) {
    const b=new Bitmap(32,32);b.wrap=true;
    b.rect(0,0,32,32,EARTH[2]);
    for(const [x,y,w,h] of RUTS[variant]) {
        b.rect(x,y,w,h,EARTH[1]);b.rect(x+2,y+1,w-3,1,EARTH[3]);
        b.rect(x+3,y+h-1,Math.max(1,w-5),1,EARTH[2]);
    }
    for(const [x,y] of PEBBLES[variant]) {
        b.rect(x,y+1,5,2,EARTH[0]);b.rect(x+1,y,4,2,EARTH[4]);
        b.rect(x+2,y+1,2,1,EARTH[3]);
    }
    b.line(2+variant*5,15+variant*3,7+variant*5,16+variant*3,EARTH[3]);
    b.rect(24-variant*3,11+variant*3,3,2,EARTH[1]);
    return b;
}
// Hand-tuned contour profiles; orientation is authored, never sprite-mirrored at runtime.
const RIPPLE = [0,0,1,1,2,1,0,-1,-1,-2,-2,-1,0,1,1,2,2,1,0,-1,-1,0,1,1,0,-1,-2,-1,0,1,2,1];
function edgeTile(grassSide) {
    const b=new Bitmap(32,32), grass=grassTile(2), road=roadTile(1);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
        const vertical=grassSide==='left'||grassSide==='right';
        const across=vertical?x:y, along=vertical?y:x;
        const threshold=16+RIPPLE[along];
        const grassOnLow=grassSide==='left'||grassSide==='up';
        const isGrass=grassOnLow?across<threshold:across>=threshold;
        b.set(x,y,isGrass?grass.get(x,y):road.get(x,y));
        // A few deliberately authored grass fingers bite into the packed earth.
        const distance=Math.abs(across-threshold);
        if(distance===1&&(along===5||along===17||along===26))
            b.set(x,y,isGrass?GRASS[4]:EARTH[1]);
    }
    return b;
}
function cornerTile(roadCorner) {
    const b=new Bitmap(32,32), grass=grassTile(4), road=roadTile(2);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
        const west=x<16+RIPPLE[y],north=y<16+RIPPLE[x];
        const isRoad=roadCorner==='nw'?west&&north:roadCorner==='ne'?!west&&north:
            roadCorner==='sw'?west&&!north:!west&&!north;
        b.set(x,y,isRoad?road.get(x,y):grass.get(x,y));
    }
    return b;
}
export function buildAr4BQuietAtlas() {
    const entries=[];
    const put=(name,bitmap)=>entries.push({name,bitmap,anchor:[0,0]});
    for(let i=0;i<6;i++)put(`grass.${i}`,grassTile(i));
    for(let i=0;i<4;i++)put(`road.${i}`,roadTile(i));
    for(const side of ['left','right','up','down'])put(`edge.grass-${side}`,edgeTile(side));
    for(const corner of ['nw','ne','sw','se'])put(`corner.road-${corner}`,cornerTile(corner));
    const {atlas,frames}=packAtlas(entries,512,1);
    return {atlas,frames,manifest:{revision:REVISION,tilePixels:32,status:'prototype-only',
        source:'Original WF32 #429 grass palette; separately authored quiet frames and road boundary studies',
        atlas:'atlas.png',frames, approved:false}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]) {
    const target=process.argv[2]??'src/Wyrmforge.Presentation.Web/wwwroot/art/terrain/wf32/ar4b-quiet';
    const {atlas,manifest}=buildAr4BQuietAtlas();
    mkdirSync(target,{recursive:true});
    writeFileSync(join(target,'atlas.png'),encodePng(atlas.width,atlas.height,atlas.data));
    writeFileSync(join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(`Authored ${Object.keys(manifest.frames).length} provisional WF32 tiles (${atlas.width}x${atlas.height})`);
}
