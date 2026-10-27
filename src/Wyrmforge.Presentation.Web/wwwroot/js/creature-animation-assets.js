// Atomic atlas adapter for the ONE shared sprite-animation controller.
import {validateCreatureRigProfile} from './sprite-animation.js';
export function createCreatureAnimationAssets(baseUrl){
    let data=null,pending=null;
    async function load(){
        const [manifest,profile]=await Promise.all(['manifest.json','profile.json'].map(async name=>{
            const response=await fetch(new URL(name,baseUrl));if(!response.ok)throw new Error(`Animation asset unavailable: ${name}`);return response.json();
        }));
        validateCreatureRigProfile(profile);
        if(manifest.schemaVersion!==2||manifest.directions.length!==8)throw new TypeError('Invalid animation atlas manifest');
        const images=new Map();
        await Promise.all(Object.entries(manifest.clips).map(async([name,clip])=>{
            if(!/^[a-f0-9]{64}$/.test(clip.sha256)||clip.cell!==96||clip.frames!==16)throw new TypeError(`Invalid atlas clip: ${name}`);
            const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Atlas failed: ${name}`));i.src=new URL(clip.image+'?v='+clip.sha256.slice(0,16),baseUrl).href;});
            if(image.naturalWidth!==clip.cell*clip.frames||image.naturalHeight!==clip.cell*8)throw new RangeError(`Clipped atlas: ${name}`);
            images.set(name,image);
        }));
        data={manifest,profile,images};return true;
    }
    return {preload:()=>pending??=load().catch(()=>false),ready:()=>Boolean(data),get profile(){return data?.profile;},get manifest(){return data?.manifest;},
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
