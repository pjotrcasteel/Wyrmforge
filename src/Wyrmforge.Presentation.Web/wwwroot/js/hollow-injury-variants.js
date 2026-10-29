// Hollowed injury appearances. Presentation only: C# owns encounters, damage, speed and contact.
// The original actor remains a full fallback if the optional no-cape packet is unavailable.
export const HOLLOW_INJURY_VARIANTS = Object.freeze(['standard','broken-leg-left']);
export const HOLLOW_INJURY_DIRECTIONS = Object.freeze(['N','NE','E','SE','S','SW','W','NW']);

export function selectHollowInjuryVariant(entityId, review=false) {
    if(review)return 'broken-leg-left'; // Only the existing enemy-lab opt-in may force it.
    const id=Number(entityId);
    if(!Number.isSafeInteger(id)||id<0)return 'standard';
    // One-in-four presentation variation; no gameplay RNG or save-state changes.
    return (Math.imul(id,1597334677)>>>0)%4===0?'broken-leg-left':'standard';
}

export function hollowInjuryLabReview(path=globalThis.location?.pathname??'',search=globalThis.location?.search??'') {
    try {
        return path.includes('/enemy-lab')&&new URLSearchParams(search).get('hollowInjury')==='left';
    }catch{return false;}
}

export function createHollowInjuryAssets(baseUrl) {
    let manifest=null,loading=null;
    const textures=new Map();
    const ready=()=>Boolean(manifest&&textures.size===2);
    function preload() {
        return loading??=fetch(new URL('manifest.json',baseUrl)).then(response=>{
            if(!response.ok)throw new Error('Hollow injury assets unavailable');
            return response.json();
        }).then(async data=>{
            if(data.schemaVersion!==1||data.variant!=='broken-leg-left'||
                JSON.stringify(data.directions)!==JSON.stringify(HOLLOW_INJURY_DIRECTIONS)||
                !data.fullBodyAttack)throw new Error('Hollow injury manifest mismatch');
            const decoded=await Promise.all(['walk','attack'].map(async clip=>{
                const item=data.clips?.[clip];
                if(!item||item.frames!==16||item.cell!==96||item.worldSize!==93||
                    item.anchor?.[0]!==48||item.anchor?.[1]!==72||
                    !/^[0-9a-f]{40}$/.test(item.gitBlobSha)||!item.image)throw new Error('Hollow injury clip incompatible');
                const image=await new Promise((resolve,reject)=>{
                    const bitmap=new Image();
                    bitmap.onload=()=>bitmap.naturalWidth===1536&&bitmap.naturalHeight===768?
                        resolve(bitmap):reject(new Error('Hollow injury atlas dimensions mismatch'));
                    bitmap.onerror=()=>reject(new Error('Hollow injury atlas could not be decoded'));
                    bitmap.src=new URL(item.image+'?v='+item.gitBlobSha.slice(0,12),baseUrl).href;
                });
                return [clip,image];
            }));
            // Atomic install: never mix a new walk with a missing attack.
            for(const [clip,image] of decoded)textures.set(clip,image);
            manifest=data;
            return true;
        }).catch(()=>false);
    }

    function draw(ctx,variant,clip,frame,direction,x,y,radius,opacity=1,filter='none') {
        if(!ready()||variant!=='broken-leg-left'||(clip!=='walk'&&clip!=='attack'))return false;
        const row=manifest.directions.indexOf(direction);
        if(row<0)return false;
        const item=manifest.clips[clip],image=textures.get(clip);
        const index=Math.max(0,Math.min(15,Math.floor(frame)||0));
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
        const size=item.worldSize*scale;
        ctx.save();
        ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));
        ctx.imageSmoothingEnabled=false;
        ctx.filter=filter;
        ctx.drawImage(image,index*96,row*96,96,96,
            x-item.anchor[0]/96*size,y-item.anchor[1]/96*size,size,size);
        ctx.restore();
        return true;
    }
    return {preload,ready,draw,get manifest(){return manifest;}};
}
