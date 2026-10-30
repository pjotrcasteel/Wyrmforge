// Source-only wizard proof exports; never changes production actor manifests.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Bitmap} from '../lib/painter.mjs';
import {encodePng} from '../lib/png.mjs';
import {paintMageFront,MAGE_ORIGIN} from '../sprites/mage.mjs';
import {cell,pivot,palette,walkKeys,idleKey,authoredLayers} from './source.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const out=join(root,'art/source/characters/grey-wizard/native-south-v001');
const check=process.argv.includes('--check'),files=new Map();
const hash=x=>createHash('sha256').update(x).digest('hex');
const emit=(name,data)=>files.set(name,Buffer.isBuffer(data)?data:Buffer.from(data));
const json=(name,data)=>emit(name,JSON.stringify(data,null,2)+'\n');
const png=(name,b)=>emit(name,encodePng(b.width,b.height,b.data));
const controller=readFileSync(join(root,'src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js'),'utf8');
const {createSpriteAnimationState,updateSpriteAnimation}=await import('data:text/javascript;base64,'+Buffer.from(controller).toString('base64'));
const profile={schemaVersion:1,maxDeltaSeconds:.1,facing:{directions:['S'],degreesPerSecond:360,hysteresisDegrees:3},locomotion:{clip:'walk',frames:16,stride:24,sourceFps:12},actions:{}};

function render(commands){
    const b=new Bitmap(...cell);
    for(const c of commands){
        assert.ok(palette[c.colour],`unknown source pigment ${c.colour}`);
        if(c.op==='poly')b.poly(c.points,palette[c.colour]);
        else if(c.op==='rect')b.rect(c.x,c.y,c.w,c.h,palette[c.colour]);
        else if(c.op==='line')b.line(c.x0,c.y0,c.x1,c.y1,palette[c.colour],c.width);
        else throw Error('Unknown pixel operation '+c.op);
    }
    return b;
}
function compose(spec,emissionOnly=false){
    const b=new Bitmap(...cell);
    for(const l of spec.layers)if(emissionOnly?l.name==='crystal-emission':l.name!=='crystal-emission')b.blit(render(l.commands),0,0);
    return b;
}
function scaled(b,n){const z=new Bitmap(b.width*n,b.height*n);for(let y=0;y<z.height;y++)for(let x=0;x<z.width;x++)z.set(x,y,b.get(Math.floor(x/n),Math.floor(y/n)));return z;}
const specs=walkKeys.map(authoredLayers),frames=specs.map(s=>compose(s)),emission=specs.map(s=>compose(s,true));
const idle=authoredLayers(idleKey);png('idle-source.png',compose(idle));
png('idle-native-4x.png',scaled(compose(idle),4));
// Existing rigged-sprites consumes square cells. Pad this rectangular source;
// do not introduce a new runtime format or warp its pixel density.
const packedCell=80,padX=8,anchor=[pivot[0]+padX,pivot[1]];
const atlas=new Bitmap(packedCell*16,packedCell),emissionAtlas=new Bitmap(packedCell*16,packedCell);
const packedIdle=new Bitmap(packedCell,packedCell).blit(compose(idle),padX,0);
png('idle.png',packedIdle);
for(let i=0;i<16;i++){
    png(`frames/walk-${String(i).padStart(2,'0')}.png`,frames[i]);
    atlas.blit(frames[i],i*packedCell+padX,0);emissionAtlas.blit(emission[i],i*packedCell+padX,0);
}
png('walk.png',atlas);png('walk-emission.png',emissionAtlas);
for(let l=0;l<idle.layers.length;l++){
    const name=idle.layers[l].name,layerAtlas=new Bitmap(packedCell*16,packedCell);
    for(let i=0;i<16;i++)layerAtlas.blit(render(specs[i].layers[l].commands),i*packedCell+padX,0);
    png(`layers/${name}.png`,layerAtlas);
}
const board=new Bitmap(64*4*3,80*4*3);
for(let i=0;i<16;i++)board.blit(scaled(frames[i],3),(i%4)*64*3,Math.floor(i/4)*80*3);
png('walk-contact-3x.png',board);
// Honest scale study: old mage at native world units vs candidate at 0.5 units/pixel.
const scaleBoard=new Bitmap(390,130);scaleBoard.rect(0,0,390,130,'#30333b');
scaleBoard.line(0,105,389,105,'#767980');
const old=paintMageFront('idle');scaleBoard.blit(old,70-MAGE_ORIGIN[0],89-MAGE_ORIGIN[1]);
const candidate=compose(idle);
for(let y=0;y<40;y++)for(let x=0;x<32;x++){const c=candidate.get(x*2,y*2);if(c[3])scaleBoard.set(240+x-17,105+y-35,c);}
png('scale-study-390.png',scaleBoard);
json('source-layers.json',{schemaVersion:1,source:'tools/art/grey-wizard/source.mjs',cell,pivot,palette,idle,walk:specs});
json('animation-profile.json',profile);
json('manifest.json',{schemaVersion:1,directions:['S'],status:'source review, not runtime approved',clips:{idle:{image:'idle.png',frames:1,cell:80,anchor,worldSize:40},walk:{image:'walk.png',frames:16,cell:80,anchor,worldSize:40}},emission:{walk:'walk-emission.png'},sourceExport:'art/source/characters/grey-wizard/native-south-v001'});

// Asset/contract verification: pixel alpha/palette, bounds, diversity and shared
// playback (including pause). These do not claim convincing artistic motion.
const allowed=new Set(Object.values(palette).map(s=>s.toLowerCase()));
const unique=new Set();let min={x:64,y:80},max={x:0,y:0};
for(const b of frames){
    unique.add(hash(b.data));const bounds=b.opaqueBounds();assert.ok(bounds);
    assert.ok(bounds.x>0&&bounds.y>0&&bounds.x+bounds.w<64&&bounds.y+bounds.h<80,'clipped source silhouette');
    min.x=Math.min(min.x,bounds.x);min.y=Math.min(min.y,bounds.y);max.x=Math.max(max.x,bounds.x+bounds.w-1);max.y=Math.max(max.y,bounds.y+bounds.h-1);
    for(let p=0;p<b.data.length;p+=4){const a=b.data[p+3];assert.ok(a===0||a===255,'nonbinary alpha');if(a)assert.ok(allowed.has('#'+Buffer.from(b.data.slice(p,p+3)).toString('hex')),'unlisted palette pigment');}
}
assert.ok(unique.size>=12,'too few distinct authored poses');
const state=createSpriteAnimationState(),sequence=[];
for(let i=0;i<16;i++)sequence.push(updateSpriteAnimation(state,profile,{direction:'S',distance:i?1.5:0,deltaSeconds:1/12,moving:true}).baseFrame);
assert.deepEqual(sequence,Array.from({length:16},(_,i)=>i));
const paused=updateSpriteAnimation(state,profile,{direction:'S',distance:99,deltaSeconds:.1,moving:true,paused:true});assert.equal(paused.baseFrame,15);
const reduced=updateSpriteAnimation(state,profile,{direction:'S',distance:0,deltaSeconds:0,moving:true,reducedMotion:true});assert.equal(reduced.baseFrame,0);
json('verification.json',{status:'source/format contracts only; visual and real-Hunt gates OPEN',sourceSha256:hash(readFileSync(new URL('./source.mjs',import.meta.url))),controllerSha256:hash(controller),frames:16,uniqueFrames:unique.size,paletteColours:allowed.size,binaryAlpha:true,sourceBounds:{min,max},packedCell,anchor,sharedControllerSequence:sequence,pause:true,reducedMotion:true,decodedAlbedoBytes:atlas.data.length,decodedEmissionBytes:emissionAtlas.data.length,artisticallyApproved:false,runtimeIntegrated:false,physicalDeviceTested:false});
let changed=0;
for(const[name,data]of files){const path=join(out,name);if(check){assert.ok(existsSync(path),`missing ${name}`);assert.deepEqual(readFileSync(path),data,`stale export ${name}`);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}changed++;}
console.log(JSON.stringify({mode:check?'check':'build',files:changed,uniqueFrames:unique.size,decodedRuntimeMapsBytes:atlas.data.length+emissionAtlas.data.length,output:out}));
