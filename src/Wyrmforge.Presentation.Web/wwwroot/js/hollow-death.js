// Presentation-only no-cape death atlas. The 24 poses are rendered from the
// editable 3D skeletal collapse, never synthesized by rotating a walk sprite.
export const HOLLOW_DEATH_DIRECTIONS = Object.freeze(['N','NE','E','SE','S','SW','W','NW']);

export function createHollowDeathAssets(baseUrl) {
    let metadata=null,texture=null,load=null;
    const ready=()=>Boolean(metadata&&texture);
    const preload=()=>load??=fetch(new URL('manifest.json',baseUrl))
        .then(response=>{if(!response.ok)throw new Error('No-cape death atlas unavailable');return response.json();})
        .then(async manifest=>{
            if(manifest.schemaVersion!==1||manifest.actor!=='hollowed'||manifest.clip!=='death'||
                manifest.renderedFrom3D!==true||manifest.capeRemovedInActualMesh!==true||
                manifest.frames!==24||manifest.fps!==12||manifest.cell!==128||
                manifest.worldSize!==124||manifest.anchor?.[0]!==64||manifest.anchor?.[1]!==88||
                JSON.stringify(manifest.directions)!==JSON.stringify(HOLLOW_DEATH_DIRECTIONS)||
                !/^[0-9a-f]{64}$/.test(manifest.sha256??'')||manifest.image!=='death.png')
                throw new Error('Unverified skeletal Hollowed death source');
            const img=await new Promise((resolve,reject)=>{
                const bitmap=new Image();
                bitmap.onload=()=>bitmap.naturalWidth===3072&&bitmap.naturalHeight===1024?
                    resolve(bitmap):reject(new Error('Hollowed 3D death atlas size mismatch'));
                bitmap.onerror=()=>reject(new Error('Hollowed 3D death atlas could not decode'));
                bitmap.src=new URL('death.png?v='+manifest.sha256.slice(0,16),baseUrl).href;
            });
            metadata=manifest;texture=img;
            return true;
        }).catch(()=>false);

    function draw(ctx,frame,direction,x,y,radius,opacity=1,filter='none'){
        if(!ready())return false;
        const row=HOLLOW_DEATH_DIRECTIONS.indexOf(direction);
        if(row<0)return false;
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
