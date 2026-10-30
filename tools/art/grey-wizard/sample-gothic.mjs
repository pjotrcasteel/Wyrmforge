// Representation study only: deterministic native sampling of the corrected still.
// This does NOT reconstruct editable layers, author poses or certify game scale.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Bitmap} from '../lib/painter.mjs';
import {decodePng,encodePng} from '../lib/png.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const dir=join(root,'art/source/characters/grey-wizard/gothic-sampling-v002');
mkdirSync(dir,{recursive:true});
const input=readFileSync(join(root,'art/source/characters/grey-wizard/gothic-reconstruction-v002.png'));
const image=decodePng(input),src=new Bitmap(image.width,image.height);src.data.set(image.rgba);
// Generated alpha can include a diffuse concept halo; bound the physical figure
// using a documented threshold for this diagnostic export, never overwrite source.
const cutoff=200;
for(let p=0;p<src.data.length;p+=4)if(src.data[p+3]<cutoff)src.data.fill(0,p,p+4);else src.data[p+3]=255;
const bounds=src.opaqueBounds();
const samples=[];
for(const h of [64,96,128]){
    const w=Math.round(bounds.w*h/bounds.h),b=new Bitmap(w+8,h+8);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const sx=bounds.x+Math.min(bounds.w-1,Math.floor((x+.5)*bounds.w/w));
        const sy=bounds.y+Math.min(bounds.h-1,Math.floor((y+.5)*bounds.h/h));
        b.set(x+4,y+4,src.get(sx,sy));
    }
    const name=`gothic-${h}px.png`;writeFileSync(join(dir,name),encodePng(b.width,b.height,b.data));
    const big=new Bitmap(b.width*4,b.height*4);
    for(let y=0;y<big.height;y++)for(let x=0;x<big.width;x++)big.set(x,y,b.get(Math.floor(x/4),Math.floor(y/4)));
    writeFileSync(join(dir,`gothic-${h}px-4x.png`),encodePng(big.width,big.height,big.data));
    const colours=new Set();for(let p=0;p<b.data.length;p+=4)if(b.data[p+3])colours.add(Buffer.from(b.data.slice(p,p+3)).toString('hex'));
    samples.push({file:name,width:b.width,height:b.height,visibleTargetHeight:h,uniqueColours:colours.size,decodedBytes:b.data.length});
}
writeFileSync(join(dir,'sampling-report.json'),JSON.stringify({
    status:'STATIC SAMPLING STUDY ONLY: no layered source/motion/runtime acceptance',
    sourceSha256:createHash('sha256').update(input).digest('hex'),method:'pixel-centred nearest-neighbour',
    alphaCutoff:cutoff,bounds,samples,
    limitations:['source-lit concept, not relightable material','no palette/cluster cleanup or editable reconstruction',
        'no production density/world-scale decision','not game captures','no motion authored'],
},null,2)+'\n');
console.log(JSON.stringify(samples));
