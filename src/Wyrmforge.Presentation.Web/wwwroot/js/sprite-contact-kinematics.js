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

/** Repose a complete source skeleton against caller-owned support targets.
 * This is an opt-in authoring/study primitive, not contact scheduling or a
 * replacement for the one-pixel raster correction. Its output must pass an
 * independent saved-skin replay before an adapter can render it as supported.
 * The source body/action remains coupled; every load pass re-solves all limbs
 * and recomputes the mass proxy from the resulting whole-body bone segments.
 */
export function solveSupportedSourcePose(frame,targets,options){
    const {massWeights,rootBone,maxContactExcursion,maxBodyTranslation,minimumSupportMargin=0}=options;
    if(!frame?.sourceBones||!frame.sourceContacts||!massWeights||!Object.hasOwn(frame.sourceBones,rootBone)||
       ![maxContactExcursion,maxBodyTranslation,minimumSupportMargin].every(n=>Number.isFinite(n)&&n>=0))throw new TypeError('Explicit source pose anatomy and bounded authoring envelope required');
    const bones=frame.sourceBones,chains=Object.entries(frame.sourceContacts),used=new Set();
    for(const [id,c] of chains){
        const target=Object.hasOwn(targets,id)?targets[id]:null;
        if(!target||typeof target.planted!=='boolean'||!Array.isArray(target.point)||target.point.length!==3||!target.point.every(Number.isFinite))throw new TypeError('Finite authored source support target required: '+id);
        if(!Array.isArray(c.sourceContact)||c.sourceContact.length!==3||!c.sourceContact.every(Number.isFinite))throw new TypeError('Actual source surface required');
        if(Math.hypot(...target.point.map((v,i)=>v-c.sourceContact[i]))>maxContactExcursion)throw new RangeError('Authored source pose excursion exceeded');
        for(const name of [c.upper,c.middle,c.end]){
            if(used.has(name)||name===rootBone||!Object.hasOwn(bones,name))throw new TypeError('Distinct present source contact chains required');
            used.add(name);
        }
        if(!Array.isArray(c.footprint)||c.footprint.length<3)throw new TypeError('Actual source support footprint required');
        if(target.rotation){
            const r=target.rotation;
            if(!Array.isArray(r)||r.length!==9||!r.every(Number.isFinite))throw new TypeError('Proper source contact rotation required');
            const columns=[[r[0],r[3],r[6]],[r[1],r[4],r[7]],[r[2],r[5],r[8]]];
            const det=r[0]*(r[4]*r[8]-r[5]*r[7])-r[1]*(r[3]*r[8]-r[5]*r[6])+r[2]*(r[3]*r[7]-r[4]*r[6]);
            if(Math.abs(det-1)>1e-6||columns.some(c=>Math.abs(Math.hypot(...c)-1)>1e-6)||Math.abs(columns[0].reduce((s,n,i)=>s+n*columns[1][i],0))+Math.abs(columns[0].reduce((s,n,i)=>s+n*columns[2][i],0))+Math.abs(columns[1].reduce((s,n,i)=>s+n*columns[2][i],0))>1e-6)throw new RangeError('Source contact rotation may not stretch or reflect anatomy');
        }
        if(options.supportWeights&&(!Object.hasOwn(options.supportWeights,id)||!Number.isFinite(options.supportWeights[id])||options.supportWeights[id]<0||options.supportWeights[id]>1||!target.planted&&options.supportWeights[id]!==0))throw new TypeError('Explicit planted source load weights required');
    }
    let totalMass=0;
    for(const [name,weight] of Object.entries(massWeights)){
        if(!Object.hasOwn(bones,name)||!Number.isFinite(weight)||weight<=0)throw new TypeError('Present source segment masses required');
        totalMass+=weight;
    }
    if(!(totalMass>0))throw new TypeError('Positive whole-body source mass required');
    const plus=(point,delta)=>point.map((v,i)=>v+delta[i]);
    const joint=options.balanceJoint;
    if(joint&&(!Object.hasOwn(bones,joint.bone)||!Array.isArray(joint.descendants)||!joint.descendants.includes(joint.bone)||joint.descendants.some(id=>!Object.hasOwn(bones,id)||used.has(id)||id===rootBone)||!Number.isFinite(joint.maxRadians)||joint.maxRadians<=0||joint.maxRadians>Math.PI/12))throw new TypeError('Bounded non-contact source balance joint required');
    let bodyShift=[0,0,0],bodyTilt=[0,0],posed,contacts,center,support;
    for(let pass=0;pass<=(options.fitReach?48:10);pass++){
        if(options.fitReach){
            // Project the coherent body into all declared leg reach spheres.
            // The source's minimum flexion supplies the reach reserve; never
            // stretch a segment or silently expand its authoring envelope.
            for(let iteration=0;iteration<12;iteration++)for(const [id,c] of chains){
                const target=targets[id],r=target.rotation;
                if(options.fitSwingReach&&!target.planted)continue;
                const offset=bones[c.end].head.map((n,i)=>n-c.sourceContact[i]);
                const ankle=target.point.map((n,i)=>n+(r?offset.reduce((s,v,j)=>s+r[i*3+j]*v,0):offset[i]));
                const hip=plus(bones[c.upper].head,bodyShift),delta=ankle.map((n,i)=>n-hip[i]),length=Math.hypot(...delta);
                const maximum=Math.sqrt(c.upperLength**2+c.lowerLength**2+2*c.upperLength*c.lowerLength*Math.cos(Math.max(.1,c.limits[0])*Math.PI/180))*(1-1e-5);
                if(length>maximum)bodyShift=bodyShift.map((n,i)=>n+delta[i]*(length-maximum)/length);
            }
            if(Math.hypot(...bodyShift)>maxBodyTranslation)throw new RangeError('Authored source reach/body translation envelope exceeded');
        }
        posed=Object.create(null);contacts=Object.create(null);const footprint=[];
        for(const [name,bone] of Object.entries(bones)){
            if(![bone.head,bone.tail].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw new TypeError('Finite complete source skeleton required');
            const shift=name===rootBone?[0,0,0]:bodyShift;
            posed[name]={head:plus(bone.head,shift),tail:plus(bone.tail,shift)};
        }
        for(const [id,c] of chains){
            let target=targets[id];const rotation=target.rotation;
            if(options.fitSwingReach&&!target.planted){
                const offset=bones[c.end].head.map((n,i)=>n-c.sourceContact[i]),ankle=target.point.map((n,i)=>n+(rotation?offset.reduce((s,v,j)=>s+rotation[i*3+j]*v,0):offset[i]));
                const root=posed[c.upper].head,delta=ankle.map((n,i)=>n-root[i]),length=Math.hypot(...delta);
                const reach=angle=>Math.sqrt(c.upperLength**2+c.lowerLength**2+2*c.upperLength*c.lowerLength*Math.cos(angle*Math.PI/180));
                const minimum=reach(c.limits[1])*(1+1e-5),maximum=reach(Math.max(.1,c.limits[0]))*(1-1e-5),clamped=Math.max(minimum,Math.min(maximum,length));
                if(Math.abs(clamped-length)>1e-9){if(length<1e-8)throw new RangeError('Singular source swing target');target={...target,point:target.point.map((n,i)=>n+delta[i]*(clamped/length-1)),swingReachCorrection:Math.abs(clamped-length)};}
            }
            const delta=target.point.map((n,i)=>n-c.sourceContact[i]);
            const move=point=>rotation?target.point.map((v,row)=>v+point.reduce((s,n,col)=>s+rotation[row*3+col]*(n-c.sourceContact[col]),0)):plus(point,delta);
            const ankle=move(bones[c.end].head),root=posed[c.upper].head;
            let solved;
            try{solved=solveTwoBoneContact({root,target:ankle,pole:plus(c.pole,bodyShift),upperLength:c.upperLength,lowerLength:c.lowerLength,limits:c.limits});}
            catch(error){error.sourcePoseFailure={contactId:id,root,target:ankle,bodyShift:[...bodyShift],supportPoint:target.point};throw error;}
            posed[c.upper]={head:root,tail:[...solved.middle]};
            posed[c.middle]={head:[...solved.middle],tail:ankle};
            posed[c.end]={head:ankle,tail:move(bones[c.end].tail)};
            const patch=c.footprint.map(move);
            if(target.planted)footprint.push(...patch.map(p=>p.slice(0,2)));
            contacts[id]={...c,sourceContact:[...target.point],planted:target.planted,footprint:patch,flexDegrees:solved.flexDegrees,...(target.swingReachCorrection?{swingReachCorrection:target.swingReachCorrection}:{}),...(rotation?{rotationDelta:[...rotation]}:{})};
        }
        if(!footprint.length)throw new RangeError('Supported source pose has no actual ground support');
        if(joint&&Math.hypot(...bodyTilt)>1e-12){
            const angle=Math.hypot(...bodyTilt),x=bodyTilt[0]/angle,y=bodyTilt[1]/angle,c=Math.cos(angle),s=Math.sin(angle),k=1-c;
            const r=[c+x*x*k,x*y*k,y*s,x*y*k,c+y*y*k,-x*s,-y*s,x*s,c],pivot=posed[joint.bone].head;
            const rotate=p=>pivot.map((v,row)=>v+p.reduce((sum,n,col)=>sum+r[row*3+col]*(n-pivot[col]),0));
            for(const id of joint.descendants){posed[id]={head:rotate(posed[id].head),tail:rotate(posed[id].tail),rotationDelta:r};}
        }
        center=[0,0,0];
        for(const [name,weight] of Object.entries(massWeights))for(let axis=0;axis<3;axis++)center[axis]+=(posed[name].head[axis]+posed[name].tail[axis])*weight/(2*totalMass);
        const actualSupport=measureSourceSupport(footprint,center.slice(0,2));
        let loadFootprint=footprint;
        if(options.supportWeights){
            const sum=Object.values(options.supportWeights).reduce((s,n)=>s+n,0);if(!(sum>0))throw new RangeError('Source pose has no positive ground load');
            loadFootprint=[[0,0]];
            for(const [id,c] of Object.entries(contacts)){
                const weight=options.supportWeights[id]/sum;if(!weight)continue;
                const candidates=loadFootprint.flatMap(a=>c.footprint.map(p=>[a[0]+p[0]*weight,a[1]+p[1]*weight]));
                loadFootprint=measureSourceSupport(candidates,[0,0]).hull;
            }
        }
        support=measureSourceSupport(loadFootprint,center.slice(0,2));
        if(support.staticallySupported&&support.margin>=minimumSupportMargin&&actualSupport.margin>=minimumSupportMargin)return {...frame,sourceBones:posed,sourceContacts:contacts,massCenter:center,
            sourceRepose:{bodyShift:[...bodyShift],balanceTiltRadians:[...bodyTilt],support:actualSupport,loadSupport:support,passes:pass+1,measurement:'recomputed whole-body source segment mass; saved-skin replay required'}};
        const centroid=footprint.reduce((s,p)=>[s[0]+p[0]/footprint.length,s[1]+p[1]/footprint.length],[0,0]);
        let dx=(centroid[0]-center[0])*.65,dy=(centroid[1]-center[1])*.65;
        if(options.fitReach&&support.dimension===2){
            const desired=[...center];
            for(let iteration=0;iteration<12;iteration++)for(let i=0;i<support.hull.length;i++){
                const a=support.hull[i],b=support.hull[(i+1)%support.hull.length],ex=b[0]-a[0],ey=b[1]-a[1],length=Math.hypot(ex,ey),nx=-ey/length,ny=ex/length;
                const gap=minimumSupportMargin+1e-5-((desired[0]-a[0])*nx+(desired[1]-a[1])*ny);
                if(gap>0){desired[0]+=nx*gap;desired[1]+=ny*gap;}
            }
            dx=(desired[0]-center[0])*1.25;dy=(desired[1]-center[1])*1.25;
        }
        if(joint&&pass>=24){
            const pivot=posed[joint.bone].head;
            const lever=joint.descendants.reduce((sum,id)=>sum+(massWeights[id]??0)*((posed[id].head[2]+posed[id].tail[2])/2-pivot[2]),0)/totalMass;
            if(lever<=1e-5)throw new RangeError('Source balance joint has no positive mass lever');
            bodyTilt=[bodyTilt[0]-dy/(1.25*lever),bodyTilt[1]+dx/(1.25*lever)];
            const angle=Math.hypot(...bodyTilt);if(angle>joint.maxRadians)bodyTilt=bodyTilt.map(n=>n*joint.maxRadians/angle);
            continue;
        }
        const distance=Math.hypot(dx,dy);if(distance>.025){dx*=.025/distance;dy*=.025/distance;}
        const next=[bodyShift[0]+dx,bodyShift[1]+dy,bodyShift[2]];
        if(Math.hypot(...next)>maxBodyTranslation){const error=new RangeError('Authored source body translation envelope exceeded');error.sourcePoseFailure={bodyShift,next,center,support,targets};throw error;}
        bodyShift=next;
    }
    const error=new RangeError('Reposed whole-body source mass remains outside actual support');error.sourcePoseFailure={bodyShift,center,support,targets};throw error;
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

/** Project an independently validated source skeleton onto its original source
 * regions. This describes geometry only; raster fidelity/material acceptance
 * must be measured separately before any rendering adapter adopts the pose. */
export function sourcePoseRegionTransforms(source,posed,projection){
    if(!source?.sourceBones||!source.sourceContacts||!posed?.sourceBones||!Array.isArray(projection)||projection.length!==8||!projection.every(Number.isFinite)||
       !Array.isArray(posed.sourceRepose?.bodyShift)||posed.sourceRepose.bodyShift.length!==3||!posed.sourceRepose.bodyShift.every(Number.isFinite))throw new TypeError('Validated source skeleton and calibrated projection required');
    const shift=posed.sourceRepose.bodyShift,origin=projected([0,0,0],projection),offset=projected(shift,projection);
    const transforms=Object.create(null);transforms.body=[1,0,0,1,offset[0]-origin[0],offset[1]-origin[1]];
    for(const c of Object.values(source.sourceContacts)){
        for(const name of [c.upper,c.middle]){
            const before=source.sourceBones[name],after=posed.sourceBones[name];
            if(!before||!after)throw new TypeError('Present complete source region chain required');
            transforms[name]=segmentTransform(projected(before.head,projection),projected(before.tail,projection),projected(after.head,projection),projected(after.tail,projection));
        }
        const before=projected(source.sourceBones[c.end].head,projection),after=projected(posed.sourceBones[c.end].head,projection);
        transforms[c.end]=[1,0,0,1,after[0]-before[0],after[1]-before[1]];
    }
    return transforms;
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
    if(correction>maxCorrection)throw Object.assign(new RangeError('Source contact correction budget exceeded'),{requiredCorrectionMetres:correction,maxCorrectionMetres:maxCorrection});
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

/** Follow the support epochs of the selected full-body source pose. Contacts
 * survive clip/facing changes until the source actually releases that limb.
 * This consumes the owner's sample clock; it creates no locomotion/action loop.
 * Forced frozen transport is reported as transport, never as grounded stance.
 */
export function updateSourceContactTargets(state,frame,intent){
    const {timestamp,world,pixelScale,anchor,phaseOffset={x:0,y:0},translateSwing=false,paused=false,frozen=false}=intent;
    if(intent.sourceYaw!=null&&!Number.isFinite(intent.sourceYaw)||intent.groundZ!=null&&!Number.isFinite(intent.groundZ)||intent.sourcePhaseDirection!=null&&![-1,1].includes(intent.sourcePhaseDirection))throw new TypeError('Finite source orientation and contact ground required');
    if(intent.maxSwingStep!=null&&(!Number.isFinite(intent.maxSwingStep)||intent.maxSwingStep<0)||intent.retainLandingPosition!=null&&typeof intent.retainLandingPosition!=='boolean')throw new TypeError('Bounded source swing placement required');
    if(!Number.isFinite(timestamp)||timestamp<0||![world?.x,world?.y,pixelScale,phaseOffset?.x,phaseOffset?.y].every(Number.isFinite)||pixelScale<=0||!Array.isArray(anchor)||anchor.length!==2||!anchor.every(Number.isFinite))throw new TypeError('Finite source support placement required');
    const entries=Object.entries(frame?.sourceContacts??{}),projection=frame?.projection;
    if(!entries.length||!Array.isArray(projection)||projection.length!==8||!projection.every(Number.isFinite))throw new TypeError('Actual source support metadata required');
    for(const [,c] of entries)if(typeof c.planted!=='boolean'||!Array.isArray(c.sourceContact)||c.sourceContact.length!==3||!c.sourceContact.every(Number.isFinite)||c.sourceYaw!=null&&!Number.isFinite(c.sourceYaw)||c.swingProgress!=null&&(!Number.isFinite(c.swingProgress)||c.swingProgress<0||c.swingProgress>1))throw new TypeError('Explicit authored source stance required');
    const signature=JSON.stringify(entries.map(([id])=>id).sort());
    if(state.signature!=null&&state.signature!==signature)throw new TypeError('Contact anatomy changed; fresh animation state required');
    if(state.timestamp!=null&&timestamp<state.timestamp)throw new RangeError('Contact replay seek requires fresh state');
    const stopped=Boolean(paused||frozen),dx=state.world?world.x-state.world.x:0,dy=state.world?world.y-state.world.y:0;
    const previous=state.targets??Object.create(null),targets=Object.create(null);
    for(const [id,c] of entries){
        const z=c.planted&&intent.groundZ!=null?intent.groundZ:c.sourceContact[2],point=projected([c.sourceContact[0],c.sourceContact[1],z],projection),old=previous[id];
        const authored={x:world.x+(point[0]-anchor[0])*pixelScale+(c.planted||translateSwing?phaseOffset.x:0),y:world.y+(point[1]-anchor[1])*pixelScale+(c.planted||translateSwing?phaseOffset.y:0),z,planted:c.planted,transported:false};
        let swingProgress=c.swingProgress??1;if(intent.sourcePhaseDirection<0)swingProgress=1-swingProgress;
        if(intent.smoothSwing&&!c.planted&&old){
            const fresh=old.supportActive||old.swingDirection!==(intent.sourcePhaseDirection??1);
            const start=fresh?{x:old.x,y:old.y}:old.liftoffPoint??{x:old.x,y:old.y},startProgress=fresh?swingProgress:old.liftoffProgress??0;
            swingProgress=Math.max(0,Math.min(1,(swingProgress-startProgress)/Math.max(1e-8,1-startProgress)));
            const ease=swingProgress*swingProgress*(3-2*swingProgress);
            authored.x=start.x+(authored.x-start.x)*ease;authored.y=start.y+(authored.y-start.y)*ease;authored.liftoffPoint=start;authored.liftoffProgress=startProgress;authored.swingDirection=intent.sourcePhaseDirection??1;
            if(fresh)authored.liftoffOrientation=old.orientationWorld;
        }
        if(intent.sourceYaw!=null){
            const desired=intent.sourceYaw+(c.sourceYaw??0);
            const start=authored.liftoffOrientation??(old?.supportActive&&Number.isFinite(old.orientationWorld)?old.orientationWorld:old?.liftoffOrientation??desired);
            const progress=Math.max(0,Math.min(1,swingProgress));
            const ease=progress*progress*(3-2*progress),delta=((desired-start+Math.PI*3)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
            authored.orientationWorld=c.planted?desired:start+delta*ease;authored.liftoffOrientation=start;
        }
        if(old&&!c.planted&&intent.maxSwingStep!=null){
            const dx=authored.x-old.x,dy=authored.y-old.y,length=Math.hypot(dx,dy),fraction=length?Math.min(1,intent.maxSwingStep/length):0;
            authored.x=old.x+dx*fraction;authored.y=old.y+dy*fraction;
        }
        if(c.planted&&old&&!old.supportActive&&intent.retainLandingPosition&&!old.transported){authored.x=old.x;authored.y=old.y;authored.landingRetained=true;}
        if(stopped&&old)targets[id]={...old,x:old.x+dx,y:old.y+dy,planted:dx||dy?false:old.planted,transported:Boolean(dx||dy)};
        else if(c.planted&&old?.supportActive)targets[id]={...old,planted:true,transported:false};
        else targets[id]=authored;
        // Keep the authored support epoch through a frozen external transport.
        targets[id].supportActive=stopped&&old?old.supportActive:c.planted;
        if(intent.sourceYaw!=null&&!Number.isFinite(targets[id].orientationWorld)){targets[id].orientationWorld=authored.orientationWorld;targets[id].liftoffOrientation=authored.liftoffOrientation;}
    }
    Object.assign(state,{signature,timestamp,world:{...world},targets});
    return targets;
}

/** Shared contact scheduling primitive. The owning animation lifecycle supplies
 * absolute C# time and unwrapped support phase. No independent timer, AI, forces,
 * root integration or gameplay outcomes. Targets are ground XY + normalized lift;
 * source-space conversion, fixed-length solve and balance acceptance are separate.
 */
export function updateGroundContactTargets(state,patterns,intent){
    const {timestamp,phaseCycles,world,velocity,stride,nominalPhaseRate}=intent;
    const sourcePhaseCycles=intent.sourcePhaseCycles??phaseCycles;
    if(timestamp<0||phaseCycles<0||sourcePhaseCycles<0||![timestamp,phaseCycles,sourcePhaseCycles,world?.x,world?.y,velocity?.x,velocity?.y,stride,nominalPhaseRate].every(Number.isFinite)||stride<=0||nominalPhaseRate<=0||!Array.isArray(patterns)||!patterns.length)throw new TypeError('Finite authoritative motion and contact patterns required');
    const ids=new Set();
    for(const p of patterns){
        if(typeof p.id!=='string'||!p.id||ids.has(p.id)||!Number.isFinite(p.phaseOffset)||p.phaseOffset<0||p.phaseOffset>=1||!Number.isFinite(p.stanceFraction)||p.stanceFraction<=0||p.stanceFraction>1||![p.neutral?.x,p.neutral?.y].every(Number.isFinite))throw new TypeError('Invalid actual contact-cycle descriptor');
        ids.add(p.id);
    }
    const signature=JSON.stringify([...ids].sort());
    if(state.signature!=null&&state.signature!==signature)throw new TypeError('Contact anatomy changed; fresh animation state required');
    if(state.timestamp!=null&&(timestamp<state.timestamp||phaseCycles<state.phaseCycles||sourcePhaseCycles<(state.sourcePhaseCycles??state.phaseCycles)))throw new RangeError('Contact replay seek requires fresh state');
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
    if(dt>0&&phaseDelta===0&&dx===0&&dy===0&&Object.keys(state.targets).length){
        // The lifecycle's support phase is held at rest. Do not let wall time
        // pull a suspended swing toward a different landing behind its back.
        state.timestamp=timestamp;state.phaseCycles=phaseCycles;state.world={...world};state.stopped=false;
        return {targets:state.targets,plannedLandings:[],transported:false};
    }
    const speed=Math.hypot(velocity.x,velocity.y),direction=speed>1e-8?{x:velocity.x/speed,y:velocity.y/speed}:{x:0,y:0};
    const rate=dt>0&&phaseDelta>0?phaseDelta/dt:nominalPhaseRate,planned=[];
    for(const p of patterns){
        // Stance/swing belongs to the actually selected source pose. Its owner
        // may supply the sampled (unwrapped) phase while continuous distance
        // remains the rate/landing clock. Do not support a foot the source lifted.
        const unwrapped=sourcePhaseCycles+p.phaseOffset,cycle=Math.floor(unwrapped),q=unwrapped-cycle,planted=q<p.stanceFraction;
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
    state.timestamp=timestamp;state.phaseCycles=phaseCycles;state.sourcePhaseCycles=sourcePhaseCycles;state.world={...world};state.stopped=false;
    return {targets:state.targets,plannedLandings:planned,transported:false};
}

/** Sample sparse source regions using caller-owned world support targets.
 * The existing compositor consumes the returned parts. This does not advance
 * action time, choose a clip, change world motion, or invent missing anatomy.
 */
export function sampleSourceContactRegions(frame,sample,targets,options){
    const {world,pixelScale,anchor,maxCorrection,maxRootCorrection=0,bodyOffset=[0,0,0]}=options;
    if(![world?.x,world?.y,pixelScale,...(anchor??[])].every(Number.isFinite)||!(pixelScale>0)||anchor?.length!==2||!Array.isArray(bodyOffset)||bodyOffset.length!==3||!bodyOffset.every(Number.isFinite))throw new TypeError('Calibrated world/pixel source placement required');
    if(!frame?.sourceContacts||!frame.sourceBones||!Array.isArray(frame.completeRegions))throw new TypeError('Actual source contact regions required');
    const projection=frame.projection,parts=[],measurements=[],supportPoints=[];
    const own=(o,k)=>Object.hasOwn(o,k);
    const used=new Set();
    for(const [id,c] of Object.entries(frame.sourceContacts)){
        if(!own(targets,id))throw new TypeError('Missing actual support target: '+id);
        const target=targets[id];
        if(![target.x,target.y,target.z].every(Number.isFinite))throw new TypeError('Finite world contact and source height required');
        const pixel=[anchor[0]+(target.x-world.x)/pixelScale,anchor[1]+(target.y-world.y)/pixelScale];
        const ground=sourceGroundPointFromPixel(pixel,target.z,projection);
        const upper=frame.sourceBones[c.upper],lower=frame.sourceBones[c.middle],end=frame.sourceBones[c.end];
        if(!upper||!lower||!end)throw new TypeError('Missing actual source chain: '+id);
        let result;
        try{result=retargetSourceContactRegion({...c,pole:c.pole.map((n,i)=>n+bodyOffset[i]),upper,lower,end,targetContact:ground,projection,maxCorrection,maxRootCorrection,rootTarget:upper.head.map((n,i)=>n+bodyOffset[i])});}
        catch(error){error.contactId=id;throw error;}
        for(const [region,transform] of [[c.upper,result.upperTransform],[c.middle,result.lowerTransform],[c.end,result.endTransform]]){
            if(used.has(region))throw new TypeError('Overlapping source chains: '+region);
            used.add(region);parts.push({...sample,region,transform});
        }
        const actualWorld={x:world.x+(result.projectedContact[0]-anchor[0])*pixelScale,y:world.y+(result.projectedContact[1]-anchor[1])*pixelScale};
        if(target.planted)for(const vertex of c.footprint??[]){
            const point=vertex.map((v,i)=>v+ground[i]-c.sourceContact[i]);
            supportPoints.push([world.x+(projection[0]*point[0]+projection[1]*point[1]+projection[2]*point[2]+projection[3]-anchor[0])*pixelScale,world.y+(projection[4]*point[0]+projection[5]*point[1]+projection[6]*point[2]+projection[7]-anchor[1])*pixelScale]);
        }
        measurements.push({id,planted:Boolean(target.planted),world:actualWorld,target:{x:target.x,y:target.y},slip:Math.hypot(actualWorld.x-target.x,actualWorld.y-target.y),flexDegrees:result.flexDegrees});
    }
    const dx=projection[0]*bodyOffset[0]+projection[1]*bodyOffset[1]+projection[2]*bodyOffset[2],dy=projection[4]*bodyOffset[0]+projection[5]*bodyOffset[1]+projection[6]*bodyOffset[2];
    for(const region of frame.completeRegions)if(!used.has(region))parts.push({...sample,region,transform:[1,0,0,1,dx,dy]});
    if(parts.length!==frame.completeRegions.length||parts.some(p=>!frame.completeRegions.includes(p.region)))throw new TypeError('Incomplete source region anatomy');
    let support=null;
    if(frame.massCenter&&supportPoints.length){
        // Authored source mass proxy, not a claim of dynamic equilibrium or a
        // re-integrated physics COM after every regional deformation.
        const m=frame.massCenter.map((n,i)=>n+bodyOffset[i]);
        const groundZ=options.groundZ??Math.min(...Object.values(targets).filter(t=>t.planted).map(t=>t.z));
        if(!Number.isFinite(groundZ))throw new TypeError('Finite support ground required');
        const center=[world.x+(projection[0]*m[0]+projection[1]*m[1]+projection[2]*groundZ+projection[3]-anchor[0])*pixelScale,world.y+(projection[4]*m[0]+projection[5]*m[1]+projection[6]*groundZ+projection[7]-anchor[1])*pixelScale];
        support={...measureSourceSupport(supportPoints,center),center,measurement:'authored mass proxy projected onto contact ground'};
    }
    return {parts,contacts:measurements,support,measurementSpace:'calibrated-source-projection'};
}

/** Signed distance to the real projected support hull. A point or line cannot
 * provide positive static area support. Dynamic catch/fall permission remains
 * explicit caller metadata, never an automatic exemption for a bad pose. */
export function measureSourceSupport(points,center){
    if(!Array.isArray(points)||!points.length||!Array.isArray(center)||center.length!==2||!center.every(Number.isFinite)||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new TypeError('Finite actual support footprint and mass projection required');
    const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const half=values=>{const h=[];for(const p of values){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h;};
    const lower=half(sorted),upper=half([...sorted].reverse());
    const hull=sorted.length===1?sorted:[...lower.slice(0,-1),...upper.slice(0,-1)];
    const segmentDistance=(a,b)=>{const x=b[0]-a[0],y=b[1]-a[1],length=x*x+y*y;const t=length?Math.max(0,Math.min(1,((center[0]-a[0])*x+(center[1]-a[1])*y)/length)):0;return Math.hypot(center[0]-a[0]-t*x,center[1]-a[1]-t*y);};
    if(hull.length<3)return {hull,dimension:hull.length-1,margin:-segmentDistance(hull[0],hull.at(-1)),staticallySupported:false};
    let inside=true,distance=Infinity;
    for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];if(cross(a,b,center)<0)inside=false;distance=Math.min(distance,segmentDistance(a,b));}
    return {hull,dimension:2,margin:inside?distance:-distance,staticallySupported:inside};
}

