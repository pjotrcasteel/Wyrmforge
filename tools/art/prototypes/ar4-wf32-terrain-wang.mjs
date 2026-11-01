// WF32 AR4-B1: deliberately editable 32px Wet Forest terrain grammar.
// Studio-authored corner silhouettes and feature coordinates. No runtime texture synthesis.
// Source-only until a real Hunt 320/390px compositor passes the AR4-B owner gate.
import { Bitmap, packAtlas } from '../lib/painter.mjs';
import { encodePng } from '../lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TILE = 32;
export const REVISION = 'wf32-road-wang-b1.v1.unapproved';
// Values are coordinated with WF32 #429 original soft palettes.
// They are flat albedo; G owns actual light, shadows and occlusion.
export const PALETTE = Object.freeze({
    grass: Object.freeze(['#1d2923','#29372b','#354733','#475b3e','#5b704a','#79815d']),
    earth: Object.freeze(['#393429','#514634','#776448','#93805c','#b59a70','#d1b787']),
    mud: Object.freeze(['#1b211f','#282b27','#34322b','#463d32','#5c4f3e','#75634e']),
    verge: Object.freeze(['#303829','#424735','#5a593f','#756448']),
});

// Each 8x8 line is a *source-authored 4px cluster stencil* for a 32px tile.
// Bit order: NW=1 NE=2 SE=4 SW=8. 'R' is a compacted road/earth surface.
// Endpoints of each stencil edge are defined solely by its two corresponding
// Wang vertices: adjacent tiles cannot disagree at an edge, even at a T/X join.
// These are 16 actual masks, not runtime flips or a nearest-road heuristic.
export const WANG_STENCILS = Object.freeze([
    ['........','........','........','........','........','........','........','........'], // 0
    ['RRRR....','RRR.....','RR......','R.......','........','........','........','........'], // NW
    ['....RRRR','.....RRR','......RR','.......R','........','........','........','........'], // NE
    ['RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','.RRRRRR.','..RRRR..','...RR...','........'], // N
    ['........','........','........','........','.......R','......RR','.....RRR','....RRRR'], // SE
    ['RRRR....','RRR.....','RR......','R.......','.......R','......RR','.....RRR','....RRRR'], // NW/SE saddle
    ['....RRRR','.....RRR','......RR','......RR','......RR','......RR','.....RRR','....RRRR'], // E
    ['RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','.RRRRRRR','..RRRRRR','...RRRRR','....RRRR'], // all but SW
    ['........','........','........','........','R.......','RR......','RRR.....','RRRR....'], // SW
    ['RRRR....','RRR.....','RR......','RR......','RR......','RR......','RRR.....','RRRR....'], // W
    ['....RRRR','.....RRR','......RR','.......R','R.......','RR......','RRR.....','RRRR....'], // NE/SW saddle
    ['RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRR..','RRRRR...','RRRR....','RRRR....'], // all but SE
    ['........','........','...RR...','..RRRR..','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR'], // S
    ['RRRR....','RRRRR...','RRRRRR..','RRRRRRR.','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR'], // all but NE
    ['....RRRR','...RRRRR','..RRRRRR','.RRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR'], // all but NW
    ['RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR','RRRRRRRR'],
]);

const GRASS_FEATURES = Object.freeze([
    Object.freeze([[5,9,0],[20,6,1],[13,23,2],[26,25,0]]),
    Object.freeze([[7,21,2],[21,12,0],[26,27,1],[10,6,1]]),
    Object.freeze([[14,9,1],[25,21,2],[7,26,0],[21,29,0]]),
    Object.freeze([[9,14,0],[19,26,1],[24,8,2],[6,28,1]]),
    Object.freeze([[6,7,1],[22,14,2],[12,27,0],[27,25,1]]),
    Object.freeze([[18,6,0],[9,18,2],[24,27,1],[6,29,2]]),
    Object.freeze([[6,24,2],[19,9,1],[25,20,0],[10,7,0]]),
    Object.freeze([[23,6,2],[7,11,0],[18,25,1],[5,27,1]]),
]);
const ROAD_FEATURES = Object.freeze([
    Object.freeze([[6,8,0],[21,21,1],[10,26,2]]),
    Object.freeze([[22,9,1],[9,20,0],[24,26,2]]),
    Object.freeze([[9,7,2],[22,23,0],[8,27,1]]),
    Object.freeze([[21,7,0],[7,20,2],[24,27,1]]),
    Object.freeze([[6,6,1],[22,15,0],[12,26,2]]),
    Object.freeze([[9,18,1],[21,6,2],[25,27,0]]),
    Object.freeze([[6,25,0],[20,12,1],[11,7,2]]),
    Object.freeze([[7,7,0],[20,26,2],[23,16,1]]),
]);
function tuft(b,x,y,k) {
    const p=PALETTE.grass;
    if(k===0){b.rect(x-2,y,5,2,p[1]);b.line(x,y,x-2,y-5,p[4]);b.line(x+1,y,x+3,y-4,p[3]);b.set(x-1,y-5,p[5]);}
    if(k===1){b.rect(x-3,y,7,2,p[2]);b.line(x-1,y,x-2,y-3,p[4]);b.line(x+2,y,x+1,y-5,p[5]);b.set(x+2,y-3,p[4]);}
    if(k===2){b.rect(x-3,y,8,3,p[1]);b.rect(x-1,y+1,5,2,p[3]);b.rect(x,y,2,2,p[5]);b.set(x+4,y+1,p[4]);}
}
function pebble(b,x,y,k) {
    const p=PALETTE.earth;
    if(k===0){b.rect(x,y+2,6,2,p[1]);b.rect(x+1,y,4,2,p[4]);b.rect(x+2,y+1,3,1,p[5]);}
    if(k===1){b.rect(x,y+1,8,2,p[1]);b.rect(x+1,y,5,1,p[4]);b.line(x+3,y+3,x+7,y+3,p[2]);}
    if(k===2){b.rect(x,y,4,3,p[1]);b.rect(x+1,y,3,1,p[5]);b.set(x+4,y+2,p[3]);}
}
function grassBase(v) {
    const p=PALETTE.grass, b=new Bitmap(TILE,TILE);
    b.rect(0,0,TILE,TILE,p[2]);
    // Quiet authored moss islands: no scatter/noise loop and no artwork on the seams.
    const islands=[[[4,4,8,4],[17,17,10,5]],[[11,4,13,4],[3,22,8,5]],
        [[3,14,12,5],[20,6,8,4]],[[15,19,12,5],[5,5,8,4]],
        [[5,21,11,6],[18,5,8,5]],[[15,7,13,6],[4,20,8,5]],
        [[7,5,9,6],[18,22,11,6]],[[5,14,13,5],[21,5,8,5]]][v];
    for(const [x,y,w,h] of islands){
        b.rect(x,y,w,h,p[1]);b.rect(x+2,y+1,w-3,2,p[3]);
        b.rect(x+3,y+3,Math.max(2,w-5),1,p[2]);
    }
    for(const [x,y,k] of GRASS_FEATURES[v])tuft(b,x,y,k);
    return b;
}
function earthBase(v) {
    const p=PALETTE.earth,b=new Bitmap(TILE,TILE);b.rect(0,0,TILE,TILE,p[2]);
    // Hand-placed soft earth islands and gravel clusters, no road-wide scratch pattern.
    // Irregular stepped clusters help roads read as worn soil instead of tiled wood.
    const patches=[
      [[4,4,11,6],[19,18,10,7],[5,25,8,4]],
      [[16,4,13,6],[3,15,12,7],[18,26,9,4]],
      [[3,8,13,8],[18,4,11,5],[19,23,10,6]],
      [[16,15,13,8],[4,4,13,6],[5,26,12,4]],
      [[4,16,10,7],[17,5,11,8],[20,26,7,4]],
      [[10,4,12,7],[4,22,14,7],[21,17,8,5]],
      [[4,4,13,7],[18,13,11,8],[7,27,11,3]],
      [[7,15,13,8],[19,5,11,6],[17,25,10,5]],
    ][v];
    for(let i=0;i<patches.length;i++){
        const [x,y,w,h]=patches[i];
        b.rect(x+2,y+1,w-3,h-1,p[i===1?1:3]);
        b.rect(x,y+2,w-3,Math.max(2,h-3),p[i===1?1:3]);
        b.rect(x+4,y+2,Math.max(2,w-6),Math.max(1,h-4),p[i===1?2:4]);
        b.rect(x+w-2,y+h-2,2,1,p[1]);
    }
    // Mineral inclusions are drawn as recognizable clasts, not speckle noise.
    for(const [x,y,k] of ROAD_FEATURES[v])pebble(b,x,y,k);
    return b;
}
function mudBase(v) {
    const p=PALETTE.mud,b=new Bitmap(TILE,TILE);b.rect(0,0,TILE,TILE,p[2]);
    const marks=[[[5,9,16],[10,23,13]],[[13,6,14],[5,18,19]]][v];
    for(const [x,y,w] of marks) {
        b.rect(x,y,w,3,p[1]);b.rect(x+2,y+1,w-4,1,p[3]);
        b.line(x+3,y+4,x+w-2,y+4,p[0]);
    }
    b.rect(21-v*10,12+v*11,6,3,p[4]);b.rect(23-v*10,13+v*11,3,1,p[5]);
    return b;
}
export function wangMask(mask,x,y) {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15 ||
        !Number.isInteger(x) || !Number.isInteger(y) ||
        x < 0 || y < 0 || x >= TILE || y >= TILE) throw new RangeError('Wang mask/pixel out of bounds');
    return WANG_STENCILS[mask][y >> 2][x >> 2] === 'R';
}
// At native 32px, edges are 4px block silhouettes; surface detail never changes
// whether a pixel is grass or road, only its source-authored color in that family.
function wangTile(mask, variant=0) {
    const b=new Bitmap(TILE,TILE), g=grassBase(variant%8),r=earthBase(variant%8);
    const p=PALETTE, isRoad=(x,y)=>wangMask(mask,x,y);
    for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++) {
        const road=isRoad(x,y), edge=
            (x>0&&road!==isRoad(x-1,y))||(x<31&&road!==isRoad(x+1,y))||
            (y>0&&road!==isRoad(x,y-1))||(y<31&&road!==isRoad(x,y+1));
        const near = (x>1&&road!==isRoad(x-2,y))||(x<30&&road!==isRoad(x+2,y))||
            (y>1&&road!==isRoad(x,y-2))||(y<30&&road!==isRoad(x,y+2));
        const base=road?r.get(x,y):g.get(x,y);
        // The shoulder is a two-pixel band; never a floating tinted overlay
        // independent of its connected authored road silhouette.
        const color=road&&edge?p.verge[0]:road&&near?p.verge[2]:
            !road&&edge?p.grass[1]:!road&&near?p.grass[3]:base;
        b.set(x,y,color);
    }
    return b;
}
export function validateWangEdges() {
    for(const mask of WANG_STENCILS){
        if(mask.length!==8||mask.some(s=>s.length!==8||/[^R.]/.test(s)))
            throw new Error('Invalid 8x8 source stencil');
    }
    for(let a=0;a<16;a++)for(let b=0;b<16;b++){
        // Same NE/SE vertices on the right, and NW/SW on the left.
        if(Boolean(a&2)===Boolean(b&1)&&Boolean(a&4)===Boolean(b&8)){
            for(let y=0;y<32;y++)if(wangMask(a,31,y)!==wangMask(b,0,y))
                throw new Error('Horizontal seam mismatch '+a+'/'+b+' @'+y);
        }
        // Same SW/SE on the bottom, and NW/NE on top.
        if(Boolean(a&8)===Boolean(b&1)&&Boolean(a&4)===Boolean(b&2)){
            for(let x=0;x<32;x++)if(wangMask(a,x,31)!==wangMask(b,x,0))
                throw new Error('Vertical seam mismatch '+a+'/'+b+' @'+x);
        }
    }
    return true;
}
export function buildAr4BWangAtlas() {
    validateWangEdges();
    const entries=[];
    function put(name,bitmap){entries.push({name,bitmap,anchor:[0,0]});}
    for(let v=0;v<8;v++){put('grass.'+v,grassBase(v));put('earth.'+v,earthBase(v));}
    for(let v=0;v<2;v++)put('mud.'+v,mudBase(v));
    for(let mask=0;mask<16;mask++)for(let variant=0;variant<8;variant++)
        put('wang.'+mask+'.'+variant,wangTile(mask,variant));
    const {atlas,frames}=packAtlas(entries,512,1);
    return {atlas,manifest:{revision:REVISION,tilePixels:TILE,
        approved:false,sourceAuthoring:'editable vector-of-pixel-clusters in this module',
        wangCornerBitOrder:['NW','NE','SE','SW'],stencils:WANG_STENCILS,
        families:['grass','earth','mud'],roadTransition:'grass-earth.corner-wang16',
        note:'B1 source-only atlas: no C# geography or active Hunt adoption yet',
        frames,atlas:'atlas.png'}};
}
// An adversarial authored 21x15 corner-occupancy board: forks, tight elbows,
// a road loop, taper and diagonal contacts. It is not a gameplay map.
export const STRESS_CORNERS = Object.freeze([
'.....................',
'..####.........####..',
'..#####.......######.',
'...#####..#######....',
'.....###..###..##....',
'.......####...###....',
'..###############....',
'..###..###..###......',
'..###..###..######...',
'..###..###.....###...',
'..###############....',
'.........###..###....',
'.......#####..###....',
'.......##########....',
'.....................',
]);
export function buildAr4BStressBoard({scale=1}={}) {
    if(!Number.isInteger(scale)||scale<1||scale>4)throw new RangeError('scale must be 1..4');
    const rows=STRESS_CORNERS.length-1,cols=STRESS_CORNERS[0].length-1;
    if(!STRESS_CORNERS.every(r=>r.length===cols+1))throw new Error('Bad stress board');
    const map=new Bitmap(cols*TILE,rows*TILE);
    const sprites=Array.from({length:16},(_,m)=>Array.from({length:8},(_,v)=>wangTile(m,v)));
    const variantAt=(x,y)=>{let h=Math.imul(x+23,0x45d9f3b)^Math.imul(y+17,0x119de1f3);
        h^=h>>>16;return (h>>>0)%8;};
    for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
        const nw=STRESS_CORNERS[cy][cx]==='#'?1:0,ne=STRESS_CORNERS[cy][cx+1]==='#'?2:0,
            se=STRESS_CORNERS[cy+1][cx+1]==='#'?4:0,sw=STRESS_CORNERS[cy+1][cx]==='#'?8:0;
        map.blit(sprites[nw|ne|se|sw][variantAt(cx,cy)],cx*TILE,cy*TILE);
    }
    if(scale===1)return map;
    const output=new Bitmap(map.width*scale,map.height*scale);
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)
        output.rect(x*scale,y*scale,scale,scale,map.get(x,y));
    return output;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
    const target=process.argv[2]??'docs/art/previews/wf32-ar4b-wang';
    const {atlas,manifest}=buildAr4BWangAtlas();
    mkdirSync(target,{recursive:true});
    writeFileSync(join(target,'atlas.png'),encodePng(atlas.width,atlas.height,atlas.data));
    writeFileSync(join(target,'stress-1x.png'),encodePng(...imageArgs(buildAr4BStressBoard())));
    writeFileSync(join(target,'stress-3x.png'),encodePng(...imageArgs(buildAr4BStressBoard({scale:3}))));
    writeFileSync(join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log('Wrote '+Object.keys(manifest.frames).length+' B1 frames and stress boards (unapproved)');
}
function imageArgs(bitmap){return [bitmap.width,bitmap.height,bitmap.data];}
