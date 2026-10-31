// WF32-P1j-B2: genuine world-anchored 2.5D prop source, NOT a separate runtime renderer.
// Every prop has ground footprint, rear/body/foreground sprite layers, authored depth
// and independent normal/roughness/shadow alpha. Shared G and C# remain authoritative.
import { Bitmap, packAtlas } from '../lib/painter.mjs';
import { ECOLOGY_PROP_DEFINITIONS, proposeEcologyProps } from './terrain-ecology-props.mjs';

export const ECOLOGY_25D_VERSION = 'wf32-ecology-props-2p5d.v1.1';
export const PROP_LAYER_ORDER = Object.freeze(['footprint', 'rear', 'front']);
export const PIXELS_PER_WORLD_UNIT = 48; // shared LitSprite's current default authoring scale
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function hash(x, y, seed) {
    let h = (Math.imul(x | 0, 0x9e3779b1) ^ Math.imul(y | 0, 0x85ebca6b) ^ seed) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function emptyLayer(w, h) {
    return {albedo: new Bitmap(w, h), normal: new Bitmap(w, h), roughnessMap: new Bitmap(w, h), shadowAlpha: new Bitmap(w,h)};
}
function ink(layer, x, y, color, normal, roughness, casts = true) {
    if (!layer.albedo.inside(x, y)) return;
    layer.albedo.set(x, y, color);
    layer.normal.set(x, y, [...normal,255]);
    layer.roughnessMap.set(x, y, [roughness, roughness, roughness, 255]);
    if (casts) layer.shadowAlpha.set(x, y, [255,255,255,255]);
}
function paintPoly(layer, points, color, normal, roughness, casts = true) {
    const mask = new Bitmap(layer.albedo.width, layer.albedo.height);
    // Tiny scanline fill; independent of optional offline Bitmap.poly helpers.
    for(let y=0;y<mask.height;y++) {
        const intersections=[];
        for(let i=0;i<points.length;i++) {
            const [ax,ay]=points[i], [bx,by]=points[(i+1)%points.length];
            const scanY=y+.5;
            if((ay<=scanY&&by>scanY)||(by<=scanY&&ay>scanY))
                intersections.push(ax+(scanY-ay)*(bx-ax)/(by-ay));
        }
        intersections.sort((a,b)=>a-b);
        for(let i=0;i+1<intersections.length;i+=2)
            for(let x=Math.ceil(intersections[i]-.5);x<Math.ceil(intersections[i+1]-.5);x++)
                mask.set(x,y,'#ffffff');
    }
    for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)
        if(mask.alpha(x,y))ink(layer,x,y,color,normal,roughness,casts);
}
function rock(layers, cx, fy, radius, height, seed) {
    // Oblique pixel projection: top plane is above the foot; visible front/side
    // descend to the ground. Unlike an upright sprite, the top has actual area.
    const left = cx-radius, right=cx+radius, upper=fy-height;
    const inset=Math.max(2,Math.round(radius*.31));
    const tilt=Math.max(2,Math.round(radius*.28));
    const top=[ [left+inset,upper+tilt], [cx-inset,upper], [right-inset,upper+1],
        [right,upper+tilt+2], [cx+inset,upper+2*tilt], [left,upper+tilt+2] ];
    const frontY = fy-1;
    paintPoly(layers.rear,top,'#536258',[123,126,250],201);
    // Visible front and near-side facets project the stone top to its footprint.
    paintPoly(layers.front,[top[5],top[4],[cx+inset,frontY],[left+1,frontY-tilt]],
        '#414b43',[113,183,207],220);
    paintPoly(layers.front,[top[4],top[3],[right-1,frontY-tilt],[cx+inset,frontY]],
        '#36453e',[168,179,199],224);
    // Uneven weathering/lichen stays INSIDE the mass; no complete black contour.
    for(let i=0;i<radius*10;i++) {
        const x=Math.round(left+hash(i,1,seed)*radius*2);
        const y=Math.round(upper+hash(i,2,seed)*(height+tilt));
        if(!layers.rear.albedo.alpha(x,y))continue;
        const v=hash(i,3,seed);
        if(v>.83)ink(layers.rear,x,y,v>.95?'#677369':'#4a6050',[117,126,242],211);
    }
}
// Narrow leaves, with a soft curved silhouette rather than thorn-like spikes.
// In pixel space the foliage is mostly one pixel wide, two toward the base,
// occasionally three at the root. No branching triangular polygons.
export const GRASS_BLADE_STYLE = Object.freeze({baseMaxWidth:3, tipMaxWidth:1, sideBranches:false});
function blade(layer, baseX, baseY, length, bend, seed, highlight) {
    const main=highlight?'#607b58':'#49664a';
    const dark=highlight?'#3d5c41':'#314e38';
    const curve=(hash(seed,baseX,baseY)-.5)*3;
    const normal=[bend<0?113:143,138,240];
    const count=Math.max(8,Math.round(length));
    for(let k=0;k<=count;k++) {
        const t=k/count;
        // A bowed, gently arcing blade. It grows upward out of the root cluster,
        // with a near-vertical tip instead of an arrowhead or sharp side twig.
        const sweep=t*t*(3-2*t);
        const x=Math.round(baseX+bend*sweep+curve*Math.sin(Math.PI*t));
        const y=baseY-Math.round(length*t);
        const width=t<.12?3:t<.47?2:1;
        const inkColor=t<.2?dark:main;
        for(let offset=0;offset<width;offset++)
            ink(layer,x+offset-(width===3?1:0),y,inkColor,normal,236);
        // Sparse single-pixel flecks suggest folded leaf surfaces, not thorns.
        if(t>.23&&t<.58&&width===2&&hash(k,seed,11)>.78)
            ink(layer,x,y,highlight?'#718765':'#55714f',[126,139,242],239);
    }
}
function grass(layers, kind, variant, spec) {
    const [cx,cy]=spec.anchor;
    const tall=kind==='grass-tall';
    const maxHeight=tall?42:26;
    const count=tall?17:12;
    // Discrete leaves lean different ways; some remain nearly upright. Their
    // sparse top halves show the ground between them rather than forming a fan.
    for(let i=0;i<count;i++) {
        const v=hash(i,variant,418),w=hash(i,variant,491);
        const x=cx+Math.round((v-.5)*(tall?27:20));
        const by=cy-(i%3===0?3:1)+(i%4);
        const len=Math.round(maxHeight*(.42+.58*hash(i,variant,577)));
        const bend=Math.round((w-.5)*(tall?15:10));
        blade(i%3===0?layers.rear:layers.front,x,by,len,bend,variant*211+i,i%5===0);
    }
    // Natural low crown masks individual root contact without adding spikes.
    for(let i=0;i<(tall?10:7);i++) {
        const x=cx+Math.round((hash(i,variant,606)-.5)*(tall?20:15));
        const y=cy-1-(i%3);
        ink(layers.front,x,y,i%4===0?'#56704d':'#3a5740',[126,139,243],240);
    }
}
/** Source-art volume/depth contract. Layers remain 2D atlases but occupy
 * independent 2.5D depth slices, with world-scaled height and ground extent.
 */
export function makeEcology25DProp(kind, variant = 0) {
    const spec=ECOLOGY_PROP_DEFINITIONS[kind];
    if(!spec||!Number.isInteger(variant)||variant<0||variant>2)throw new RangeError('Invalid 2.5D prop');
    const [width,height]=spec.size;
    const layers=Object.fromEntries(PROP_LAYER_ORDER.map(k=>[k,emptyLayer(width,height)]));
    const [cx,cy]=spec.anchor;
    const isRock=kind.startsWith('rock');
    // Footprint is a ground plane, not a painted directional cast shadow.
    const footprint=layers.footprint;
    const rad=spec.groundRadius;
    const footprintY=cy-1;
    for(let y=footprintY-2;y<=footprintY+1;y++)
        for(let x=cx-rad;x<=cx+rad;x++) {
            const nx=(x-cx)/rad, ny=(y-footprintY)/3;
            if(nx*nx+ny*ny<1 && hash(x,y,variant+17)>.2)
                ink(footprint,x,y,isRock?'#30372f':'#273e2b',[128,128,255],245,false);
        }
    if(isRock) {
        if(kind==='rock-small')rock(layers,cx,cy,9+variant,11+(variant%2),100+variant);
        else {
            rock(layers,cx-8,cy+1,10,12,201+variant);
            rock(layers,cx+8,cy,10+(variant%2),11,315+variant);
            rock(layers,cx,cy-4,8,13,421+variant);
        }
    } else grass(layers,kind,variant,spec);
    const worldHeightPx=kind==='rock-small'?12:kind==='rock-cluster'?17:
        kind==='grass-medium'?28:45;
    const geometry=Object.freeze({
        projectedHeightPixels:worldHeightPx, worldHeight:worldHeightPx/PIXELS_PER_WORLD_UNIT,
        groundRadiusPixels:spec.groundRadius, groundRadius:spec.groundRadius/PIXELS_PER_WORLD_UNIT,
        footAnchor:spec.anchor, contactDepthPixels:isRock?Math.round(spec.groundRadius*.7):Math.round(spec.groundRadius*.5),
        camera:'world-ground-anchored orthographic 2.5D',
        layers:[{name:'footprint',depth:-.03,castsShadow:false},
            {name:'rear',depth:-.015,castsShadow:spec.castShadow},
            {name:'front',depth:.015,castsShadow:spec.castShadow}]
    });
    return {kind,variant,anchor:spec.anchor,geometry,layers};
}
export function buildEcology25DAtlases() {
    const sprites=[];
    for(const kind of Object.keys(ECOLOGY_PROP_DEFINITIONS))for(let variant=0;variant<3;variant++)
        sprites.push({name:`prop.${kind}.${variant}`,sprite:makeEcology25DProp(kind,variant)});
    const result={};
    for(const layer of PROP_LAYER_ORDER) {
        result[layer]={};
        for(const channel of ['albedo','normal','roughnessMap','shadowAlpha'])
            result[layer][channel]=packAtlas(sprites.map(({name,sprite})=>({
                name,bitmap:sprite.layers[layer][channel],anchor:sprite.anchor
            })),512,2);
        const ref=JSON.stringify(result[layer].albedo.frames);
        for(const channel of ['normal','roughnessMap','shadowAlpha'])
            if(ref!==JSON.stringify(result[layer][channel].frames))throw new Error('Misaligned 2.5D prop channels');
    }
    return result;
}
/** Candidate sprite scene metadata for the existing G LitRenderable and C# scene.
 * This does not call the renderer, spawn colliders, or claim runtime integration.
 */
export function ecology25DSceneCandidates(field, options) {
    return proposeEcologyProps(field,options).map(p=>{
        const image=makeEcology25DProp(p.kind,p.variant);
        return {...p,scene:{
            anchor:[p.x,p.y,0],
            worldHeight:image.geometry.worldHeight,
            groundRadius:image.geometry.groundRadius,
            layerDepths:image.geometry.layers.map(l=>l.depth),
            alphaOcclusion:true,receivesLight:true,
            sharedG:'LitRenderable/LitMaterial descriptors; texture+geometry registration pending',
            collision:p.collision.mode==='candidate-csharp'?'C# may approve':'nonblocking',
            visualOnly:true
        }};
    });
}