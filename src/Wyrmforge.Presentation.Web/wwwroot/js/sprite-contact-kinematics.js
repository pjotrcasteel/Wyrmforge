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
    const rootTarget=input.rootTarget??upper.head;
    if(!Array.isArray(rootTarget)||rootTarget.length!==3||!rootTarget.every(Number.isFinite))throw new TypeError('Finite posed chain root required');
    const rootShift=Math.hypot(...rootTarget.map((v,i)=>v-upper.head[i]));
    if(input.maxRootCorrection!=null&&(!Number.isFinite(input.maxRootCorrection)||input.maxRootCorrection<0))throw new TypeError('Finite nonnegative pelvis correction budget required');
    if(rootShift>(input.maxRootCorrection??0))throw new RangeError('Source pelvis correction budget exceeded');
    const ankle=end.head.map((v,i)=>targetContact[i]+v-sourceContact[i]);
    const solved=solveTwoBoneContact({root:rootTarget,target:ankle,pole:input.pole,
        upperLength:input.upperLength,lowerLength:input.lowerLength,limits:input.limits});
    const rootPixel=projected(rootTarget,projection),sourceRootPixel=projected(upper.head,projection),jointPixel=projected(solved.middle,projection),anklePixel=projected(ankle,projection);
    const oldAnklePixel=projected(end.head,projection);
    const identity=[1,0,0,1,0,0];
    return {middle:solved.middle,ankle,flexDegrees:solved.flexDegrees,correctionDistance:correction,
        upperTransform:correction===0&&rootShift===0?[...identity]:segmentTransform(sourceRootPixel,projected(upper.tail,projection),rootPixel,jointPixel),
        lowerTransform:correction===0&&rootShift===0?[...identity]:segmentTransform(projected(lower.head,projection),projected(lower.tail,projection),jointPixel,anklePixel),
        endTransform:[1,0,0,1,anklePixel[0]-oldAnklePixel[0],anklePixel[1]-oldAnklePixel[1]],
        projectedContact:projected(targetContact,projection)};
}

/** Invert a calibrated orthographic ground plane. A screen-facing projection
 * may reverse handedness; that is distinct from reflecting a skeletal bind. */
export function sourceGroundPointFromPixel(pixel,groundZ,projection){
    if(!Array.isArray(pixel)||pixel.length!==2||!pixel.every(Number.isFinite)||!Number.isFinite(groundZ)||!Array.isArray(projection)||projection.length!==8||!projection.every(Number.isFinite))throw new TypeError('Finite calibrated ground projection required');
    const [a,b,c,d,e,f,g,h]=projection,det=a*f-b*e,scale=Math.hypot(a,b)*Math.hypot(e,f);
    if(scale===0||Math.abs(det)<=scale*1e-8)throw new RangeError('Ground projection is singular or edge-on');
    const x=pixel[0]-c*groundZ-d,y=pixel[1]-g*groundZ-h;
    return [(x*f-b*y)/det,(a*y-e*x)/det,groundZ];
}

/** Shared contact scheduling primitive. The owning animation lifecycle supplies
 * absolute C# time and unwrapped support phase. No independent timer, AI, forces,
 * root integration or gameplay outcomes. Targets are ground XY + normalized lift;
 * source-space conversion, fixed-length solve and balance acceptance are separate.
 */
export function updateGroundContactTargets(state,patterns,intent){
    const {timestamp,phaseCycles,world,velocity,stride,nominalPhaseRate}=intent;
    if(timestamp<0||phaseCycles<0||![timestamp,phaseCycles,world?.x,world?.y,velocity?.x,velocity?.y,stride,nominalPhaseRate].every(Number.isFinite)||stride<=0||nominalPhaseRate<=0||!Array.isArray(patterns)||!patterns.length)throw new TypeError('Finite authoritative motion and contact patterns required');
    const ids=new Set();
    for(const p of patterns){
        if(typeof p.id!=='string'||!p.id||ids.has(p.id)||!Number.isFinite(p.phaseOffset)||p.phaseOffset<0||p.phaseOffset>=1||!Number.isFinite(p.stanceFraction)||p.stanceFraction<=0||p.stanceFraction>1||![p.neutral?.x,p.neutral?.y].every(Number.isFinite))throw new TypeError('Invalid actual contact-cycle descriptor');
        ids.add(p.id);
    }
    const signature=JSON.stringify([...ids].sort());
    if(state.signature!=null&&state.signature!==signature)throw new TypeError('Contact anatomy changed; fresh animation state required');
    if(state.timestamp!=null&&(timestamp<state.timestamp||phaseCycles<state.phaseCycles))throw new RangeError('Contact replay seek requires fresh state');
    if(state.signature==null)Object.assign(state,{signature,contacts:Object.create(null),timestamp,phaseCycles,world:{...world},stopped:false,targets:Object.create(null)});
    const stopped=Boolean(intent.paused||intent.frozen),dx=world.x-state.world.x,dy=world.y-state.world.y;
    if(stopped&&phaseCycles!==state.phaseCycles)throw new RangeError('Paused/frozen support phase cannot advance');
    if(stopped&&Object.keys(state.targets).length){
        const transported=dx!==0||dy!==0;
        for(const p of patterns){const contact=state.contacts[p.id];for(const key of ['anchor','goal','liftStart'])if(contact[key]){contact[key].x+=dx;contact[key].y+=dy;}const t=state.targets[p.id];t.x+=dx;t.y+=dy;t.transported=transported;t.planted=transported?false:contact.planted;}
        state.timestamp=timestamp;state.phaseCycles=phaseCycles;state.world={...world};state.stopped=true;
        return {targets:state.targets,plannedLandings:[],transported};
    }
    const dt=state.stopped?0:timestamp-state.timestamp,phaseDelta=phaseCycles-state.phaseCycles;
    const speed=Math.hypot(velocity.x,velocity.y),direction=speed>1e-8?{x:velocity.x/speed,y:velocity.y/speed}:{x:0,y:0};
    const rate=dt>0&&phaseDelta>0?phaseDelta/dt:nominalPhaseRate,planned=[];
    for(const p of patterns){
        const unwrapped=phaseCycles+p.phaseOffset,cycle=Math.floor(unwrapped),q=unwrapped-cycle,planted=q<p.stanceFraction;
        let contact=state.contacts[p.id];
        const targetAtLanding=()=>({x:world.x+p.neutral.x+velocity.x*(1-q)/rate+direction.x*stride*p.stanceFraction*.5,
            y:world.y+p.neutral.y+velocity.y*(1-q)/rate+direction.y*stride*p.stanceFraction*.5});
        if(!contact){
            const initial=intent.initialTargets?.[p.id];
            const point=initial?{x:initial.x,y:initial.y}:{x:world.x+p.neutral.x+direction.x*stride*(p.stanceFraction*.5-q),y:world.y+p.neutral.y+direction.y*stride*(p.stanceFraction*.5-q)};
            if(![point.x,point.y].every(Number.isFinite))throw new TypeError('Invalid source contact initialization');
            contact={cycle,planted,anchor:{...point},liftStart:{...point},goal:planted?targetAtLanding():{...point}};state.contacts[p.id]=contact;
        }
        if(planted){
            if(!contact.planted||contact.cycle!==cycle)contact.anchor={...contact.goal};
            state.targets[p.id]={x:contact.anchor.x,y:contact.anchor.y,lift:0,planted:true,transported:false};
        }else{
            if(contact.planted||contact.cycle!==cycle)contact.liftStart={x:state.targets[p.id]?.x??contact.anchor.x,y:state.targets[p.id]?.y??contact.anchor.y};
            const desired=targetAtLanding(),gx=desired.x-contact.goal.x,gy=desired.y-contact.goal.y,distance=Math.hypot(gx,gy);
            // Maximum cubic swing derivative, derived from stance/swing ratio.
            const ratio=1.5/(1-p.stanceFraction);
            const limit=Math.max(speed,stride*nominalPhaseRate)*ratio*dt;
            const fraction=distance>0?Math.min(1,limit/distance):0;
            contact.goal.x+=gx*fraction;contact.goal.y+=gy*fraction;
            const s=(q-p.stanceFraction)/(1-p.stanceFraction),ease=s*s*(3-2*s);
            state.targets[p.id]={x:contact.liftStart.x+(contact.goal.x-contact.liftStart.x)*ease,
                y:contact.liftStart.y+(contact.goal.y-contact.liftStart.y)*ease,lift:Math.sin(Math.PI*s),planted:false,transported:false};
            planned.push({id:p.id,point:{...contact.goal},remainingSeconds:(1-q)/rate});
        }
        contact.planted=planted;contact.cycle=cycle;
    }
    state.timestamp=timestamp;state.phaseCycles=phaseCycles;state.world={...world};state.stopped=false;
    return {targets:state.targets,plannedLandings:planned,transported:false};
}
