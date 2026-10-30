// WF32-P1d: reusable authoring-only terrain grammar. Material IDs are visual;
// authoritative geography, collisions and weights always come from C# AR3.
// Reuses WyrmForge's existing Bitmap + shared LightingEngine material contract.
import { Bitmap, hex, rng } from '../lib/painter.mjs';
import { createMasonryField, MASONRY_PERIOD } from './wet-forest-masonry.mjs';

export const GRAMMAR_VERSION = 'wf32-terrain-grammar.v1';
export const CELL = 32;
export const TERRAIN_MATERIALS = Object.freeze({
    grass: { kind: 'soft', palette: ['#1b2820','#283a2b','#344932','#45613e','#627450'], roughness: .94, specular: .08, height: 24, details: ['mushroom','pebble','twig','leaf'] },
    soil: { kind: 'soft', palette: ['#201e1a','#302b22','#433b30','#574938','#69543e'], roughness: .91, specular: .09, height: 18, details: ['pebble','twig','leaf','root'] },
    mud: { kind: 'soft', palette: ['#161b19','#262723','#373128','#4c4031','#65513d'], roughness: .66, specular: .27, height: 13, details: ['pebble','twig','root'] },
    flagstone: { kind: 'hard', masonry: 'flagstone', roughness: .78, specular: .17, height: 65, details: ['moss','pebble','leaf'] },
    cobble: { kind: 'hard', masonry: 'cobble', roughness: .76, specular: .18, height: 75, details: ['moss','leaf'] },
    brick: { kind: 'hard', masonry: 'brick', roughness: .80, specular: .15, height: 63, details: ['moss','leaf'] },
});
export const BOUNDARY_RULES = Object.freeze({
    'soft:soft': 'soft-mingle',
    'hard:soft': 'whole-stone-erosion',
    'soft:hard': 'whole-stone-erosion',
    'hard:hard': 'structural-junction',
});
export const LIGHTING_MAP_CONTRACT = Object.freeze({
    // Real G engine: LitMaterial.albedo, .normal, .roughnessMap and scalar .specular.
    textures: ['albedo', 'normal', 'roughnessMap'],
    specular: 'scalar LitMaterial.specular, not a specularMap property',
    roughnessChannel: 'G',
    textureColorSpace: { albedo: 'sRGB', normal: 'linear', roughnessMap: 'linear' },
});
const wrap = (n,m) => (n%m+m)%m;
const stoneColors = new Set(['#2a302d','#373e38','#454b42','#52584d','#626657','#767866'].map(s=>hex(s).slice(0,3).join(',')));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash = (x,y,seed=0) => {
    let n = (Math.imul(x+173, 0x9e3779b1)^Math.imul(y+89,0x85ebca6b)^seed)>>>0;
    n = Math.imul(n^(n>>>16), 0x7feb352d);
    n = Math.imul(n^(n>>>15), 0x846ca68b);
    return ((n^(n>>>16))>>>0)/4294967296;
};
export function boundaryKind(a,b) {
    const left=TERRAIN_MATERIALS[a],right=TERRAIN_MATERIALS[b];
    if(!left||!right||a===b)throw new RangeError('Boundary requires two distinct known materials');
    return BOUNDARY_RULES[`${left.kind}:${right.kind}`];
}
export function checkDetailAllowed(material, detail) {
    const entry=TERRAIN_MATERIALS[material];
    if(!entry) throw new RangeError(`Unknown material ${material}`);
    return entry.details.includes(detail);
}

export function makeSoftField(material, seed=137) {
    const spec=TERRAIN_MATERIALS[material];
    if(!spec||spec.kind!=='soft')throw new RangeError('Expected a soft material');
    const b=new Bitmap(MASONRY_PERIOD,MASONRY_PERIOD);const p=spec.palette;
    b.rect(0,0,b.width,b.height,p[1]);
    // Draw clustered detail in 256px *world* coordinates; no per-tile resets.
    const r=rng(seed ^ (material==='grass'?314159:material==='mud'?271828:161803));
    for(let i=0;i<2500;i++) {
        const x=Math.floor(r()*256),y=Math.floor(r()*256);
        const shade=p[Math.floor(r()*p.length)];
        b.rect(x,y,1+Math.floor(r()*4),r()<.17?2:1,shade);
    }
    if(material==='grass') {
        for(let i=0;i<280;i++) {
            const x=Math.floor(r()*256),y=Math.floor(r()*256);
            const height=2+Math.floor(r()*4);
            b.line(x,y,x-2,y-height,p[3]);b.line(x+1,y,x+2,y-height+1,p[4]);
            b.set(x,y+1,p[0]);
        }
    } else if(material==='mud') {
        for(let i=0;i<120;i++) {
            const x=Math.floor(r()*248),y=Math.floor(r()*253),len=4+Math.floor(r()*8);
            b.line(x,y,x+len,y,p[0]);b.line(x+1,y+1,x+len-1,y+1,p[2]);
        }
    } else {
        for(let i=0;i<115;i++) {
            const x=Math.floor(r()*250),y=Math.floor(r()*250);
            b.line(x,y,x+4,y+1,p[0]);b.set(x+2,y-1,p[3]);
        }
    }
    return b;
}

export function addMicroDetails(base, material, seed=371, density=1) {
    if(!(base instanceof Bitmap)||base.width!==256||base.height!==256)
        throw new TypeError('Expected one 256px review world patch');
    if(!Number.isFinite(density)||density<0||density>2)throw new RangeError('Density must be 0..2');
    const out=base.clone();const r=rng(seed);
    const compatible=TERRAIN_MATERIALS[material]?.details;
    if(!compatible)throw new RangeError('Unknown material');
    const count=Math.floor((material==='grass'?46:25)*density);
    for(let i=0;i<count;i++) {
        const kind=compatible[Math.floor(r()*compatible.length)];
        const x=6+Math.floor(r()*240),y=6+Math.floor(r()*240);
        switch(kind) {
            case 'mushroom': // pale stems and weathered brown caps, few and small
                out.rect(x,y,1,3,'#969078');out.line(x-2,y,x+2,y,'#73614b');
                out.line(x-1,y-1,x+1,y-1,'#9a8770');out.set(x,y-2,'#514338');break;
            case 'pebble':
                out.rect(x,y,3,2,'#464843');out.rect(x+1,y,2,1,'#676962');out.line(x,y+2,x+3,y+2,'#1c2520');break;
            case 'leaf':
                out.line(x-2,y,x+2,y+1,'#5a5035');out.set(x,y-1,'#736044');break;
            case 'twig':
            case 'root':
                out.line(x-3,y,x+3,y+1,'#46382b');out.line(x+1,y,x+2,y-2,'#5d4834');break;
            case 'moss':
                out.rect(x,y,4,2,'#344a36');out.set(x+1,y-1,'#59704a');break;
        }
    }
    return out;
}

export function classifyStoneInstances(field) {
    if(!(field instanceof Bitmap)||field.width!==256||field.height!==256)
        throw new TypeError('Expected 256px masonry source');
    // Flood-fill connected stone faces with TOROIDAL neighbors: stones can cross the
    // 32px cut lines and even the atlas period without becoming partial stones.
    const width=256,height=256,ids=new Int32Array(width*height),components=[];
    function isFace(x,y) { const rgb=field.get(x,y);return stoneColors.has(rgb.slice(0,3).join(',')); }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
        const initial=y*width+x;
        if(ids[initial]||!isFace(x,y))continue;
        const id=components.length+1,points=[],queue=[initial];ids[initial]=id;
        for(let q=0;q<queue.length;q++) {
            const p=queue[q],py=Math.floor(p/width),px=p%width;
            points.push(p);
            const neighbors=[[wrap(px-1,width),py],[wrap(px+1,width),py],[px,wrap(py-1,height)],[px,wrap(py+1,height)]];
            for(const [nx,ny] of neighbors){const offset=ny*width+nx;if(ids[offset]||!isFace(nx,ny))continue;ids[offset]=id;queue.push(offset);}
        }
        components.push({id,size:points.length,points});
    }
    return {ids,components};
}

export function makeBoundaryMask(direction='left', seed=401, width=256) {
    if(!['left','right','top','bottom','northwest','northeast','southwest','southeast'].includes(direction))
        throw new RangeError('Invalid direction');
    if(!Number.isInteger(width)||width<=0||width>512)throw new RangeError('Invalid width');
    const mask=new Uint8Array(width*width);
    // Low-frequency variation follows the WORLD edge, not individual 32px cells.
    for(let y=0;y<width;y++)for(let x=0;x<width;x++){
        const along=direction==='left'||direction==='right'?y:x;
        const across=direction==='left'||direction==='right'?x:y;
        const edge=width*.52+6*Math.sin(along*.049+seed*.007)+3*Math.sin(along*.13+seed*.003);
        const corner=direction.length>7;
        const localX=width*.52+6*Math.sin(y*.049+seed*.007)+3*Math.sin(y*.13+seed*.003);
        const localY=width*.52+6*Math.sin(x*.049+seed*.007)+3*Math.sin(x*.13+seed*.003);
        const inPrimary=corner
            ? (direction.includes('west')?x<localX:x>=width-localX) &&
              (direction.includes('north')?y<localY:y>=width-localY)
            : (direction==='left'||direction==='top'?across<edge:across>=width-edge);
        mask[y*width+x]=inPrimary?1:0;
    }
    return mask;
}

export function blendWorldPatch(primary,secondary,mask,{policy='soft-mingle',stoneInstances=null,seed=161}={}) {
    if(primary.width!==secondary.width||primary.height!==secondary.height||primary.width!==256||primary.height!==256||mask.length!==65536)
        throw new RangeError('World material sources/mask must share 256x256 pixels');
    const output=new Bitmap(256,256),owner=new Uint8Array(65536);
    let keep=null;
    if(policy==='whole-stone-erosion') {
        if(!stoneInstances)throw new TypeError('Whole-stone boundary requires stone instances');
        keep=new Uint8Array(stoneInstances.components.length+1);
        for(const c of stoneInstances.components) {
            // A stone touching the soft region is removed in its ENTIRETY.
            // No clipped half-slabs against grass, mud or soil.
            keep[c.id]=c.points.every(index=>mask[index]===1)?1:0;
        }
    }
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
        const i=y*256+x;
        let choosePrimary=Boolean(mask[i]);
        if(policy==='whole-stone-erosion'&&stoneInstances.ids[i]) choosePrimary=Boolean(keep[stoneInstances.ids[i]]);
        if(policy==='soft-mingle'&&Math.abs(x-128)<20) {
            // At soft interfaces, contiguous pixel clusters mix at the world scale.
            if(hash(Math.floor(x/4),Math.floor(y/4),seed)>.77) choosePrimary=!choosePrimary;
        }
        owner[i]=choosePrimary?1:0;
        output.set(x,y,(choosePrimary?primary:secondary).get(x,y));
    }
    return {albedo:output,owner,keptStones:keep};
}

export function createBoundaryReview({primary='flagstone',secondary='grass',direction='left',seed=227}={}) {
    const first=TERRAIN_MATERIALS[primary],second=TERRAIN_MATERIALS[secondary];
    if(!first||!second||primary===secondary)throw new RangeError('Invalid material pair');
    const policy=boundaryKind(primary,secondary);
    const primarySource=first.kind==='hard'?createMasonryField(first.masonry,seed)
        :addMicroDetails(makeSoftField(primary,seed),primary,seed+402,.85);
    const secondarySource=second.kind==='hard'?createMasonryField(second.masonry,seed)
        :addMicroDetails(makeSoftField(secondary,seed),secondary,seed+811,.85);
    const mask=makeBoundaryMask(direction,seed);
    // Erosion must always treat the HARD material as the primary mask owner.
    if(policy==='whole-stone-erosion'&&first.kind==='soft') {
        const reversed=new Uint8Array(mask.map(v=>1-v));
        const topology=classifyStoneInstances(secondarySource);
        const res=blendWorldPatch(secondarySource,primarySource,reversed,{policy,stoneInstances:topology,seed});
        // Owner zero denotes source secondary (hard) in this inverted call.
        // Restore the original primary/secondary meaning for material maps.
        const owner=Uint8Array.from(res.owner,v=>1-v);
        return {...res,owner,policy,primary,secondary,direction,hardIds:topology.ids};
    }
    if (policy === 'structural-junction') {
        // Both sets of stones survive only when their complete exposed footprint
        // fits their assigned side. Earth fills the joint; never saw-cut slabs.
        const a=classifyStoneInstances(primarySource),b=classifyStoneInstances(secondarySource);
        const keepA=new Uint8Array(a.components.length+1),keepB=new Uint8Array(b.components.length+1);
        for(const c of a.components)keepA[c.id]=c.points.every(i=>mask[i]===1)?1:0;
        for(const c of b.components)keepB[c.id]=c.points.every(i=>mask[i]===0)?1:0;
        const infill=makeSoftField('soil',seed+7),out=new Bitmap(256,256),owner=new Uint8Array(65536);
        for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
            const i=y*256+x,side=Boolean(mask[i]);
            const keep=side?Boolean(a.ids[i]&&keepA[a.ids[i]]):Boolean(b.ids[i]&&keepB[b.ids[i]]);
            const mortar=side?primarySource.get(x,y):secondarySource.get(x,y);
            const pixel=keep?(side?primarySource:secondarySource).get(x,y)
                : ((side?a.ids[i]:b.ids[i])?infill.get(x,y):mortar);
            out.set(x,y,pixel);owner[i]=side?1:0;
        }
        return {albedo:out,owner,policy,primary,secondary,direction,hardIds:a.ids,secondaryHardIds:b.ids};
    }
    const topology=first.kind==='hard'?classifyStoneInstances(primarySource):null;
    const result=blendWorldPatch(primarySource,secondarySource,mask,{policy,stoneInstances:topology,seed});
    return {...result,policy,primary,secondary,direction,hardIds:topology?.ids??null};
}

export function buildLightingMaps(review) {
    const {albedo,owner,primary,secondary}=review;
    if(!(albedo instanceof Bitmap)||albedo.width!==256||owner.length!==65536)throw new TypeError('Invalid review patch');
    const height=new Uint8Array(65536),roughness=new Bitmap(256,256),specularGuide=new Bitmap(256,256);
    const primarySpec=TERRAIN_MATERIALS[primary],secondarySpec=TERRAIN_MATERIALS[secondary];
    for(let i=0;i<65536;i++) {
        const profile=owner[i]?primarySpec:secondarySpec;
        const rgb=Array.from(albedo.data.slice(i*4,i*4+3));
        // Height is geometric/material relief, not brightness treated as fake normal.
        const stone=(profile.kind==='hard');
        const mortar=rgb[0]<43&&rgb[1]<54;
        const microHeight=profile.kind==='soft'
            ? clamp(Math.round((rgb[1]-(primarySpec.kind==='soft'?42:45))*.19),-5,9) : 0;
        height[i]=clamp(profile.height-(stone&&mortar?24:0)
            +(stone?Math.round((rgb[0]-60)*.15):microHeight),0,255);
        const r=clamp(Math.round(profile.roughness*255)+(stone&&mortar?18:0),0,255);
        const s=clamp(Math.round(profile.specular*255)+(profile.kind==='hard'&&!mortar?9:0),0,255);
        roughness.data.set([r,r,r,255],i*4);specularGuide.data.set([s,s,s,255],i*4);
    }
    const normal=new Bitmap(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
        const at=(xx,yy)=>height[wrap(yy,256)*256+wrap(xx,256)];
        const dx=(at(x+1,y)-at(x-1,y))*.028,dy=(at(x,y+1)-at(x,y-1))*.028;
        const len=Math.hypot(dx,dy,1);
        normal.set(x,y,[clamp(Math.round(128-127*dx/len),0,255),clamp(Math.round(128-127*dy/len),0,255),clamp(Math.round(128+127/len),0,255),255]);
    }
    return {albedo,normal,roughnessMap:roughness,specularGuide,height};
}

export function cutReviewInto32(bitmap) {
    if(!(bitmap instanceof Bitmap)||bitmap.width!==256||bitmap.height!==256)throw new TypeError('Expected 256px bitmap');
    const pieces=[];
    for(let row=0;row<8;row++)for(let col=0;col<8;col++){
        const tile=new Bitmap(32,32);
        for(let y=0;y<32;y++)for(let x=0;x<32;x++)tile.set(x,y,bitmap.get(col*32+x,row*32+y));
        pieces.push({col,row,tile});
    }
    return pieces;
}

export function materialDescriptor(name,{albedo,normal,roughnessMap}) {
    const profile=TERRAIN_MATERIALS[name];if(!profile)throw new RangeError('Unknown material');
    return {id:`wf32-${name}`,color:'#ffffff',albedo,normal,roughnessMap,roughness:1,
        metalness:0,specular:profile.specular,reflection:'direct',normalScale:.7,
        emission:'#000000',emissionIntensity:0,alphaCutoff:0,doubleSided:false,wetness:0};
}