// Source-pose math for the shared animation lifecycle. No clock or game state.
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiplySourceMatrices(a,b){
    const out=new Array(16).fill(0);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
    return out;
}
export function invertSourceMatrix(m){
    if(!m||m.length!==16||!Array.from(m).every(Number.isFinite))throw new TypeError('Finite source matrix required');
    const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10];
    const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
    if(det<=1e-8||Math.abs(m[3])+Math.abs(m[7])+Math.abs(m[11])+Math.abs(m[15]-1)>1e-6)throw new RangeError('Proper invertible affine source matrix required');
    const out=[(e*i-f*h)/det,(f*g-d*i)/det,(d*h-e*g)/det,0,(c*h-b*i)/det,(a*i-c*g)/det,(b*g-a*h)/det,0,(b*f-c*e)/det,(c*d-a*f)/det,(a*e-b*d)/det,0,0,0,0,1];
    for(let r=0;r<3;r++)out[12+r]=-(out[r]*m[12]+out[4+r]*m[13]+out[8+r]*m[14]);
    return out;
}
const point=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
function quaternion(q){const length=Math.hypot(...q);if(!(length>1e-8))throw new RangeError('Nonzero source quaternion required');return q.map(n=>n/length);}
function slerp(a,b,t){
    a=quaternion(a);b=quaternion(b);let dot=a.reduce((s,n,i)=>s+n*b[i],0);
    if(dot<0){b=b.map(n=>-n);dot=-dot;}
    if(dot>.9995)return quaternion(a.map((n,i)=>n+(b[i]-n)*t));
    const angle=Math.acos(Math.max(-1,Math.min(1,dot))),denominator=Math.sin(angle);
    return a.map((n,i)=>(n*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/denominator);
}
function blend(a,b,t){const q=slerp(a.slice(3,7),b.slice(3,7),t);return [...a.slice(0,3).map((n,i)=>n+(b[i]-n)*t),...q,...a.slice(7,10).map((n,i)=>n+(b[i+7]-n)*t)];}
function matrixTRS(v){
    const [x,y,z,w]=quaternion(v.slice(3,7)),[sx,sy,sz]=v.slice(7,10),xx=x*x,yy=y*y,zz=z*z,xy=x*y,xz=x*z,yz=y*z,wx=w*x,wy=w*y,wz=w*z;
    return [(1-2*(yy+zz))*sx,2*(xy+wz)*sx,2*(xz-wy)*sx,0,2*(xy-wz)*sy,(1-2*(xx+zz))*sy,2*(yz+wx)*sy,0,2*(xz+wy)*sz,2*(yz-wx)*sz,(1-2*(xx+yy))*sz,0,...v.slice(0,3),1];
}
export function validateSourceSkinSurface(surface){
    const fail=message=>{throw new TypeError('Invalid source skin: '+message);};
    if(surface?.version!==1||surface.transformStride!==10||!Array.isArray(surface.bones)||!surface.bones.length||surface.bones.length>128)fail('version/bones');
    const names=new Set();
    for(const [index,b] of surface.bones.entries()){
        if(typeof b.id!=='string'||!b.id||names.has(b.id)||!Number.isSafeInteger(b.parent)||b.parent<-1||b.parent>=index||!Number.isFinite(b.length)||b.length<=0)fail('hierarchy');
        invertSourceMatrix(b.rest);if(!Array.isArray(b.local)||b.local.length!==10||!b.local.every(Number.isFinite)||b.local.slice(7).some(v=>v<=0))fail('rest transform');
        quaternion(b.local.slice(3,7));names.add(b.id);
    }
    if(!names.has(surface.rootBone)||!names.has(surface.bodyBone)||surface.bones.find(b=>b.id===surface.rootBone).parent!==-1)fail('root/body');
    if(!surface.clips||!Object.hasOwn(surface.clips,'walk'))fail('walk surface');
    let poseCount=0;
    for(const c of Object.values(surface.clips)){
        if(!Number.isSafeInteger(c.frames)||c.frames<1||!Number.isFinite(c.fps)||c.fps<=0||!Array.isArray(c.poses)||c.poses.length!==c.frames)fail('clip');
        if(c.poseGrid&&(!Number.isSafeInteger(c.poseGrid.phaseFrames)||!Number.isSafeInteger(c.poseGrid.actionFrames)||c.poseGrid.phaseFrames<2||c.poseGrid.actionFrames<2||c.poseGrid.phaseFrames*c.poseGrid.actionFrames!==c.frames||c.poseGrid.order!=='action-major'))fail('pose surface dimensions');
        for(const pose of c.poses){
            if(!Array.isArray(pose)||pose.length!==surface.bones.length*10||!pose.every(Number.isFinite))fail('pose channels');
            for(let i=0;i<pose.length;i+=10){quaternion(pose.slice(i+3,i+7));if(pose.slice(i+7,i+10).some(v=>v<=0))fail('pose scale');}
        }
        poseCount+=c.frames;
    }
    if(poseCount>4096)fail('pose budget');
    if(!Array.isArray(surface.contacts)||!surface.contacts.length||!Array.isArray(surface.contactCycles)||surface.contactCycles.length!==surface.contacts.length)fail('contacts');
    const ids=new Set(),used=new Set();
    for(const c of surface.contacts){
        if(!c.id||ids.has(c.id)||![c.upper,c.middle,c.end].every(name=>names.has(name)&&!used.has(name)))fail('contact anatomy');
        for(const name of [c.upper,c.middle,c.end])used.add(name);ids.add(c.id);
        if(surface.bones.find(b=>b.id===c.middle).parent!==surface.bones.findIndex(b=>b.id===c.upper)||surface.bones.find(b=>b.id===c.end).parent!==surface.bones.findIndex(b=>b.id===c.middle))fail('disconnected source chain');
        for(const p of [c.pole,c.restContactPoint,...(c.restHull??[])])if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))fail('source support');
        if(c.restHull?.length<3||![c.upperLength,c.lowerLength].every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(c.limits)||c.limits.length!==2||!c.limits.every(Number.isFinite)||c.limits[0]<0||c.limits[1]>180||c.limits[0]>c.limits[1])fail('contact lengths/limits');
    }
    for(const c of surface.contactCycles)if(!ids.has(c.id)||!Number.isFinite(c.phaseOffset)||c.phaseOffset<0||c.phaseOffset>=1||!Number.isFinite(c.stanceFraction)||c.stanceFraction<=0||c.stanceFraction>1||!Array.isArray(c.neutral)||c.neutral.length!==3||!c.neutral.every(Number.isFinite)||!Number.isFinite(c.liftMetres)||c.liftMetres<0)fail('contact cycles');
    if(new Set(surface.contactCycles.map(c=>c.id)).size!==ids.size)fail('duplicate contact cycle');
    if(!surface.massWeights||!Object.keys(surface.massWeights).length)fail('mass model');
    for(const [name,mass] of Object.entries(surface.massWeights))if(!names.has(name)||!Number.isFinite(mass)||mass<=0)fail('mass model');
    if(![surface.strideMetres,surface.unitsPerPixel].every(v=>Number.isFinite(v)&&v>0)||![surface.authoringEnvelope?.maxContactExcursion,surface.authoringEnvelope?.maxBodyTranslation,surface.minimumSupportMarginMetres].every(v=>Number.isFinite(v)&&v>=0))fail('explicit source envelope');
    return surface;
}
export function sampleSourceSkinSurface(surface,{clip,gaitPhase,actionProgress=0}){
    if(!Number.isFinite(gaitPhase)||!Number.isFinite(actionProgress)||actionProgress<0||actionProgress>1||!Object.hasOwn(surface.clips,clip))throw new TypeError('Finite registered source surface sample required');
    const spec=surface.clips[clip],count=spec.poseGrid?.phaseFrames??spec.frames,phase=(gaitPhase%1+1)%1,position=phase*count,g0=Math.floor(position),g1=(g0+1)%count,gt=position-g0;
    const action=spec.poseGrid?actionProgress*(spec.poseGrid.actionFrames-1):0,a0=Math.floor(action),a1=spec.poseGrid?Math.min(spec.poseGrid.actionFrames-1,a0+1):0,at=action-a0;
    const matrices=[],sourceBones=Object.create(null);
    for(const [index,bone] of surface.bones.entries()){
        const channels=(row,gait)=>spec.poses[row*count+gait].slice(index*10,index*10+10);
        const local=matrixTRS(blend(blend(channels(a0,g0),channels(a0,g1),gt),blend(channels(a1,g0),channels(a1,g1),gt),at));
        const global=bone.parent<0?local:multiplySourceMatrices(matrices[bone.parent],local);matrices.push(global);
        sourceBones[bone.id]={head:global.slice(12,15),tail:point(global,[0,bone.length,0]),matrix:global};
    }
    const sourceContacts=Object.create(null);
    for(const c of surface.contacts){
        const bone=surface.bones.find(b=>b.id===c.end),skin=multiplySourceMatrices(sourceBones[c.end].matrix,invertSourceMatrix(bone.rest)),cycle=surface.contactCycles.find(p=>p.id===c.id),q=(phase+cycle.phaseOffset)%1;
        sourceContacts[c.id]={...c,sourceContact:point(skin,c.restContactPoint),footprint:c.restHull.map(p=>point(skin,p)),planted:q<cycle.stanceFraction};
    }
    const total=Object.values(surface.massWeights).reduce((a,b)=>a+b,0),center=[0,0,0];
    for(const [id,mass] of Object.entries(surface.massWeights))for(let axis=0;axis<3;axis++)center[axis]+=(sourceBones[id].head[axis]+sourceBones[id].tail[axis])*mass/(2*total);
    return {sourceBones,sourceContacts,massCenter:center,balance:'supported',matrices};
}
function fromTo(from,to){
    const a=from.map(n=>n/Math.hypot(...from)),b=to.map(n=>n/Math.hypot(...to)),dot=a.reduce((s,n,i)=>s+n*b[i],0);
    let q=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],1+dot];
    if(dot<-.999999){const seed=Math.abs(a[0])<.9?[1,0,0]:[0,1,0];q=[a[1]*seed[2]-a[2]*seed[1],a[2]*seed[0]-a[0]*seed[2],a[0]*seed[1]-a[1]*seed[0],0];}
    return matrixTRS([0,0,0,...quaternion(q),1,1,1]);
}
/** Exact bind-roll segment matrices for the corrected complete source pose.
 * Returned global matrices are presentation data for the existing GPU engine. */
export function sourceSkinPoseMatrices(surface,base,posed){
    const segmentBones=new Set(surface.contacts.flatMap(c=>[c.upper,c.middle])),endBones=new Map(surface.contacts.map(c=>[c.end,c.id]));
    const out=new Float32Array(surface.bones.length*16);
    for(const [index,bone] of surface.bones.entries()){
        const desired=posed.sourceBones[bone.id];if(!desired)throw new TypeError('Present source skin bone required');
        let m;
        if(segmentBones.has(bone.id)){
            const axis=[bone.rest[4],bone.rest[5],bone.rest[6]],direction=desired.tail.map((n,i)=>n-desired.head[i]);
            m=multiplySourceMatrices(fromTo(axis,direction),bone.rest);
        }else{
            m=[...base.sourceBones[bone.id].matrix];
            const contact=endBones.has(bone.id)?posed.sourceContacts[endBones.get(bone.id)]:null;
            if(contact?.rotationDelta){
                const r=contact.rotationDelta;m=multiplySourceMatrices([r[0],r[3],r[6],0,r[1],r[4],r[7],0,r[2],r[5],r[8],0,0,0,0,1],m);
            }
        }
        for(let axis=0;axis<3;axis++)m[12+axis]=desired.head[axis];out.set(m,index*16);
    }
    return out;
}
