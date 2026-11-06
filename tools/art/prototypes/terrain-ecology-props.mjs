// WF32-P1j-B: original 2.5D ecology PROPS, authoring and candidate placement only.
// C# owns collision/navigation/site, shared G owns lighting, AR3 owns geography.
// Nothing here registers runtime objects or modifies the approved P1i material field.
import { Bitmap, packAtlas } from '../lib/painter.mjs';

export const ECOLOGY_PROP_VERSION = 'wf32-ecology-props.v1';
export const PROP_GRID = 56;
export const PROP_EDGE_GUARD = 12;
export const ECOLOGY_PROP_DEFINITIONS = Object.freeze({
    'rock-small': Object.freeze({size:[24,22],anchor:[12,20],groundRadius:6,
        compatible:['grass','soil','mud','flagstone','cobble','brick'],
        collision:'candidate-csharp',material:'rock',castShadow:true,receivesShadow:true,foliage:false}),
    'rock-cluster': Object.freeze({size:[40,28],anchor:[20,26],groundRadius:9,
        compatible:['grass','soil','mud','flagstone','cobble','brick'],
        collision:'candidate-csharp',material:'rock',castShadow:true,receivesShadow:true,foliage:false}),
    'grass-medium': Object.freeze({size:[32,42],anchor:[16,39],groundRadius:5,
        compatible:['grass','soil','mud'],
        collision:'none',material:'foliage',castShadow:false,receivesShadow:true,foliage:true}),
    'grass-tall': Object.freeze({size:[40,58],anchor:[20,54],groundRadius:7,
        compatible:['grass','soil','mud'],
        collision:'none',material:'foliage',castShadow:true,receivesShadow:true,foliage:true})
});
const ROCK=['#272d2b','#38403c','#4b5550','#626d63','#788276'];
const GRASS=['#1d3026','#294431','#34553a','#466848','#5a7651','#788768'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function hash(x,y,seed) {
    let h=(Math.imul(x|0,0x9e3779b1)^Math.imul(y|0,0x85ebca6b)^seed)>>>0;
    h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
    return ((h^(h>>>16))>>>0)/4294967296;
}
export function makeEcologyPropSprite(kind,variant=0) {
    const spec=ECOLOGY_PROP_DEFINITIONS[kind];
    if(!spec||!Number.isInteger(variant)||variant<0||variant>2)
        throw new RangeError('Invalid ecology prop variant');
    const [width,height]=spec.size;
    const albedo=new Bitmap(width,height),relief=new Uint8Array(width*height);
    const ink=(x,y,color,h)=>{
        if(!albedo.inside(x,y))return;
        albedo.set(x,y,color);relief[y*width+x]=h;
    };
    const stone=(cx,cy,rx,ry,idx)=>{
        for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)
            for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
                const dx=(x-cx)/rx,dy=(y-cy)/ry;
                const chip=(hash(Math.floor(x/3),Math.floor(y/3),idx+variant*79)-.5)*.12;
                if(dx*dx+dy*dy>1+chip)continue;
                const f=1-Math.min(1,Math.sqrt(dx*dx+dy*dy));
                const grit=hash(Math.floor(x/3),Math.floor(y/3),101+idx*9+variant*47);
                ink(x,y,ROCK[clamp(1+Math.floor(2.5*f+grit*.72),1,4)],Math.round(26+f*116));
                if(grit>.88&&f>.20)ink(x,y,'#3b5142',Math.round(24+f*109));
            }
    };
    if(spec.material==='rock') {
        const x=spec.anchor[0],y=spec.anchor[1]-4;
        if(kind==='rock-small')stone(x,y,9+variant,6+(variant%2),2);
        else {
            stone(x-9,y,10,7,3);stone(x+8,y+2,10+(variant%2),6,4);
            stone(x,y-4,9,8,5);
        }
        for(let i=0;i<6;i++){
            const xx=x-9+Math.floor(hash(i,variant,123)*18);
            const yy=y-3+Math.floor(hash(i,variant,333)*6);
            if(albedo.alpha(xx,yy))
                ink(xx,yy,i%3===0?'#5b6d54':'#39443d',relief[yy*width+xx]);
        }
    } else {
        const cx=spec.anchor[0],cy=spec.anchor[1],n=kind==='grass-tall'?19:13;
        for(let i=0;i<n;i++){
            const foot=cx+Math.round((hash(i,variant,243)-.5)*(kind==='grass-tall'?18:15));
            const length=(kind==='grass-tall'?20:12)+Math.floor(hash(i,variant,709)*(kind==='grass-tall'?26:15));
            const lean=Math.round((hash(i,variant,711)-.5)*(kind==='grass-tall'?12:8));
            const shade=GRASS[2+Math.floor(hash(i,variant,991)*3)];
            for(let t=0;t<=length;t++){
                const x=Math.round(foot+lean*t/length+Math.sin(t*.15+i)*1.2),y=cy-t;
                ink(x,y,shade,Math.round(12+85*(1-t/(length+2))));
                if(t<length*.42&&i%3!==0)
                    ink(x+1,y,GRASS[1],Math.round(10+65*(1-t/(length+2))));
            }
        }
        for(let i=0;i<12;i++)
            ink(cx-9+Math.floor(hash(i,variant,565)*19),cy-1,GRASS[2+i%2],13);
    }
    const normal=new Bitmap(width,height),roughnessMap=new Bitmap(width,height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        if(!albedo.alpha(x,y))continue;
        const z=(sx,sy)=>relief[clamp(sy,0,height-1)*width+clamp(sx,0,width-1)];
        const dx=(z(x+1,y)-z(x-1,y))/100,dy=(z(x,y+1)-z(x,y-1))/100;
        const inv=1/Math.sqrt(dx*dx+dy*dy+1);
        normal.set(x,y,[Math.round(128-127*dx*inv),Math.round(128-127*dy*inv),Math.round(128+127*inv),255]);
        const v=kind.startsWith('rock')?180+Math.round(hash(x,y,variant+79)*39)
            :222+Math.round(hash(x,y,variant+93)*24);
        roughnessMap.set(x,y,[v,v,v,255]);
    }
    return {albedo,normal,roughnessMap,anchor:spec.anchor};
}
export function buildEcologyPropAtlases() {
    const sprites=[];
    for(const kind of Object.keys(ECOLOGY_PROP_DEFINITIONS))
        for(let v=0;v<3;v++)
            sprites.push({name:'prop.'+kind+'.'+v,sprite:makeEcologyPropSprite(kind,v)});
    const out={};
    for(const channel of ['albedo','normal','roughnessMap'])
        out[channel]=packAtlas(sprites.map(({name,sprite})=>({
            name,bitmap:sprite[channel],anchor:sprite.anchor})),512,2);
    if(JSON.stringify(out.albedo.frames)!==JSON.stringify(out.normal.frames)||
        JSON.stringify(out.albedo.frames)!==JSON.stringify(out.roughnessMap.frames))
        throw new Error('Prop material atlases have different frame layouts');
    return out;
}
function nearBoundary(field,x,y,radius) {
    const hard=Boolean(field.stoneIds[y*field.width+x]);
    const d=radius+PROP_EDGE_GUARD;
    for(let dy=-d;dy<=d;dy+=3)for(let dx=-d;dx<=d;dx+=3){
        const xx=x+dx,yy=y+dy;
        if(xx<0||yy<0||xx>=field.width||yy>=field.height)return true;
        if(Boolean(field.stoneIds[yy*field.width+xx])!==hard)return true;
    }
    return false;
}
/** World-coordinate prop candidate study only: C# must authorize site/footprints. */
export function proposeEcologyProps(field,{seed=1387,soft='grass',context={}}={}) {
    if(!field||!field.stoneIds||!Number.isInteger(field.originX)||
        !Number.isInteger(field.originY)||!Number.isInteger(field.width)||
        !Number.isInteger(field.height)||field.stoneIds.length!==field.width*field.height)
        throw new TypeError('Expected world-coordinate surface with stable stone identities');
    if(!['grass','soil','mud'].includes(soft))throw new RangeError('Invalid soft terrain');
    const c={moisture:.6,wear:.55,density:.62,...context};
    if(Object.values(c).some(v=>!Number.isFinite(v)||v<0||v>1))
        throw new RangeError('Ecology coefficients must be 0..1');
    const result=[];
    const maxX=field.originX+field.width,maxY=field.originY+field.height;
    for(let cy=Math.floor(field.originY/PROP_GRID)-1;cy<=Math.floor(maxY/PROP_GRID)+1;cy++)
    for(let cx=Math.floor(field.originX/PROP_GRID)-1;cx<=Math.floor(maxX/PROP_GRID)+1;cx++){
        const wx=cx*PROP_GRID+12+Math.floor(hash(cx,cy,seed+11)*31);
        const wy=cy*PROP_GRID+12+Math.floor(hash(cx,cy,seed+17)*31);
        if(wx<field.originX||wy<field.originY||wx>=maxX||wy>=maxY)continue;
        const x=wx-field.originX,y=wy-field.originY;
        const hard=Boolean(field.stoneIds[y*field.width+x]);
        const material=hard?field.type:soft;
        const moisture=clamp(c.moisture*.68+hash(cx,cy,seed+29)*.32,0,1);
        const wear=clamp(c.wear*.78+hash(cx,cy,seed+31)*.22,0,1);
        const patch=hash(Math.floor(cx/3),Math.floor(cy/3),seed+43);
        if(hash(cx,cy,seed+59)>c.density*(hard?.11:.18+.35*patch))continue;
        const allowed=hard?['rock-small','rock-cluster']:
            soft==='mud'?['rock-small','grass-medium']:
                ['rock-small','rock-cluster','grass-medium','grass-tall'];
        const kind=allowed[Math.floor(hash(cx,cy,seed+73)*allowed.length)];
        const spec=ECOLOGY_PROP_DEFINITIONS[kind];
        if(!spec.compatible.includes(material)||
            (kind==='grass-tall'&&(moisture<.43||wear>.87))||
            (kind==='rock-cluster'&&wear<.22)||
            nearBoundary(field,x,y,spec.groundRadius))continue;
        result.push({
            id:'ecology.'+seed+'.'+cx+'.'+cy,kind,variant:Math.floor(hash(cx,cy,seed+101)*3),
            x:wx,y:wy,material,anchor:spec.anchor,
            lighting:{receivesLight:true,receivesShadow:spec.receivesShadow,
                castsShadow:spec.castShadow,normal:true,roughness:true,
                foliageTransmission:spec.foliage},
            collision:{mode:spec.collision,groundRadius:spec.groundRadius,
                authority:'C# ArenaEnvironmentState / site geometry; no JS collider'},
            placement:'source-art-candidate-only'
        });
    }
    return result;
}
export function ecologyPropMaterialDescriptors() {
    return Object.fromEntries(Object.entries(ECOLOGY_PROP_DEFINITIONS).map(([kind,spec])=>[
        kind,{
            id:'wf32.'+kind,color:'#ffffff',
            albedo:'wf32.ecology.albedo',normal:'wf32.ecology.normal',
            roughnessMap:'wf32.ecology.roughness',roughness:1,metalness:0,
            specular:spec.foliage?.15:.26,reflection:'direct',
            emission:'#000000',emissionIntensity:0,alphaCutoff:.4,
            doubleSided:spec.foliage,foliageTransmission:spec.foliage?.09:0,
            normalScale:spec.foliage?.45:.8,wetness:0
        }
    ]));
}
