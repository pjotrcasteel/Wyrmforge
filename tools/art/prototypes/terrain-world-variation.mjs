// Original WF32-P1i WORLD-COORDINATE art study; never owns C# terrain topology.
// Stable global lattice, no repeating 256px visual or independent 32px draws.
// Uses existing terrain material/degradation grammar and existing G material contracts.
import { Bitmap, mix } from '../lib/painter.mjs';
import { DEGRADATION_STATES } from './terrain-hard-degradation.mjs';
import { TERRAIN_MATERIALS } from './terrain-material-grammar.mjs';

export const WORLD_VARIATION_VERSION = 'wf32-world-variation.v1';
export const WORLD_CELL = 32;
export const WORLD_EDGE_TYPES = Object.freeze(['left','right','top','bottom']);
export const WORLD_CORNER_TYPES = Object.freeze([
    'outer-nw','outer-ne','outer-sw','outer-se','inner-nw','inner-ne','inner-sw','inner-se',
]);
const TYPES = Object.freeze(['flagstone','cobble','brick']);
const STONE = ['#303630','#3c4239','#494f43','#555a4c','#646757','#727465'];
const SOIL = ['#272820','#333126','#3d3b2d','#4d4936'];
const MOSS = ['#2c402e','#3a5037','#506245'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function hash(a,b,seed=0) {
    let n = (Math.imul(a | 0,0x9e3779b1) ^ Math.imul(b | 0,0x85ebca6b) ^ seed) >>> 0;
    n = Math.imul(n ^ (n >>> 16),0x7feb352d);
    n = Math.imul(n ^ (n >>> 15),0x846ca68b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function idHash(a,b,seed) {
    return 1 + Math.floor(hash(a,b,seed ^ 0x415c61c5) * 2147483646);
}
function noise(x,y,span,seed) {
    const u = x/span, v=y/span, ix=Math.floor(u), iy=Math.floor(v);
    let tx=u-ix, ty=v-iy;
    tx=tx*tx*(3-2*tx); ty=ty*ty*(3-2*ty);
    const p=(dx,dy)=>hash(ix+dx,iy+dy,seed);
    return (p(0,0)*(1-tx)+p(1,0)*tx)*(1-ty)+(p(0,1)*(1-tx)+p(1,1)*tx)*ty;
}
function site(type,gx,gy,seed) {
    const dx=type==='cobble'?16:type==='flagstone'?26:19;
    const dy=type==='cobble'?15:type==='flagstone'?21:10;
    const stagger=(type==='brick'&&(gy&1))?dx*.49:0;
    const amt=type==='brick'?.09:type==='cobble'?.30:.31;
    const x=gx*dx+dx*.5+stagger+(hash(gx,gy,seed+71)-.5)*dx*2*amt;
    const y=gy*dy+dy*.5+(hash(gx,gy,seed+89)-.5)*dy*2*amt;
    return { x,y, id:idHash(gx,gy,seed+269), seed:hash(gx,gy,seed+117), gx,gy };
}
function surfaceSample(type,x,y,seed,state) {
    const sx=type==='cobble'?16:type==='flagstone'?26:19;
    const sy=type==='cobble'?15:type==='flagstone'?21:10;
    const gy=Math.floor(y/sy),gx=Math.floor(x/sx);
    let best=null,first=Infinity,second=Infinity;
    for(let yy=gy-2;yy<=gy+2;yy++)for(let xx=gx-2;xx<=gx+2;xx++) {
        const s=site(type,xx,yy,seed);
        const dx=x-s.x,dy=y-s.y;
        let distance=(dx*dx+dy*dy)*(type==='brick'?1:1.035);
        if(type==='brick') distance=dx*dx*.85+dy*dy*3.2;
        if(distance<first) { second=first;first=distance;best=s; }
        else if(distance<second)second=distance;
    }
    const profile=DEGRADATION_STATES[state];
    const wear=noise(best.x,best.y,190,seed+148)+.26*(noise(best.x,best.y,76,seed+236)-.5);
    const exposure=clamp(.38+wear, .40, 1.27);
    const missing=hash(best.gx,best.gy,seed+529)<profile.missing*exposure;
    const fractured=hash(best.gx,best.gy,seed+613)<profile.fracture*exposure;
    const dx=x-best.x,dy=y-best.y;
    const phase=best.seed*Math.PI*2;
    const split=(dx*Math.cos(phase)+dy*Math.sin(phase));
    const rag=(hash(Math.floor(x/3),Math.floor(y/3),seed+797)-.5)*3.8;
    const partial=fractured && !missing && split+rag>(best.seed-.5)*7;
    // Genuine soil pockets, but no dark complete polygons tracing stone contours.
    const joint=Math.sqrt(second)-Math.sqrt(first);
    const edgeChip=hash(Math.floor(x/4),Math.floor(y/4),seed+1323);
    const openJoint=joint<(type==='cobble'?1.45:1.1)&&edgeChip<.28;
    const clear=missing||partial||openJoint;
    const mossProbability=profile.moss*exposure;
    const moss=hash(Math.floor(x/5),Math.floor(y/5),seed+1357)<mossProbability*.34;
    const clump=hash(Math.floor(x/3),Math.floor(y/3),seed+1709);
    const grain=hash(Math.floor(x/2),Math.floor(y/2),seed+1777);
    if(clear) {
        const color=moss?MOSS[clamp(Math.floor(grain*3),0,2)]:SOIL[clamp(Math.floor(clump*4),0,3)];
        return {color,id:0,originalId:best.id,height:12+(moss?3:0),roughness:moss?229:208,
            missing,partial};
    }
    const material=hash(best.gx,best.gy,seed+881);
    const base=1+Math.floor(material*4);
    const grainIndex=grain<.16?-1:grain>.85?1:0;
    const face=hash(Math.floor(x/6),Math.floor(y/5),seed+1279);
    const faceVariation=face<.1?-1:face>.92?1:0;
    const index=clamp(base+grainIndex+faceVariation,1,5);
    const worn=profile.displaced*exposure;
    const dirty=hash(Math.floor(x/4),Math.floor(y/4),seed+1597)<worn*.18;
    const color=dirty?(moss?MOSS[1]:STONE[1]):STONE[index];
    return {color,id:best.id,originalId:best.id,height:(type==='cobble'?72:type==='brick'?59:64)+index*2,
        roughness:dirty?231:clamp(181+Math.floor(grain*35),0,255),missing:false,partial:false};
}
function validate(type,options) {
    if(!TYPES.includes(type))throw new RangeError('Unknown hard terrain family');
    if(!DEGRADATION_STATES[options.state])throw new RangeError('Unknown degradation state');
    if(!Number.isInteger(options.originX)||!Number.isInteger(options.originY)||
        !Number.isInteger(options.width)||!Number.isInteger(options.height)||
        options.width<32||options.height<32||options.width>1152||options.height>1152||
        [options.originX,options.originY,options.width,options.height].some(n=>n%32!==0))
        throw new RangeError('Window must be 32px-aligned, 32..1024px per dimension');
}
/** Each requested window samples the same infinite authored stone field.
 * No 256px wrapping, no per-cell mutation, no second rendering engine.
 */
export function createWorldMasonryWindow(type,{seed=1387,state='broken',originX=0,originY=0,width=512,height=512}={}) {
    validate(type,{state,originX,originY,width,height});
    const albedo=new Bitmap(width,height),stoneIds=new Int32Array(width*height),
        originalIds=new Int32Array(width*height),heightMap=new Uint8Array(width*height),roughness=new Uint8Array(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        const p=surfaceSample(type,x+originX,y+originY,seed,state),i=y*width+x;
        albedo.set(x,y,p.color);stoneIds[i]=p.id;originalIds[i]=p.originalId;
        heightMap[i]=p.height;roughness[i]=p.roughness;
    }
    return {type,seed,state,originX,originY,width,height,albedo,stoneIds,originalIds,heights:heightMap,roughness};
}
export function worldSoftPixel(material,x,y,seed) {
    const spec=TERRAIN_MATERIALS[material];
    if(!spec||spec.kind!=='soft')throw new RangeError('Expected grass, soil or mud');
    const p=spec.palette;
    const n=.53*noise(x,y,155,seed+5)+.29*noise(x,y,48,seed+7)+.18*noise(x,y,17,seed+11);
    const shade=clamp((n-.24)*1.52,0,1);
    const base=mix(p[1],p[Math.min(p.length-1,4)],shade);
    const grain=hash(Math.floor(x/2),Math.floor(y/3),seed+17);
    const grit=hash(Math.floor(x/5),Math.floor(y/4),seed+29);
    const delta=(grain<.23?-10:grain>.79?9:0)+(grit<.13?-5:grit>.86?5:0);
    // Short tufts, small pebbles and coarse mud grit. No circular color-band edges.
    const fx=x-7*Math.floor(x/7),fy=y-7*Math.floor(y/7);
    const tuft=hash(Math.floor(x/7),Math.floor(y/7),seed+301);
    if(material==='grass' && tuft>.73 && ((fy===2&&fx===3)||(fy===3&&(fx===2||fx===4))))
        return mix(p[3],p[4],tuft);
    if(material==='soil' && tuft>.95 && fy===4 && fx>=2 && fx<=4)
        return '#5b5444';
    if(material==='mud' && tuft>.95 && fy===3 && fx>=2 && fx<=4)
        return '#242923';
    return base.map((v,i)=>i===3?v:clamp(Math.round((v+delta)/3)*3,0,255));
}
const cornerInfo=Object.freeze({nw:['left','top'],ne:['right','top'],sw:['left','bottom'],se:['right','bottom']});
/** Generic directional / inner / outer corner mask, derived from a WORLD position.
 * It is an art preview; production boundaries must come from C# AR3 weights.
 */
export function worldBoundaryMask({type='left',originX=0,originY=0,width=512,height=512,
    boundaryX=256,boundaryY=256,seed=1387}={}) {
    if(!WORLD_EDGE_TYPES.includes(type)&&!WORLD_CORNER_TYPES.includes(type))throw new RangeError('Unknown boundary role');
    const mask=new Uint8Array(width*height);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new RangeError('Invalid mask bounds');
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const gx=originX+x,gy=originY+y;
        const wx=boundaryX+Math.round((noise(gy,0,41,seed+151)-.5)*17),
            wy=boundaryY+Math.round((noise(gx,0,41,seed+191)-.5)*17);
        const hit={left:gx<=wx,right:gx>=wx,top:gy<=wy,bottom:gy>=wy};
        let hard;
        if(WORLD_EDGE_TYPES.includes(type))hard=hit[type];
        else {
            const [kind,corner]=type.split('-'),[a,b]=cornerInfo[corner];
            hard=kind==='outer'?hit[a]&&hit[b]:hit[a]||hit[b];
        }
        mask[y*width+x]=hard?1:0;
    }
    return mask;
}
/** Whole-stone removal at a boundary. Extra 64px sampling covers even stone faces
 * crossing the requested window edge, avoiding half-cut stones at chunk borders.
 */
export function createWorldBoundaryWindow(type,soft,{seed=1387,state='reclaimed',originX=0,originY=0,
    width=512,height=512,role='outer-nw',boundaryX=256,boundaryY=256}={}) {
    const margin=64;
    const field=createWorldMasonryWindow(type,{seed,state,originX:originX-margin,originY:originY-margin,
        width:width+margin*2,height:height+margin*2});
    if(!TERRAIN_MATERIALS[soft]||TERRAIN_MATERIALS[soft].kind!=='soft')
        throw new RangeError('Expected a soft neighboring material');
    const mask=worldBoundaryMask({type:role,originX:field.originX,originY:field.originY,
        width:field.width,height:field.height,boundaryX,boundaryY,seed});
    const keep=new Map();
    for(let i=0;i<field.stoneIds.length;i++) {
        const id=field.stoneIds[i];if(!id)continue;
        if(!keep.has(id))keep.set(id,true);
        if(!mask[i])keep.set(id,false);
    }
    const out=new Bitmap(width,height),ids=new Int32Array(width*height),h=new Uint8Array(width*height),
        r=new Uint8Array(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const src=(y+margin)*field.width+x+margin,dst=y*width+x;
        const id=field.stoneIds[src];
        const visible=id!==0&&mask[src]===1&&keep.get(id);
        const gx=originX+x,gy=originY+y;
        ids[dst]=visible?id:0;
        if(visible){out.set(x,y,field.albedo.get(x+margin,y+margin));h[dst]=field.heights[src];r[dst]=field.roughness[src];}
        else {out.set(x,y,worldSoftPixel(soft,gx,gy,seed+997));h[dst]=TERRAIN_MATERIALS[soft].height;r[dst]=Math.round(TERRAIN_MATERIALS[soft].roughness*255);}
    }
    return {type,soft,seed,state,originX,originY,width,height,albedo:out,stoneIds:ids,heights:h,roughness:r,role};
}
/** Generic LightingEngine-compatible normal and roughness maps; no painted lighting. */
export function worldLightingMaps(field) {
    const {width:w,height:h}=field;
    if(!(field.albedo instanceof Bitmap)||!(field.heights instanceof Uint8Array)||
        !(field.roughness instanceof Uint8Array)||field.heights.length!==w*h||field.roughness.length!==w*h)
        throw new TypeError('Invalid world surface');
    const normal=new Bitmap(w,h),roughnessMap=new Bitmap(w,h);
    const at=(x,y)=>field.heights[clamp(y,0,h-1)*w+clamp(x,0,w-1)];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const dx=(at(x+1,y)-at(x-1,y))*.012,dy=(at(x,y+1)-at(x,y-1))*.012;
        const length=Math.hypot(dx,dy,1),i=y*w+x;
        normal.set(x,y,[clamp(Math.round(128-127*dx/length),0,255),clamp(Math.round(128-127*dy/length),0,255),clamp(Math.round(128+127/length),0,255),255]);
        const rough=field.roughness[i];roughnessMap.set(x,y,[rough,rough,rough,255]);
    }
    return {albedo:field.albedo,normal,roughnessMap};
}
export function cutWorldInto32(bitmap) {
    if(!(bitmap instanceof Bitmap)||bitmap.width%32||bitmap.height%32)throw new RangeError('Must be 32px divisible');
    const tiles=[];
    for(let y=0;y<bitmap.height;y+=32)for(let x=0;x<bitmap.width;x+=32){
        const tile=new Bitmap(32,32);
        for(let py=0;py<32;py++)for(let px=0;px<32;px++)tile.set(px,py,bitmap.get(x+px,y+py));
        tiles.push({col:x/32,row:y/32,tile});
    }
    return tiles;
}
