// Sparse animation kinematics shared by contact regions; no gameplay physics,
// integration, AI or time loop. Call only for declared present source chains.
// All inputs must already share one coordinate space and scale.
export function solveTwoBoneContact(input, output={middle:[0,0,0],flexDegrees:0}) {
    const {root,target,pole,upperLength:a,lowerLength:b,limits}=input;
    if(![root,target,pole].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||
       ![a,b].every(n=>Number.isFinite(n)&&n>0)||!Array.isArray(limits)||limits.length!==2||
       !limits.every(Number.isFinite)||limits[0]<0||limits[1]>180||limits[0]>limits[1])
        throw new TypeError('Invalid source contact chain');
    const dx=target[0]-root[0],dy=target[1]-root[1],dz=target[2]-root[2];
    const distance=Math.hypot(dx,dy,dz),epsilon=Math.max(a,b)*1e-6;
    if(distance<=Math.abs(a-b)+epsilon||distance>=a+b-epsilon)
        throw new RangeError('Unreachable or singular source contact target');
    const x=dx/distance,y=dy/distance,z=dz/distance;
    const px=pole[0]-root[0],py=pole[1]-root[1],pz=pole[2]-root[2],dot=px*x+py*y+pz*z;
    const bx=px-dot*x,by=py-dot*y,bz=pz-dot*z,bendLength=Math.hypot(bx,by,bz);
    if(bendLength<=epsilon)throw new RangeError('Singular source contact pole');
    const flex=180-Math.acos(Math.max(-1,Math.min(1,(a*a+b*b-distance*distance)/(2*a*b))))*180/Math.PI;
    if(flex<limits[0]||flex>limits[1])throw new RangeError('Source contact joint limit exceeded');
    const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
    const middle=output.middle;
    if(!Array.isArray(middle)||middle.length!==3)throw new TypeError('Contact output requires a reusable three-vector');
    middle[0]=root[0]+x*along+bx/bendLength*height;
    middle[1]=root[1]+y*along+by/bendLength*height;
    middle[2]=root[2]+z*along+bz/bendLength*height;
    output.flexDegrees=flex;
    return output;
}

function projected(point,matrix){
    return [matrix[0]*point[0]+matrix[1]*point[1]+matrix[2]*point[2]+matrix[3],
        matrix[4]*point[0]+matrix[5]*point[1]+matrix[6]*point[2]+matrix[7]];
}
function segmentTransform(fromHead,fromTail,toHead,toTail){
    const x=fromTail[0]-fromHead[0],y=fromTail[1]-fromHead[1],length=Math.hypot(x,y);
    const nx=toTail[0]-toHead[0],ny=toTail[1]-toHead[1],nextLength=Math.hypot(nx,ny);
    if(length<1e-6||nextLength<1e-6)throw new RangeError('Source region is end-on; another authored view is required');
    // Scale only along the projected segment; retain the authored pixel width.
    const ux=x/length,uy=y/length,vx=-uy,vy=ux;
    const ratio=nextLength/length,ax=nx/nextLength,ay=ny/nextLength,bx=-ay,by=ax;
    const a=ratio*ax*ux+bx*vx,b=ratio*ay*ux+by*vx,c=ratio*ax*uy+bx*vy,d=ratio*ay*uy+by*vy;
    return [a,b,c,d,toHead[0]-a*fromHead[0]-c*fromHead[1],toHead[1]-b*fromHead[0]-d*fromHead[1]];
}
/** Turn one declared source chain into compositor transforms. Caller supplies
 * real source-space surface points, a calibrated orthographic projection and
 * an explicit correction bound. No target/contact/AI scheduling is performed.
 * Failure must remain observable; do not clamp reach or invent absent limbs.
 */
export function retargetSourceContactRegion(input){
    const {upper,lower,end,sourceContact,targetContact,projection,maxCorrection}=input;
    if(![upper?.head,upper?.tail,lower?.head,lower?.tail,end?.head,sourceContact,targetContact].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||
       !Array.isArray(projection)||projection.length!==8||!projection.every(Number.isFinite)||!Number.isFinite(maxCorrection)||maxCorrection<0)
        throw new TypeError('Complete source contact region and bounded projection required');
    const correction=Math.hypot(...targetContact.map((v,i)=>v-sourceContact[i]));
    if(correction>maxCorrection)throw new RangeError('Source contact correction budget exceeded');
    const ankle=end.head.map((v,i)=>targetContact[i]+v-sourceContact[i]);
    const solved=solveTwoBoneContact({root:upper.head,target:ankle,pole:input.pole,
        upperLength:input.upperLength,lowerLength:input.lowerLength,limits:input.limits});
    const rootPixel=projected(upper.head,projection),jointPixel=projected(solved.middle,projection),anklePixel=projected(ankle,projection);
    const oldAnklePixel=projected(end.head,projection);
    const identity=[1,0,0,1,0,0];
    return {middle:solved.middle,ankle,flexDegrees:solved.flexDegrees,correctionDistance:correction,
        upperTransform:correction===0?[...identity]:segmentTransform(rootPixel,projected(upper.tail,projection),rootPixel,jointPixel),
        lowerTransform:correction===0?[...identity]:segmentTransform(projected(lower.head,projection),projected(lower.tail,projection),jointPixel,anklePixel),
        endTransform:[1,0,0,1,anklePixel[0]-oldAnklePixel[0],anklePixel[1]-oldAnklePixel[1]],
        projectedContact:projected(targetContact,projection)};
}
