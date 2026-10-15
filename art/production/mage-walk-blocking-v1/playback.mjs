export function frameAtTime(seconds, atlas) {
    const frames=atlas.framesPerDirection;
    return ((Math.floor(seconds*atlas.framesPerSecond)%frames)+frames)%frames;
}
export function resolveDirection(x,y,previous='S') {
    if(!Number.isFinite(x)||!Number.isFinite(y)) throw Error('Direction must be finite');
    if(Math.hypot(x,y)<1e-6) return previous;
    return ['S','SE','E','NE','N','NW','W','SW'][(Math.round(Math.atan2(x,y)/(Math.PI/4))+8)%8];
}
export function sourceRectangle(atlas,direction,frame) {
    const row=atlas.directions.find(d=>d.name===direction)?.row;
    if(row===undefined)throw Error(`Unknown direction ${direction}`);
    if(!Number.isInteger(frame)||frame<0||frame>=atlas.framesPerDirection)throw Error(`Invalid frame ${frame}`);
    return {x:frame*atlas.cell.width,y:row*atlas.cell.height,width:atlas.cell.width,height:atlas.cell.height};
}
