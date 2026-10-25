// Presentation-only independently keyed 3D Hollowed death clips. Never rotate
// walking sprites or modify authoritative C# death behaviour.
export const HOLLOW_DEATH_DIRECTIONS=Object.freeze(['N','NE','E','SE','S','SW','W','NW']);
export const HOLLOW_DEATH_VARIANTS=Object.freeze(['collapse-forward','collapse-braced']);

export function createHollowDeathAssets(baseUrl) {
    let metadata=null,load=null;
    const textures=new Map();
    const ready=()=>Boolean(metadata&&textures.size===HOLLOW_DEATH_VARIANTS.length);
    const preload=()=>load??=fetch(new URL('manifest.json',baseUrl))
        .then(response=>{if(!response.ok)throw new Error('No-cape death atlas unavailable');return response.json();})
        .then(async manifest=>{
            if(manifest.schemaVersion!==2||manifest.actor!=='hollowed'||manifest.clip!=='death'||
                manifest.renderedFrom3D!==true||manifest.capeRemovedInActualMesh!==true||
                manifest.frames!==24||manifest.fps!==12||manifest.cell!==128||
                manifest.worldSize!==124||manifest.anchor?.[0]!==64||manifest.anchor?.[1]!==88||
                JSON.stringify(manifest.variants)!==JSON.stringify(HOLLOW_DEATH_VARIANTS)||
                JSON.stringify(manifest.directions)!==JSON.stringify(HOLLOW_DEATH_DIRECTIONS))
                throw new Error('Unverified skeletal Hollowed death source');
            const images=await Promise.all(HOLLOW_DEATH_VARIANTS.map(async variant=>{
                const item=manifest.clips?.[variant];
                if(!item||!/^death(?:-braced)?\.png$/.test(item.image)||
                    !/^[0-9a-f]{64}$/.test(item.sha256??''))throw new Error('Missing authored death clip '+variant);
                const bitmap=await new Promise((resolve,reject)=>{
                    const png=new Image();
                    png.onload=()=>png.naturalWidth===3072&&png.naturalHeight===1024?
                        resolve(png):reject(new Error('Hollowed 3D death atlas size mismatch'));
                    png.onerror=()=>reject(new Error('Hollowed 3D death atlas could not decode'));
                    png.src=new URL(item.image+'?v='+item.sha256.slice(0,16),baseUrl).href;
                });
                return [variant,bitmap];
            }));
            // Avoid mixing partially loaded versions of the two 3D death clips.
            for(const [name,bitmap] of images)textures.set(name,bitmap);
            metadata=manifest;
            return true;
        }).catch(()=>false);

    function draw(ctx,variant,frame,direction,x,y,radius,opacity=1,filter='none') {
        if(!ready())return false;
        const row=HOLLOW_DEATH_DIRECTIONS.indexOf(direction);
        if(row<0)return false;
        const selected=HOLLOW_DEATH_VARIANTS.includes(variant)?variant:'collapse-forward';
        const texture=textures.get(selected);
        const index=Math.max(0,Math.min(23,Math.floor(frame)||0));
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
        const size=124*scale;
        ctx.save();
        ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));
        ctx.imageSmoothingEnabled=false;
        ctx.filter=filter;
        ctx.drawImage(texture,index*128,row*128,128,128,
            x-64/128*size,y-88/128*size,size,size);
        ctx.restore();
        return true;
    }
    return {preload,ready,draw,get manifest(){return metadata;}};
}
