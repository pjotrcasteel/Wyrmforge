// Atomic atlas adapter for the ONE shared sprite-animation controller.
import {validateCreatureRigProfile} from './sprite-animation.js';
import {createSpriteLayerCompositor} from './sprite-layer-compositor.js';
import {sampleSourceContactRegions,updateSourceContactTargets,sourceGroundPointFromPixel} from './sprite-contact-kinematics.js';
import {spriteFrame,spriteAtlasLayout} from './lighting/lit-sprite.js';
export function createCreatureAnimationAssets(baseUrl,{maxDecodedBytes=64*1024*1024}={}){
    let data=null,pending=null,lastError=null,generation=0;
    async function load(){
        const version=generation;
        const [manifestResponse,profileResponse]=await Promise.all(['manifest.json','profile.json'].map(async name=>{
            const response=await fetch(new URL(name,baseUrl));if(!response.ok)throw new Error(`Animation asset unavailable: ${name}`);return response;
        }));
        const manifest=await manifestResponse.json();
        let profile;
        if(manifest.profileSha256){
            if(!/^[a-f0-9]{64}$/.test(manifest.profileSha256))throw new TypeError('Invalid animation profile hash');
            const bytes=await profileResponse.arrayBuffer();
            const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
            if(hash!==manifest.profileSha256)throw new Error('Animation profile source hash mismatch');
            profile=JSON.parse(new TextDecoder().decode(bytes));
        }else profile=await profileResponse.json();
        validateCreatureRigProfile(profile);
        if(profile.rig.signature!=null&&profile.rig.signature!==manifest.sourceSignature)throw new TypeError('Rig/source signature mismatch');
        if(manifest.schemaVersion!==2||manifest.directions.length!==8)throw new TypeError('Invalid animation atlas manifest');
        const specs=[profile.locomotion,...Object.values(profile.actions),...Object.values(profile.pivots??{}),...(profile.pivot?[profile.pivot]:[])];
        for(const spec of specs)if(manifest.clips[spec.clip]?.frames!==spec.frames)throw new TypeError(`Profile/atlas mismatch: ${spec.clip}`);
        const estimate=Object.values(manifest.clips).reduce((sum,clip)=>{const layout=spriteAtlasLayout(clip,manifest.directions.length);return sum+layout.width*layout.height*4*(1+Object.keys(clip.materials??{}).length);},0);
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
                const layout=spriteAtlasLayout(clip,manifest.directions.length);
                if(image.naturalWidth!==layout.width||image.naturalHeight!==layout.height)throw new RangeError(`Clipped atlas: ${key}`);
                images.set(key,image);encodedBytes+=bytes.byteLength;decodedBytes+=image.naturalWidth*image.naturalHeight*4;
            }finally{URL.revokeObjectURL(url);}
        }
        await Promise.all(Object.entries(manifest.clips).map(async([name,clip])=>{
            if(!Number.isSafeInteger(clip.cell)||clip.cell<1||!Number.isSafeInteger(clip.frames)||clip.frames<1||!(clip.worldSize>0)||!Array.isArray(clip.anchor)||clip.anchor.length!==2||!clip.anchor.every(n=>Number.isFinite(n)&&n>=0&&n<=clip.cell))throw new TypeError(`Invalid atlas clip: ${name}`);
            await texture(clip,clip,name);
            await Promise.all(Object.entries(clip.materials??{}).map(([kind,item])=>texture(item,clip,`${name}:${kind}`)));
        }));
        if(version!==generation){for(const image of images.values())image.src='';return false;}
        let regions=null,compositor=null;
        if(manifest.regions){
            const spec=manifest.regions;
            if(spec.continuousPhaseBody!=null&&typeof spec.continuousPhaseBody!=='boolean')throw new TypeError('Explicit phase-body correction declaration required');
            if(typeof spec.metadata!=='string'||!/^[a-f0-9]{64}$/.test(spec.sha256??''))throw new TypeError('Invalid source region manifest');
            const response=await fetch(new URL(spec.metadata,baseUrl));if(!response.ok)throw new Error('Source regions unavailable');
            const bytes=await response.arrayBuffer();if(bytes.byteLength>4*1024*1024)throw new RangeError('Source region metadata budget exceeded');
            const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
            if(hash!==spec.sha256)throw new Error('Source region hash mismatch');
            regions=JSON.parse(new TextDecoder().decode(bytes));
            if(regions.sourceSignature!==manifest.sourceSignature||JSON.stringify(regions.directions)!==JSON.stringify(manifest.directions)||regions.canvasSize!==128||regions.anchor?.length!==2||!regions.anchor.every(Number.isFinite))throw new TypeError('Source region rig/placement mismatch');
            for(const spec of specs)if(regions.colorAtlasSha256?.[spec.clip]!==manifest.clips[spec.clip].sha256)throw new Error('Source region color-atlas provenance mismatch');
            for(const spec of specs)for(const direction of manifest.directions)if(regions.clips?.[spec.clip]?.[direction]?.length!==spec.frames)throw new TypeError('Incomplete source region facing frames');
            if(regions.sourcePoses!=null){
                if(!Array.isArray(regions.sourcePoses)||!regions.sourcePoses.length||regions.sourcePosePrecisionMetres!==1e-8)throw new TypeError('Invalid shared source pose table');
                for(const views of Object.values(regions.clips))for(const frames of Object.values(views))for(const frame of frames){
                    if(!Number.isSafeInteger(frame.sourcePoseIndex)||frame.sourcePoseIndex<0||frame.sourcePoseIndex>=regions.sourcePoses.length)throw new TypeError('Invalid shared source pose reference');
                    const pose=regions.sourcePoses[frame.sourcePoseIndex];
                    if(!pose?.sourceBones||!pose.sourceContacts||!Array.isArray(pose.completeRegions))throw new TypeError('Incomplete shared source pose');
                    for(const key of ['sourceBones','sourceContacts','massCenter','balance','completeRegions'])frame[key]=pose[key];
                }
            }
            // Cache is shared by the pack, not allocated once per creature.
            const remaining=maxDecodedBytes-decodedBytes;
            const maxTiles=Math.min(96,Math.floor(remaining/(regions.canvasSize**2*4)));
            if(maxTiles<1)throw new RangeError('Source region tile budget exceeded');
            compositor=createSpriteLayerCompositor(regions,manifest.clips,images,{maxTiles,sourceRectangle(name,index,direction){const c=manifest.clips[name],layout=spriteAtlasLayout(c,manifest.directions.length),pad=(regions.canvasSize-c.cell)/2;return {source:[(index%layout.columns)*layout.tileWidth,(manifest.directions.indexOf(direction)*layout.rowsPerDirection+Math.floor(index/layout.columns))*layout.tileHeight,layout.tileWidth,layout.tileHeight],destination:[pad+layout.crop[0],pad+layout.crop[1],layout.tileWidth,layout.tileHeight]};}});
        }
        if(version!==generation){for(const image of images.values())image.src='';return false;}
        data={manifest,profile,images,encodedBytes,decodedBytes,regions,compositor};return true;
    }
    return {preload:()=>pending??=load().catch(error=>{lastError=error.message;return false;}),ready:()=>Boolean(data),dispose(){generation++;data?.compositor?.clear();for(const image of data?.images.values()??[])image.src='';data=null;pending=null;lastError=null;},get profile(){return data?.profile;},get manifest(){return data?.manifest;},get error(){return lastError;},
        get stats(){return {textures:data?.images.size??0,encodedBytes:data?.encodedBytes??0,decodedBytes:data?.decodedBytes??0,regionCacheBytes:data?.compositor?.estimatedBytes()??0};},
        sampleRegions(sample,targets,options){
            const frame=data?.regions?.clips[sample.clip]?.[sample.direction]?.[sample.frame];
            if(!frame)throw new RangeError('Source contact region pose unavailable');
            return {...sample,...sampleSourceContactRegions(frame,sample,targets,{...options,anchor:data.regions.anchor})};
        },
        updateRegions(state,sample,intent){
            if(!data?.regions)return sample;
            const frame=data.regions.clips[sample.clip]?.[sample.direction]?.[sample.frame];
            if(!frame)throw new RangeError('Source contact region pose unavailable');
            const clip=data.manifest.clips[sample.clip],scale=intent.scale??1;
            if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Positive regional actor scale required');
            const pixelScale=clip.worldSize/clip.cell*scale;
            const targets=updateSourceContactTargets(state,frame,{...intent,phaseOffset:sample.sourcePhaseOffset,translateSwing:Boolean(data.manifest.regions.continuousPhaseBody),pixelScale,anchor:data.regions.anchor});
            // Translate the authored body by the same sub-frame phase residual
            // used at landing. This preserves its source mass/support relation;
            // it does not follow arbitrary C# drift or move the gameplay root.
            let bodyOffset=[0,0,0];
            if(data.manifest.regions.continuousPhaseBody){
                const phase=sample.sourcePhaseOffset??{x:0,y:0},p=frame.projection;
                bodyOffset=sourceGroundPointFromPixel([p[3]+phase.x/pixelScale,p[7]+phase.y/pixelScale],0,p);
            }
            const regional=sampleSourceContactRegions(frame,sample,targets,{...intent,bodyOffset,pixelScale,anchor:data.regions.anchor});
            if(frame.balance==='supported'&&!Object.values(targets).some(t=>t.transported)&&!regional.support?.staticallySupported)throw new RangeError('Authored mass proxy is outside actual source support');
            // Regional anchors already consume world displacement. Applying the
            // whole-sprite contact correction again would move every planted foot.
            return {...sample,...regional,rootOffset:{x:0,y:0},debug:{...sample.debug,regional:{contacts:regional.contacts,support:regional.support,measurementSpace:regional.measurementSpace}}};
        },
        renderDescriptor(sample){
            if(!data)return null;
            if(sample.parts)throw new Error('Regional GPU material transforms have not been validated');
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
            if(sample.parts){
                try{if(!data.compositor)throw new Error('Source region metadata unavailable');const tile=data.compositor.compose(sample),scale=size/clip.cell;ctx.drawImage(tile,Math.round(x+sample.rootOffset.x-data.regions.anchor[0]*scale),Math.round(y+sample.rootOffset.y-data.regions.anchor[1]*scale),tile.width*scale,tile.height*scale);return true;}finally{ctx.restore();}
            }
            const layout=spriteAtlasLayout(clip,data.manifest.directions.length);
            ctx.drawImage(image,(sample.frame%layout.columns)*layout.tileWidth,(row*layout.rowsPerDirection+Math.floor(sample.frame/layout.columns))*layout.tileHeight,layout.tileWidth,layout.tileHeight,
                Math.round(x+sample.rootOffset.x+(layout.crop[0]-clip.anchor[0])/clip.cell*size),Math.round(y+sample.rootOffset.y+(layout.crop[1]-clip.anchor[1])/clip.cell*size),layout.tileWidth/clip.cell*size,layout.tileHeight/clip.cell*size);
            ctx.restore();return true;
        }};
}
