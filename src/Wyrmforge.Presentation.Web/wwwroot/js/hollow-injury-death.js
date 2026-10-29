// Source-authored, injury-specific cape-free Hollowed death clips.
// Loads only the damaged silhouettes actually encountered in a Hunt; avoids
// decoding three 2304x768 textures on every phone just for a rare corpse.
export const HOLLOW_INJURY_DEATH_VARIANTS=Object.freeze(['broken-arm-right','one-arm-left','broken-leg-left']);
export const HOLLOW_INJURY_DEATH_DIRECTIONS=Object.freeze(['N','NE','E','SE','S','SW','W','NW']);

export function selectHollowDeathInjury(pose) {
    if(pose?.injuryVariant==='broken-leg-left')return 'broken-leg-left';
    return HOLLOW_INJURY_DEATH_VARIANTS.includes(pose?.armVariant)?pose.armVariant:'standard';
}

export function createHollowInjuryDeathAssets(baseUrl) {
    let manifestPromise=null;
    const images=new Map(),pending=new Map();

    const ready=variant=>images.has(variant);
    const enabled=()=>images.size;
    function loadManifest() {
        return manifestPromise??=fetch(new URL('manifest.json',baseUrl))
            .then(r=>{if(!r.ok)throw new Error('No Hollowed injury-death manifest');return r.json();})
            .then(meta=>{
                if(meta.schemaVersion!==1||meta.actor!=='hollowed'||meta.clip!=='death'||
                   meta.renderedFrom3D!==true||meta.capeRemovedInActualMesh!==true||
                   meta.frames!==24||meta.fps!==12||meta.cell!==96||
                   meta.worldSize!==124||meta.anchor?.[0]!==48||meta.anchor?.[1]!==66||
                   JSON.stringify(meta.variants)!==JSON.stringify(HOLLOW_INJURY_DEATH_VARIANTS)||
                   JSON.stringify(meta.directions)!==JSON.stringify(HOLLOW_INJURY_DEATH_DIRECTIONS))
                    throw new Error('Hollowed injury-death source is not compatible');
                return meta;
            });
    }
    function preload(variant) {
        if(!HOLLOW_INJURY_DEATH_VARIANTS.includes(variant))return Promise.resolve(false);
        if(ready(variant))return Promise.resolve(true);
        if(pending.has(variant))return pending.get(variant);
        const load=loadManifest().then(meta=>{
            const clip=meta.clips?.[variant];
            if(!clip||clip.image!=='death-'+variant+'.png'||!/^[a-f0-9]{64}$/.test(clip.sha256??''))
                throw new Error('Missing source-verified Hollowed injury death: '+variant);
            return new Promise((resolve,reject)=>{
                const img=new Image();
                img.onload=()=>img.naturalWidth===2304&&img.naturalHeight===768?
                    resolve(img):reject(new Error('Wrong dimensions for injury death '+variant));
                img.onerror=()=>reject(new Error('Cannot decode injury death '+variant));
                img.src=new URL(clip.image+'?v='+clip.sha256.slice(0,16),baseUrl).href;
            });
        }).then(img=>{images.set(variant,img);return true;}).catch(()=>false);
        pending.set(variant,load);
        return load;
    }
    function draw(ctx,variant,frame,direction,x,y,radius,opacity=1,filter='none') {
        const img=images.get(variant),row=HOLLOW_INJURY_DEATH_DIRECTIONS.indexOf(direction);
        if(!img||row<0)return false;
        const index=Math.max(0,Math.min(23,Math.floor(frame)||0));
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
        const size=124*scale;
        ctx.save();
        ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));
        ctx.imageSmoothingEnabled=false;
        ctx.filter=filter;
        ctx.drawImage(img,index*96,row*96,96,96,x-48/96*size,y-66/96*size,size,size);
        ctx.restore();
        return true;
    }
    return {preload,ready,draw,loadedCount:enabled};
}
