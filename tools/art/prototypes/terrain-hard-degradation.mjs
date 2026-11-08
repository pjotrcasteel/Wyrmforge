// Original WyrmForge hard-ground degradation grammar. Source-only AR4 art experiment.
// This augments continuous 256px masonry with consistent whole/partial stone identities.
// It does NOT change C# authoritative topology or simulate gameplay damage.
import { Bitmap } from '../lib/painter.mjs';
import { createMasonrySurface, MASONRY_PERIOD } from './wet-forest-masonry.mjs';
import { makeSoftField, makeBoundaryMask, classifyStoneInstances, blendWorldPatch, TERRAIN_MATERIALS } from './terrain-material-grammar.mjs';

const PERIOD = MASONRY_PERIOD;
const SIZE = PERIOD * PERIOD;
const STONE_TYPES = Object.freeze(['flagstone', 'cobble', 'brick']);
export const DEGRADATION_STATES = Object.freeze({
    intact: Object.freeze({ missing: 0, fracture: 0, moss: .02, displaced: .015 }),
    worn: Object.freeze({ missing: .035, fracture: .12, moss: .12, displaced: .08 }),
    broken: Object.freeze({ missing: .14, fracture: .38, moss: .23, displaced: .24 }),
    collapsed: Object.freeze({ missing: .32, fracture: .55, moss: .37, displaced: .40 }),
    reclaimed: Object.freeze({ missing: .43, fracture: .63, moss: .60, displaced: .53 }),
});
export const DEGRADATION_STATE_ORDER = Object.freeze(Object.keys(DEGRADATION_STATES));
export const DEGRADATION_MATERIALS = STONE_TYPES;
const SOIL = Object.freeze(['#27271f','#302d24','#3c372c','#4e4737']);
const MOSS = Object.freeze(['#283b2c','#344936','#405540']);
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const hash = (x,y,salt=0) => {
    let n = (Math.imul((x|0)+113,0x9e3779b1) ^ Math.imul((y|0)+311,0x85ebca6b) ^ (salt>>>0))>>>0;
    n = Math.imul(n^(n>>>16),0x7feb352d);
    n = Math.imul(n^(n>>>15),0x846ca68b);
    return ((n^(n>>>16))>>>0)/4294967296;
};
const wrap = x => (x%PERIOD+PERIOD)%PERIOD;
const wrappedOffset = (coord, pivot) => {
    let n=coord-pivot;
    if(n>PERIOD/2)n-=PERIOD;
    if(n<-PERIOD/2)n+=PERIOD;
    return n;
};

function localField(x,y,seed) {
    // Broad seeded environmental wear fields (not 32px-local noise, and not roads).
    const sample=(step,salt)=>{
        const v=wrap(Math.floor(x/step)),w=wrap(Math.floor(y/step));
        return hash(v,w,seed^salt);
    };
    return .54*sample(37,1729)+.31*sample(83,2477)+.15*sample(13,4513);
}

function sampleInfill(x,y,seed,policy,mossChance) {
    const spot=hash(Math.floor(x/3),Math.floor(y/3),seed^0x276af521);
    const grain=hash(Math.floor(x/2),Math.floor(y/2),seed^0x6f378ad3);
    if(policy==='reclaimed' && (spot<.26||grain<mossChance*.25))
        return MOSS[clamp(Math.floor(grain*MOSS.length),0,MOSS.length-1)];
    if(spot<mossChance*.20 && grain<.64) return MOSS[0];
    return SOIL[Math.floor(grain*SOIL.length)];
}

function enumerateStones(ids) {
    // Wrapped offsets keep stones spanning the 256px phase boundary intact.
    const stones=new Map();
    for(let y=0;y<PERIOD;y++) for(let x=0;x<PERIOD;x++) {
        const index=y*PERIOD+x,id=ids[index];
        if(id<=0)continue;
        let stone=stones.get(id);
        if(!stone){stone={id,pivotX:x,pivotY:y,points:[],sx:0,sy:0};stones.set(id,stone);}
        stone.points.push(index);
        stone.sx+=wrappedOffset(x,stone.pivotX);
        stone.sy+=wrappedOffset(y,stone.pivotY);
    }
    for(const s of stones.values()){
        s.cx=s.sx/s.points.length;
        s.cy=s.sy/s.points.length;
    }
    return [...stones.values()];
}

/** Entirely cosmetic material damage applied per authored stone, never per atlas tile.
 * 
 * Missing stones expose the local ground; fractured stones lose a jagged side
 * (intentionally "half-broken") while their surviving fragments retain the original
 * stone ID. The renderer can still delete all survivors at a hard/soft boundary.
 */
export function createDegradedMasonrySurface(type='flagstone', {seed=1387,state='broken'}={}) {
    if(!STONE_TYPES.includes(type))throw new RangeError('Unknown hard-placed material');
    const profile=DEGRADATION_STATES[state];
    if(!profile)throw new RangeError('Unknown degradation state');
    const source=createMasonrySurface(type,seed);
    if(!(source.stoneIds instanceof Int32Array))throw new TypeError('Hard material requires authored stone topology');
    const albedo=source.bitmap.clone(), ids=new Int32Array(source.stoneIds);
    const damage=new Uint8Array(SIZE),height=new Uint8Array(SIZE),roughness=new Uint8Array(SIZE);
    const stones=enumerateStones(ids);
    const stats={total:stones.length,missing:0,fractured:0,retained:0,removedPixels:0,fracturePixels:0};
    const typeSalt=type==='flagstone'?0x79271931:type==='cobble'?0x2a93ad71:0x48bcfe19;
    for(const stone of stones) {
        const centerX=wrap(Math.round(stone.pivotX+stone.cx)),centerY=wrap(Math.round(stone.pivotY+stone.cy));
        const exposure=.68+.67*localField(centerX,centerY,seed);
        const lossRoll=hash(stone.id,37,seed^typeSalt);
        const fractureRoll=hash(stone.id,89,seed^typeSalt);
        const mossRoll=hash(stone.id,139,seed^typeSalt);
        const fullyMissing=lossRoll<profile.missing*exposure;
        // Fracture follows the same stable stone topology, not a line from a cell edge.
        const partial=!fullyMissing && fractureRoll<profile.fracture*exposure;
        const mossy=mossRoll<profile.moss*exposure;
        if(fullyMissing)stats.missing++;
        else if(partial)stats.fractured++;
        else stats.retained++;
        const theta=hash(stone.id,199,seed^typeSalt)*Math.PI*2;
        const nx=Math.cos(theta),ny=Math.sin(theta);
        const phase=hash(stone.id,271,seed^typeSalt)*Math.PI*2;
        // A displaced fracture removes a meaningful part of a real stone, with a
        // slightly stepped fractured edge; not a rectangle or arbitrary clipping mask.
        const offset=(hash(stone.id,281,seed^typeSalt)-.5)*3;
        for(const index of stone.points) {
            const x=index%PERIOD,y=Math.floor(index/PERIOD);
            const dx=wrappedOffset(x,stone.pivotX)-stone.cx;
            const dy=wrappedOffset(y,stone.pivotY)-stone.cy;
            const along=-dx*ny+dy*nx;
            const jag=(hash(Math.floor(along/3),stone.id,seed^0x482bc337)-.5)*2.5 +
                Math.sin(along*.42+phase)*1.5;
            const lostFragment=partial && dx*nx+dy*ny+jag>offset;
            if(fullyMissing||lostFragment) {
                ids[index]=0;
                damage[index]=fullyMissing?3:2;
                stats.removedPixels++;
                if(lostFragment)stats.fracturePixels++;
                albedo.set(x,y,sampleInfill(x,y,seed,state,profile.moss));
                height[index]=clamp(Math.round(15+localField(x,y,seed)*7),0,255);
                roughness[index]=state==='reclaimed'&&mossy?228:196;
                continue;
            }
            const faceWear=hash(Math.floor(x/4),Math.floor(y/4),seed^typeSalt);
            const chip=partial&&Math.abs(dx*nx+dy*ny+jag-offset)<3;
            const edgeWear=chip && hash(x,y,seed^0x1927a3b1)<.48;
            if(edgeWear)albedo.set(x,y,'#373930');
            else if(mossy && faceWear<.15 && state!=='intact') albedo.set(x,y,MOSS[faceWear<.07?0:1]);
            else if(state!=='intact'&&faceWear<profile.displaced*.19)albedo.set(x,y,'#403e34');
            damage[index]=edgeWear?1:0;
            const baseHeight=type==='cobble'?71:type==='flagstone'?62:59;
            height[index]=clamp(baseHeight-(edgeWear?12:0)-(partial?2:0)+Math.round(7*(faceWear-.5)),0,255);
            roughness[index]=mossy?228:clamp((type==='cobble'?188:202)+Math.round((faceWear-.5)*18),0,255);
        }
    }
    // Mortar/empty original gaps should be dirt-filled and lower than retained stones.
    for(let i=0;i<SIZE;i++) if(source.stoneIds[i]===0) {
        const x=i%PERIOD,y=Math.floor(i/PERIOD);
        height[i]=12;
        roughness[i]=218;
        if(state==='reclaimed' && hash(Math.floor(x/4),Math.floor(y/4),seed^0x61f4b382)<.26)
            albedo.set(x,y,MOSS[0]);
    }
    return {type,seed,state,albedo,stoneIds:ids,originalIds:source.stoneIds,
        height,roughness,damage,stats};
}

/** Tangent-space normal and Three.js green-channel roughness, no independent renderer. */
export function buildDegradedLightingMaps(surface) {
    if(!(surface?.albedo instanceof Bitmap) ||
       !(surface.height instanceof Uint8Array) || surface.height.length!==SIZE ||
       !(surface.roughness instanceof Uint8Array) || surface.roughness.length!==SIZE)
        throw new TypeError('Expected a 256px degraded masonry surface');
    const normal=new Bitmap(PERIOD,PERIOD),roughnessMap=new Bitmap(PERIOD,PERIOD);
    const h=(x,y)=>surface.height[wrap(y)*PERIOD+wrap(x)];
    for(let y=0;y<PERIOD;y++)for(let x=0;x<PERIOD;x++){
        const i=y*PERIOD+x;
        const dx=(h(x+1,y)-h(x-1,y))*.022;
        const dy=(h(x,y+1)-h(x,y-1))*.022;
        const len=Math.hypot(dx,dy,1);
        normal.set(x,y,[clamp(Math.round(128-127*dx/len),0,255),clamp(Math.round(128-127*dy/len),0,255),clamp(Math.round(128+127/len),0,255),255]);
        const r=surface.roughness[i];
        roughnessMap.set(x,y,[r,r,r,255]);
    }
    return {albedo:surface.albedo,normal,roughnessMap};
}

/** Art-only hard/soft transition using the SAME whole-stone rule as the terrain grammar.
 * Returns a merged albedo, normal and roughness map with no clipped surviving stones.
 * This function does not decide roads, site boundaries, or material IDs for gameplay.
 */
export function createDegradedBoundaryReview({type='flagstone',soft='grass',seed=1387,
    state='reclaimed',direction='left'}={}) {
    const profile=TERRAIN_MATERIALS[soft];
    if(!profile||profile.kind!=='soft')throw new RangeError('Expected grass, soil or mud');
    const hard=createDegradedMasonrySurface(type,{seed,state});
    const softField=makeSoftField(soft,seed+173);
    const mask=makeBoundaryMask(direction,seed);
    const topology=classifyStoneInstances(hard.albedo,hard.stoneIds);
    const result=blendWorldPatch(hard.albedo,softField,mask,
        {policy:'whole-stone-erosion',stoneInstances:topology,seed});
    const height=new Uint8Array(SIZE),roughness=new Uint8Array(SIZE);
    for(let i=0;i<SIZE;i++) {
        if(result.owner[i]) {
            height[i]=hard.height[i];
            roughness[i]=hard.roughness[i];
        }else{
            const soilGreen=softField.data[i*4+1];
            height[i]=clamp(Math.round(profile.height+(soilGreen-44)*.09),0,255);
            roughness[i]=Math.round(profile.roughness*255);
        }
    }
    const combined={type,seed,state,albedo:result.albedo,height,roughness,
        stoneIds:hard.stoneIds,originalIds:hard.originalIds,damage:hard.damage,stats:hard.stats};
    return {...result,hard,soft,mask,topology,maps:buildDegradedLightingMaps(combined)};
}
