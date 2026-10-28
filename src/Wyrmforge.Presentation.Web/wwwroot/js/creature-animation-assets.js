// Atomic atlas adapter for the ONE shared sprite-animation controller.
import {validateCreatureRigProfile} from './sprite-animation.js';
import {spriteFrame} from './lighting/lit-sprite.js';
export function createCreatureAnimationAssets(baseUrl,{maxDecodedBytes=64*1024*1024}={}){
    let data=null,pending=null,lastError=null,generation=0;
    async function load(){
        const version=generation;
        const [manifest,profile]=await Promise.all(['manifest.json','profile.json'].map(async name=>{
            const response=await fetch(new URL(name,baseUrl));if(!response.ok)throw new Error(`Animation asset unavailable: ${name}`);return response.json();
        }));
        validateCreatureRigProfile(profile);
        if(manifest.schemaVersion!==2||manifest.directions.length!==8)throw new TypeError('Invalid animation atlas manifest');
        const specs=[profile.locomotion,...Object.values(profile.actions),...Object.values(profile.pivots??{}),...(profile.pivot?[profile.pivot]:[])];
        for(const spec of specs)if(manifest.clips[spec.clip]?.frames!==spec.frames)throw new TypeError(`Profile/atlas mismatch: ${spec.clip}`);
        const estimate=Object.values(manifest.clips).reduce((sum,clip)=>sum+clip.cell*clip.cell*clip.frames*8*4*(1+Object.keys(clip.materials??{}).length),0);
        if(!Number.isFinite(estimate)||estimate>maxDecodedBytes)throw new RangeError('Animation texture budget exceeded');
        const images=new Map();let encodedBytes=0,decodedBytes=0;
        async function texture(item,clip,key){
            if(!/^[a-f0-9]{64}$/.test(item.sha256??''))throw new TypeError(`Invalid atlas hash: ${key}`);
            const response=await fetch(new URL(item.image+'?v='+item.sha256.slice(0,16),baseUrl));
            if(!response.ok)throw new Error(`Atlas unavailable: ${key}`);
            const bytes=await response.arrayBuffer();
            const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
            if(hash!==item.sha256)throw new Error(`Atlas source hash mismatch: ${key}`);
            const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
            try{
                const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Atlas decode failed: ${key}`));i.src=url;});
                if(image.naturalWidth!==clip.cell*clip.frames||image.naturalHeight!==clip.cell*8)throw new RangeError(`Clipped atlas: ${key}`);
                images.set(key,image);encodedBytes+=bytes.byteLength;decodedBytes+=image.naturalWidth*image.naturalHeight*4;
            }finally{URL.revokeObjectURL(url);}
        }
        await Promise.all(Object.entries(manifest.clips).map(async([name,clip])=>{
            if(!Number.isSafeInteger(clip.cell)||clip.cell<1||!Number.isSafeInteger(clip.frames)||clip.frames<1||!(clip.worldSize>0)||!Array.isArray(clip.anchor)||clip.anchor.length!==2||!clip.anchor.every(n=>Number.isFinite(n)&&n>=0&&n<=clip.cell))throw new TypeError(`Invalid atlas clip: ${name}`);
            await texture(clip,clip,name);
            await Promise.all(Object.entries(clip.materials??{}).map(([kind,item])=>texture(item,clip,`${name}:${kind}`)));
        }));
        if(version!==generation){for(const image of images.values())image.src='';return false;}
        data={manifest,profile,images,encodedBytes,decodedBytes};return true;
    }
    return {preload:()=>pending??=load().catch(error=>{lastError=error.message;return false;}),ready:()=>Boolean(data),dispose(){generation++;for(const image of data?.images.values()??[])image.src='';data=null;pending=null;lastError=null;},get profile(){return data?.profile;},get manifest(){return data?.manifest;},get error(){return lastError;},
        get stats(){return {textures:data?.images.size??0,encodedBytes:data?.encodedBytes??0,decodedBytes:data?.decodedBytes??0};},
        renderDescriptor(sample){
            if(!data)return null;
            const clip=data.manifest.clips[sample.clip];
            if(!clip)throw new RangeError('Unknown source clip');
            const maps={};for(const kind of Object.keys(clip.materials??{}))maps[kind]=data.images.get(`${sample.clip}:${kind}`);
            return {frame:spriteFrame(data.manifest,sample),clip,sourceSignature:data.manifest.sourceSignature,
                material:{albedo:maps.albedo??null,normal:maps.normal??null,emissiveMap:maps.emissive??null},
                gpuMaterialComplete:Boolean(maps.albedo&&maps.normal&&maps.emissive),productionAccepted:data.manifest.productionReady===true};
        },
        draw(ctx,sample,x,y,radius,opacity=1){
            const clip=data?.manifest.clips[sample?.clip],image=data?.images.get(sample?.clip);
            if(!clip||!image)return false;
            const row=data.manifest.directions.indexOf(sample.direction);if(row<0)return false;
            const size=clip.worldSize*Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
            ctx.save();ctx.globalAlpha*=opacity;ctx.imageSmoothingEnabled=false;
            ctx.drawImage(image,sample.frame*clip.cell,row*clip.cell,clip.cell,clip.cell,
                Math.round(x+sample.rootOffset.x-clip.anchor[0]/clip.cell*size),Math.round(y+sample.rootOffset.y-clip.anchor[1]/clip.cell*size),size,size);
            ctx.restore();return true;
        }};
}
