// Atomic, hashed source-skin resources for the existing animation asset owner.
import {validateSourceSkinSurface} from './source-skin-pose.js';
const bytesPerComponent={f:4,H:2,I:4},constructors={f:Float32Array,H:Uint16Array,I:Uint32Array};
export function decodeSourceSkinGeometry(manifest,buffer,surface){
    if(manifest.version!==1||manifest.sourceSignature!==surface.sourceSignature||manifest.sourceBlendSha256!==surface.sourceBlendSha256||!Number.isSafeInteger(manifest.vertices)||manifest.vertices<3||manifest.vertices>200000||!Number.isSafeInteger(manifest.triangles)||manifest.triangles<1||manifest.triangles>200000||![1,2,3,4].includes(manifest.influenceSets??1))throw new TypeError('Invalid source skin geometry contract');
    if(!['linear','dual-quaternion'].includes(manifest.skinningMode??'linear')||(manifest.skinningMode??'linear')!==(surface.skinningMode??'linear'))throw new TypeError('Source skin deformation mode mismatch');
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>16*1024*1024)throw new RangeError('Source skin geometry byte budget exceeded');
    const specs={position:['f',3],normal:['f',3],uv:['f',2],skinIndex:['H',4],skinWeight:['f',4],sourceEmission:['f',1],index:['I',1]};
    for(let set=2;set<=(manifest.influenceSets??1);set++){specs['skinIndex'+set]=['H',4];specs['skinWeight'+set]=['f',4];}
    const attributes={},ranges=[];
    for(const [name,[component,itemSize]] of Object.entries(specs)){
        const s=manifest.attributes?.[name],count=name==='index'?manifest.triangles*3:manifest.vertices,size=bytesPerComponent[component];
        if(!s||s.component!==component||s.itemSize!==itemSize||s.count!==count||!Number.isSafeInteger(s.offset)||s.offset<0||s.offset%size||s.bytes!==count*itemSize*size||s.offset+s.bytes>buffer.byteLength)throw new TypeError('Invalid source skin buffer view: '+name);
        if(ranges.some(([a,b])=>s.offset<b&&s.offset+s.bytes>a))throw new TypeError('Overlapping source skin buffer views');
        ranges.push([s.offset,s.offset+s.bytes]);
        const array=new constructors[component](buffer,s.offset,count*itemSize);if(!Array.from(array).every(Number.isFinite))throw new TypeError('Nonfinite source geometry channel');
        attributes[name]={array,itemSize};
    }
    if(attributes.index.array.some(i=>i>=manifest.vertices))throw new RangeError('Source skin triangle index out of bounds');
    for(let i=0;i<manifest.vertices;i++){
        const n=attributes.normal.array.subarray(i*3,i*3+3);if(Math.abs(Math.hypot(...n)-1)>.02)throw new RangeError('Source geometry normal is not normalized');
        let total=0;
        for(const suffix of Array.from({length:manifest.influenceSets??1},(_,i)=>i?String(i+1):''))for(let k=0;k<4;k++){
            const weight=attributes['skinWeight'+suffix].array[i*4+k],bone=attributes['skinIndex'+suffix].array[i*4+k];
            if(weight<0||weight>1||bone>=surface.bones.length)throw new RangeError('Invalid source skin influence');total+=weight;
        }
        if(Math.abs(total-1)>1e-5)throw new RangeError('Source skin weights do not sum to one');
        if(attributes.sourceEmission.array[i]<0||attributes.sourceEmission.array[i]>1)throw new RangeError('Invalid source emission channel');
    }
    return attributes;
}
async function hash(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function loadSourceSkinResources(baseUrl,declaration,{maxDecodedBytes=64*1024*1024,loadImage}={}){
    const read=async(name,sha,budget)=>{
        if(typeof name!=='string'||!/^[a-z0-9][a-z0-9._-]*$/i.test(name)||!/^[a-f0-9]{64}$/.test(sha??''))throw new TypeError('Hashed local source skin resource required');
        const response=await fetch(new URL(name,baseUrl));if(!response.ok)throw new Error('Source skin resource unavailable: '+name);
        const bytes=await response.arrayBuffer();if(bytes.byteLength>budget)throw new RangeError('Source skin resource budget exceeded: '+name);
        if(await hash(bytes)!==sha)throw new Error('Source skin resource hash mismatch: '+name);return bytes;
    };
    const metaBytes=await read(declaration.manifest,declaration.sha256,128*1024),manifest=JSON.parse(new TextDecoder().decode(metaBytes));
    const [buffer,poseBytes,imageBytes]=await Promise.all([read(manifest.buffer,manifest.bufferSha256,16*1024*1024),read(manifest.poses,manifest.posesSha256,4*1024*1024),read(manifest.albedo,manifest.albedoSha256,16*1024*1024)]);
    const surface=validateSourceSkinSurface(JSON.parse(new TextDecoder().decode(poseBytes))),attributes=decodeSourceSkinGeometry(manifest,buffer,surface);
    let image;
    try{
        if(loadImage)image=await loadImage(imageBytes);
        else if(typeof createImageBitmap==='function')image=await createImageBitmap(new Blob([imageBytes],{type:'image/png'}),{imageOrientation:'flipY',premultiplyAlpha:'none'});
        else image=await new Promise((resolve,reject)=>{const element=new Image(),url=URL.createObjectURL(new Blob([imageBytes],{type:'image/png'}));element.onload=()=>{URL.revokeObjectURL(url);resolve(element);};element.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Source skin albedo decode failed'));};element.src=url;});
        const width=image.width??image.naturalWidth,height=image.height??image.naturalHeight;
        if(!Array.isArray(manifest.albedoSize)||width!==manifest.albedoSize[0]||height!==manifest.albedoSize[1])throw new RangeError('Source skin albedo dimensions mismatch');
        const decodedBytes=buffer.byteLength+width*height*4;
        if(decodedBytes>maxDecodedBytes)throw new RangeError('Source skin decoded budget exceeded');
        return {manifest,surface,attributes,image,decodedBytes,encodedBytes:metaBytes.byteLength+buffer.byteLength+poseBytes.byteLength+imageBytes.byteLength,
            dispose(){image.close?.();if('src' in image)image.src='';}};
    }catch(error){image?.close?.();if(image&&'src' in image)image.src='';throw error;}
}
