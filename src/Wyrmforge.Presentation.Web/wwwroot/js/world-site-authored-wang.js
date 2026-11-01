// WF32 AR4-B2: source-authored Wang atlas clipped to C# surface winners.
// Presentation-only one-time site composition: no paths, collisions, or light.
export const WANG_ATLAS_REVISION = 'wf32-road-wang-b1.v2.unapproved';
export const WANG_ATLAS_SIZE = Object.freeze({width:496,height:331,tile:32,variants:8,masks:16});
const CLUSTER = 4;

export function validateAuthoredWang(atlas, manifest) {
    if (atlas?.width !== WANG_ATLAS_SIZE.width || atlas?.height !== WANG_ATLAS_SIZE.height ||
        atlas.data?.length !== atlas.width*atlas.height*4 ||
        manifest?.revision !== WANG_ATLAS_REVISION || manifest?.tilePixels !== 32 ||
        manifest?.approved !== false || !manifest?.frames ||
        Object.keys(manifest.frames).length !== 146 ||
        !Array.isArray(manifest.stencils) || manifest.stencils.length !== 16) return false;
    for(let mask=0;mask<16;mask++)for(let v=0;v<8;v++)
        if(!validFrame(manifest.frames['wang.'+mask+'.'+v],atlas))return false;
    for(let v=0;v<8;v++)
        if(!validFrame(manifest.frames['earth.'+v],atlas) ||
            !validFrame(manifest.frames['grass.'+v],atlas))return false;
    return true;
}
function validFrame(frame,atlas) {
    return Number.isInteger(frame?.x)&&Number.isInteger(frame?.y)&&
        frame.w===32&&frame.h===32&&frame.x>=0&&frame.y>=0&&
        frame.x+32<=atlas.width&&frame.y+32<=atlas.height;
}
function variantAt(cx,cy,seed) {
    let h=Math.imul(cx+23+(seed|0),0x45d9f3b)^Math.imul(cy+17+(seed|0),0x119de1f3);
    h^=h>>>16;return(h>>>0)%8;
}
/**
 * Recolors only existing C# Road labels and the road-adjacent Grass lip.
 * Labels are the C# semantic surface winner at 4px visual sample resolution.
 * A Wang silhouette may suggest a corner, but cannot promote Grass into Road.
 * Any disagreement is clipped back to the authored earth/grass interior.
 * Forest pixels outside the 4px road-adjacent lip stay from source32c.
 */
export function paintAuthoredWangRoad(pixels,width,height,atlas,manifest,labels,cellColumns,seed=0) {
    if(!validateAuthoredWang(atlas,manifest) ||
        !Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0 ||
        !Number.isInteger(cellColumns)||cellColumns!==Math.ceil(width/CLUSTER) ||
        pixels?.length!==width*height*4 ||
        labels?.length!==cellColumns*Math.ceil(height/CLUSTER))return false;
    const rows=Math.ceil(height/CLUSTER);
    const at=(cx,cy)=>cx>=0&&cy>=0&&cx<cellColumns&&cy<rows
        ? labels[cy*cellColumns+cx]:-1;
    const isRoad=(x,y)=>at(Math.floor(x/CLUSTER),Math.floor(y/CLUSTER))===2;
    const offset=(frame,x,y)=>((frame.y+(y&31))*atlas.width+frame.x+(x&31))*4;
    for(let tileY=0;tileY<height;tileY+=32)for(let tileX=0;tileX<width;tileX+=32){
        const cellX=Math.floor(tileX/32),cellY=Math.floor(tileY/32);
        const variant=variantAt(cellX,cellY,seed);
        const cornerMask=(isRoad(tileX+2,tileY+2)?1:0) |
            (isRoad(Math.min(width-1,tileX+29),tileY+2)?2:0) |
            (isRoad(Math.min(width-1,tileX+29),Math.min(height-1,tileY+29))?4:0) |
            (isRoad(tileX+2,Math.min(height-1,tileY+29))?8:0);
        const frame=manifest.frames['wang.'+cornerMask+'.'+variant];
        const road=manifest.frames['earth.'+variant];
        const grass=manifest.frames['grass.'+variant];
        const stencil=manifest.stencils[cornerMask];
        const limitY=Math.min(tileY+32,height),limitX=Math.min(tileX+32,width);
        for(let y=tileY;y<limitY;y++)for(let x=tileX;x<limitX;x++){
            const label=at(Math.floor(x/CLUSTER),Math.floor(y/CLUSTER));
            if(label!==2 && label!==1) continue;
            const roadPixel=label===2;
            // Compare cardinal neighbours from the existing 4px C# surface mask.
            const hasNeighbor=roadPixel
                ? !isRoad(Math.max(0,x-2),y)||!isRoad(Math.min(width-1,x+2),y)||
                    !isRoad(x,Math.max(0,y-2))||!isRoad(x,Math.min(height-1,y+2))
                : isRoad(Math.max(0,x-2),y)||isRoad(Math.min(width-1,x+2),y)||
                    isRoad(x,Math.max(0,y-2))||isRoad(x,Math.min(height-1,y+2));
            if(!roadPixel&&!hasNeighbor)continue; // Preserve positive forest ground.
            const wangRoad=stencil[(y&31)>>2][(x&31)>>2]==='R';
            const sample=roadPixel?(wangRoad?frame:road):(wangRoad?grass:frame);
            const from=offset(sample,x,y),to=(y*width+x)*4;
            pixels[to]=atlas.data[from];pixels[to+1]=atlas.data[from+1];
            pixels[to+2]=atlas.data[from+2];pixels[to+3]=255;
        }
    }
    return true;
}
