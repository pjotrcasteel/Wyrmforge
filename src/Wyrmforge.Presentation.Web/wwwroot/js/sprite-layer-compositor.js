// Compose existing atlas pixels through named semantic regions. No new art poses.
export function createSpriteLayerCompositor(metadata,clips,images,options={}){
    const size=metadata.canvasSize;
    const maxTiles=options.maxTiles??96;
    const tiles=new Map(),paths=new WeakMap();
    const makeCanvas=options.makeCanvas??(()=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):Object.assign(document.createElement('canvas'),{width:size,height:size}));
    const stats={hits:0,misses:0,evictions:0,tiles:0,allocatedTiles:0};
    function regionPath(frame,name){
        let regions=paths.get(frame);if(!regions){regions=Object.create(null);paths.set(frame,regions);}
        if(!regions[name]){
            const runs=Object.hasOwn(frame.regions,name)?frame.regions[name]:null;if(!runs)throw new Error('Unknown sprite region: '+name);
            const p=new Path2D();for(const [y,x,width] of runs)p.rect(x,y,width,1);regions[name]=p;
        }
        return regions[name];
    }
    function source(ctx,clipName,index,direction){
        const clip=clips[clipName],row=metadata.directions.indexOf(direction);
        const pad=(size-(clip?.cell??size))/2;
        if(!clip||row<0||!Number.isSafeInteger(index)||index<0||index>=clip.frames||!images.get(clipName))throw new RangeError('Unknown sprite source pose');
        const rectangle=options.sourceRectangle?.(clipName,index,direction)??[index*clip.cell,row*clip.cell,clip.cell,clip.cell];
        ctx.drawImage(images.get(clipName),...rectangle,pad,pad,clip.cell,clip.cell);
    }
    function compose(sample){
        const parts=sample.parts;
        if(parts&&(!Array.isArray(parts)||!parts.length))throw new TypeError('Sprite parts must be a nonempty ordered array');
        if(parts)for(const part of parts){
            const m=part.transform;
            if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite)||m[0]*m[3]-m[1]*m[2]<=1e-8)throw new TypeError('Invalid semantic sprite part transform');
            const clip=clips[part.clip],frame=metadata.clips[part.clip]?.[part.direction]?.[part.frame];
            if(!frame||!clip||!Number.isSafeInteger(part.frame)||part.frame<0||part.frame>=clip.frames||!images.get(part.clip))throw new RangeError('Unknown semantic sprite source pose');
            regionPath(frame,part.region); // Fail before evicting or modifying a cached tile.
        }
        const key=parts?'parts:'+parts.map(p=>[p.clip,p.frame,p.direction,p.region,...p.transform].join(',')).join(';'):[sample.direction,sample.baseClip,sample.baseFrame,sample.clip,sample.frame,sample.baseRegion,sample.actionRegion,sample.useBasePose].join(':');
        if(tiles.has(key)){const tile=tiles.get(key);tiles.delete(key);tiles.set(key,tile);stats.hits++;return tile;}
        stats.misses++;
        let tile;
        if(tiles.size>=maxTiles){const oldest=tiles.keys().next().value;tile=tiles.get(oldest);tiles.delete(oldest);stats.evictions++;}
        else{tile=makeCanvas();stats.allocatedTiles++;}
        const ctx=tile.getContext('2d');ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;
        if(parts){
            for(const part of parts){
                const frame=metadata.clips[part.clip]?.[part.direction]?.[part.frame];
                if(!frame)throw new RangeError('Unknown semantic sprite source pose');
                ctx.save();try{ctx.transform(...part.transform);ctx.clip(regionPath(frame,part.region));source(ctx,part.clip,part.frame,part.direction);}finally{ctx.restore();}
            }
        }else if(sample.useBasePose){source(ctx,sample.baseClip,sample.baseFrame,sample.direction);}
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
