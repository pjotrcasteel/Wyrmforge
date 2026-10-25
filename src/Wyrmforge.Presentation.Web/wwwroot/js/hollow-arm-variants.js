// Hollowed no-cape arm pack. C# owns all movement/attacks/damage.
// Only three visually accepted-direction silhouettes ship in this slice.
// The unapproved broken-leg variants are intentionally absent.
export const HOLLOW_ARM_VARIANTS = Object.freeze(['standard','broken-arm-right','one-arm-left']);

// Stable per-entity appearance: independent of render time, camera, and
// repeated snapshots. No gameplay randomization or variant-specific damage.
export function selectHollowArmVariant(entityId) {
    const id=Number(entityId);
    if(!Number.isSafeInteger(id)||id<0)return 'standard';
    return HOLLOW_ARM_VARIANTS[(Math.imul(id,1597334677)>>>0)%3];
}

export function createHollowVariantAssets(baseUrl) {
    const assets=new Map();
    let metadata,load;
    const preload=()=>load??=fetch(new URL('manifest.json',baseUrl))
        .then(r=>{if(!r.ok)throw new Error('Hollow arm pack missing');return r.json();})
        .then(async manifest=>{
            if(manifest.schemaVersion!==1||manifest.cell!==96||manifest.frames!==16||
                JSON.stringify(manifest.directions)!==JSON.stringify(['N','NE','E','SE','S','SW','W','NW'])||
                manifest.variants.some(v=>!HOLLOW_ARM_VARIANTS.includes(v))||
                manifest.variants.length!==HOLLOW_ARM_VARIANTS.length)throw new Error('Arm pack manifest mismatch');
            const images=new Map();
            const requests=HOLLOW_ARM_VARIANTS.flatMap(variant=>
                ['walk','attack'].map(async clip=>{
                    const item=manifest.clips?.[variant]?.[clip];
                    if(!item||!item.image||!item.sha256||item.cell!==96||item.frames!==16)
                        throw new Error('Arm pack clip/source missing: '+variant+'/'+clip);
                    const image=await new Promise((resolve,reject)=>{
                        const png=new Image();
                        png.onload=()=>png.naturalWidth===1536&&png.naturalHeight===768?
                            resolve(png):reject(new Error('Invalid Hollow frame atlas size'));
                        png.onerror=()=>reject(new Error('Hollow variant image failed'));
                        png.src=new URL(item.image+'?v='+item.sha256.slice(0,16),baseUrl).href;
                    });
                    images.set(variant+':'+clip,image);
                }));
            await Promise.all(requests);
            // Never present a half-loaded arm pack with mixed animation clips.
            for(const [key,image] of images)assets.set(key,image);
            metadata=manifest;
            return true;
        }).catch(()=>false);

    function draw(ctx,variant,clip,frame,direction,x,y,radius,opacity=1,filter='none') {
        const name=HOLLOW_ARM_VARIANTS.includes(variant)?variant:'standard';
        const item=metadata?.clips?.[name]?.[clip],image=assets.get(name+':'+clip);
        if(!metadata||!item||!image)return false;
        const row=metadata.directions.indexOf(direction);
        if(row<0)return false;
        const index=Math.max(0,Math.min(item.frames-1,Math.floor(frame)||0));
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
        const size=(item.worldSize??93)*scale;
        const anchor=item.anchor??[48,72];
        ctx.save();
        ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));
        ctx.imageSmoothingEnabled=false;
        ctx.filter=filter;
        ctx.drawImage(image,index*item.cell,row*item.cell,item.cell,item.cell,
            x-anchor[0]/item.cell*size,y-anchor[1]/item.cell*size,size,size);
        ctx.restore();
        return true;
    }
    return {preload,ready:()=>Boolean(metadata&&assets.size===6),draw,
        get manifest(){return metadata;}};
}
