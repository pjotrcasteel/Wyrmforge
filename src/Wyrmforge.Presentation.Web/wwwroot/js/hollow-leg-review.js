// Review-only Hollowed injury animation: entirely opt-in via ?hollowLegReview=dragged.
// Does NOT alter C# movement, selection, attack/death clips or GPU lighting materials.
// The original standard and damaged-arm characters remain the default.
//
// This renderer uses the REAL Arena Canvas draw path but is *not* a production
// lighting material cutover. All eight poses are original Blender-skinned art.
// Keep both versions reviewable; no old candidate is silently replaced.
export const HOLLOW_LEG_REVIEW_TOKEN = 'dragged';
export const HOLLOW_LEG_EVEN_TOKEN = 'even';
export const HOLLOW_LEG_REVIEW_DIRECTIONS = Object.freeze(['N','NE','E','SE','S','SW','W','NW']);

export function hollowLegReviewMode(search=globalThis.location?.search??'') {
    try {
        const mode=new URLSearchParams(search).get('hollowLegReview');
        return mode===HOLLOW_LEG_REVIEW_TOKEN||mode===HOLLOW_LEG_EVEN_TOKEN?mode:null;
    } catch {
        return null;
    }
}
export function hollowLegReviewRequested(search=globalThis.location?.search??'') {
    return hollowLegReviewMode(search)!==null;
}

export function createHollowLegReview(baseUrl, requested=hollowLegReviewRequested()) {
    let metadata=null, image=null, loading=null;
    const enabled=Boolean(requested);
    const ready=()=>enabled&&Boolean(metadata&&image);

    const preload=()=> {
        if(!enabled)return Promise.resolve(false);
        return loading??=fetch(new URL('manifest.json',baseUrl)).then(response=>{
            if(!response.ok)throw new Error('Review-only broken-leg manifest unavailable');
            return response.json();
        }).then(async manifest=>{
            if(manifest.schemaVersion!==1||manifest.reviewOnly!==true||
                manifest.artApproval!==false||manifest.runtimeCutover!==false||
                manifest.materialsRegenerated!==false||manifest.cell!==96||
                manifest.frames!==16||manifest.anchor?.[0]!==48||
                manifest.anchor?.[1]!==72||manifest.worldSize!==93||
                JSON.stringify(manifest.directions)!==JSON.stringify(HOLLOW_LEG_REVIEW_DIRECTIONS)||
                !/^[0-9a-f]{40}$/.test(manifest.sourceBlobSha??'')) {
                throw new Error('Invalid broken-leg review manifest');
            }
            const result=await new Promise((resolve,reject)=>{
                const sprite=new Image();
                sprite.onload=()=>sprite.naturalWidth===1536&&sprite.naturalHeight===768?
                    resolve(sprite):reject(new Error('Broken-leg review atlas dimensions mismatch'));
                sprite.onerror=()=>reject(new Error('Broken-leg review atlas unavailable'));
                sprite.src=new URL(manifest.image+'?v='+manifest.sourceBlobSha.slice(0,12),baseUrl).href;
            });
            metadata=manifest;
            image=result;
            return true;
        }).catch(()=>false); // Broken preview must never break normal Hollowed playback.
    };

    // The new broken-leg actor uses the currently accepted standard TWO-ARM
    // reach. Only replace a STANDARD WALK; an injured ARM, attacks and death
    // retain their exact separate atlas/rig. This is intentional isolation,
    // not permission to ship mismatched attack/lighting frames.
    function draw(ctx,variant,clip,frame,direction,x,y,radius,opacity=1,filter='none') {
        if(!ready()||variant!=='standard'||clip!=='walk')return false;
        const row=metadata.directions.indexOf(direction);
        if(row<0)return false;
        const index=Math.max(0,Math.min(metadata.frames-1,Math.floor(frame)||0));
        const scale=Math.max(.65,Math.min(1.8,(Number(radius)||11)/11));
        const size=metadata.worldSize*scale;
        ctx.save();
        ctx.globalAlpha*=Math.max(0,Math.min(1,opacity));
        ctx.imageSmoothingEnabled=false;
        ctx.filter=filter;
        ctx.drawImage(image,index*metadata.cell,row*metadata.cell,metadata.cell,metadata.cell,
            x-metadata.anchor[0]/metadata.cell*size,
            y-metadata.anchor[1]/metadata.cell*size,size,size);
        ctx.restore();
        return true;
    }
    return {enabled,preload,ready,draw,get manifest(){return metadata;}};
}
