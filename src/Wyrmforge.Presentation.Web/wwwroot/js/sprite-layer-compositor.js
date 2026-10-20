// Compose existing atlas pixels through named semantic regions. No new art poses.
export function createSpriteLayerCompositor(metadata,clips,images,options={}){
    const size=metadata.canvasSize;
    const maxTiles=options.maxTiles??96;
    const tiles=new Map(),paths=new WeakMap();
    const makeCanvas=options.makeCanvas??(()=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):Object.assign(document.createElement('canvas'),{width:size,height:size}));
    const stats={hits:0,misses:0,evictions:0,tiles:0,allocatedTiles:0};
    function regionPath(frame,name){
        let regions=paths.get(frame);if(!regions){regions={};paths.set(frame,regions);}
        if(!regions[name]){
            const runs=frame.regions[name];if(!runs)throw new Error('Unknown sprite region: '+name);
            const p=new Path2D();for(const [y,x,width] of runs)p.rect(x,y,width,1);regions[name]=p;
        }
        return regions[name];
    }
    function source(ctx,clipName,index,direction){
        const clip=clips[clipName],row=metadata.directions.indexOf(direction),pad=(size-clip.cell)/2;
        ctx.drawImage(images.get(clipName),index*clip.cell,row*clip.cell,clip.cell,clip.cell,pad,pad,clip.cell,clip.cell);
    }
    function compose(sample){
        const key=[sample.direction,sample.baseClip,sample.baseFrame,sample.clip,sample.frame,sample.baseRegion,sample.actionRegion,sample.useBasePose].join(':');
        if(tiles.has(key)){const tile=tiles.get(key);tiles.delete(key);tiles.set(key,tile);stats.hits++;return tile;}
        stats.misses++;
        let tile;
        if(tiles.size>=maxTiles){const oldest=tiles.keys().next().value;tile=tiles.get(oldest);tiles.delete(oldest);stats.evictions++;}
        else{tile=makeCanvas();stats.allocatedTiles++;}
        const ctx=tile.getContext('2d');ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;
        if(sample.useBasePose){source(ctx,sample.baseClip,sample.baseFrame,sample.direction);}
        else{
            const base=metadata.clips[sample.baseClip][sample.direction][sample.baseFrame];
            const action=metadata.clips[sample.clip][sample.direction][sample.frame];
            ctx.save();ctx.clip(regionPath(base,sample.baseRegion));source(ctx,sample.baseClip,sample.baseFrame,sample.direction);ctx.restore();
            // Round at native pixel resolution: no blurry subpixel waist join.
            ctx.save();ctx.translate(Math.round(base.attachment[0]-action.attachment[0]),Math.round(base.attachment[1]-action.attachment[1]));
            ctx.clip(regionPath(action,sample.actionRegion));source(ctx,sample.clip,sample.frame,sample.direction);ctx.restore();
        }
        tiles.set(key,tile);
        stats.tiles=tiles.size;return tile;
    }
    return {compose,stats,clear(){tiles.clear();stats.tiles=0;},estimatedBytes(){return tiles.size*size*size*4;}};
}
