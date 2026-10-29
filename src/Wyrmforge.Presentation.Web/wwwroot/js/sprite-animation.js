// Shared, anatomy-independent playback. Input signals never change gameplay.
export function createSpriteAnimationState(){
    return {phase:0,time:0,action:null,lastToken:null,supportFrame:0,sample:null};
}
function resolveFacing(state,profile,input,dt,stopped){
    const target=input.direction??'S',spec=profile.facing;
    if(!spec)return target;
    const index=spec.directions.indexOf(target);
    if(index<0)return state.sample?.direction??target;
    const step=360/spec.directions.length,angle=index*step;
    if(state.facingAngle==null){state.facingAngle=angle;state.facingIndex=index;}
    if(!stopped){
        const delta=(angle-state.facingAngle+540)%360-180;
        const limit=input.reducedMotion?180:spec.degreesPerSecond*dt;
        state.facingAngle=(state.facingAngle+Math.max(-limit,Math.min(limit,delta))+360)%360;
        const fromRow=(state.facingAngle-state.facingIndex*step+540)%360-180;
        if(Math.abs(fromRow)>step/2+(spec.hysteresisDegrees??3))state.facingIndex=Math.round(state.facingAngle/step)%spec.directions.length;
    }
    return spec.directions[state.facingIndex];
}
export function updateSpriteAnimation(state,profile,input){
    if(profile.schemaVersion===2)return updateContactAnimation(state,profile,input);
    const stopped=input.paused||input.frozen;
    const dt=stopped?0:Math.max(0,Math.min(profile.maxDeltaSeconds??.1,Number(input.deltaSeconds)||0));
    state.time+=dt;
    if(!stopped){
        const stride=profile.locomotion.stride;
        state.phase=((state.phase+(Number(input.distance)||0)/stride)%1+1)%1;
    }
    const signal=input.action;
    if(signal&&signal.token!==state.lastToken){
        const spec=profile.actions[signal.name];
        if(spec&&(!state.action||(spec.priority??0)>=(profile.actions[state.action.name].priority??0))){
            state.action={name:signal.name,token:signal.token,started:state.time,progress:null};state.lastToken=signal.token;
        }
    }
    let actionFrame=null,actionSpec=null;
    if(state.action){
        actionSpec=profile.actions[state.action.name];
        if(!stopped&&signal?.token===state.action.token&&Number.isFinite(signal.progress))state.action.progress=Math.max(0,Math.min(1,signal.progress));
        const elapsed=state.time-state.action.started;
        const position=state.action.progress==null?elapsed*actionSpec.fps:state.action.progress*actionSpec.frames;
        if(position>=actionSpec.frames&&!actionSpec.hold){state.action=null;actionSpec=null;}
        else actionFrame=Math.min(actionSpec.frames-1,Math.floor(position));
    }
    const moving=Boolean(input.moving);
    if(!stopped)state.supportFrame=moving?Math.floor(state.phase*profile.locomotion.frames)%profile.locomotion.frames:0;
    const baseFrame=input.reducedMotion?0:state.supportFrame;
    if(input.reducedMotion&&actionSpec)actionFrame=actionSpec.reducedFrame??0;
    const layered=Boolean(actionSpec?.mode==='regions'&&moving&&!input.reducedMotion);
    state.sample={baseClip:profile.locomotion.clip,baseFrame,phase:state.phase,
        clip:actionSpec?.clip??profile.locomotion.clip,frame:actionSpec?actionFrame:baseFrame,
        direction:resolveFacing(state,profile,input,dt,stopped),layered,baseRegion:actionSpec?.supportRegion,actionRegion:actionSpec?.region,
        useBasePose:layered&&(actionFrame===(actionSpec.entryFrame??-1)||actionFrame===(actionSpec.exitFrame??-1))};
    return state.sample;
}


/** Validate once at asset load, never per actor/frame. V1 remains compatible. */
export function validateCreatureRigProfile(profile) {
    const fail=message=>{throw new TypeError(`CreatureRigProfile: ${message}`);};
    if(profile?.schemaVersion!==2)fail('unsupported schemaVersion; expected 2');
    if(profile.coordinateSpace!=='actor-xy-ground-z-up')fail('unsupported bind coordinate space');
    if(!Number.isFinite(profile.unitsPerPixel)||profile.unitsPerPixel<=0)fail('unitsPerPixel must be positive');
    const rig=profile.rig;
    if(!rig||!Array.isArray(rig.bones)||!rig.bones.length)fail('bone hierarchy required');
    if(rig.signature!=null&&!/^[a-f0-9]{64}$/.test(rig.signature))fail('invalid skeleton signature');
    if(rig.sourceSpace){
        const {coordinateSpace,toActor:m}=rig.sourceSpace;
        if(coordinateSpace!=='blender-armature-xyz-metres'||!Array.isArray(m)||m.length!==16||!m.every(Number.isFinite))fail('invalid source-to-actor bind space');
        const lengths=[Math.hypot(m[0],m[4],m[8]),Math.hypot(m[1],m[5],m[9]),Math.hypot(m[2],m[6],m[10])];
        const scale=lengths[0];
        const dot=(a,b)=>m[a]*m[b]+m[a+4]*m[b+4]+m[a+8]*m[b+8];
        if(!(scale>0)||lengths.some(n=>Math.abs(n/scale-1)>1e-6)||[dot(0,1),dot(0,2),dot(1,2)].some(n=>Math.abs(n/(scale*scale))>1e-6)||Math.abs(m[2])+Math.abs(m[6])+Math.abs(m[8])+Math.abs(m[9])>scale*1e-6||m[10]<=0||m[0]*m[5]-m[1]*m[4]<=0||Math.abs(m[12])+Math.abs(m[13])+Math.abs(m[14])+Math.abs(m[15]-1)>1e-6)fail('source-to-actor requires a proper uniform Z-up bind transform');
    }
    const bones=new Map();
    for(const bone of rig.bones){
        if(typeof bone.id!=='string'||!bone.id||bones.has(bone.id))fail('duplicate/empty bone');
        if(!Number.isFinite(bone.length)||bone.length<=0)fail(`invalid length: ${bone.id}`);
        if(!Array.isArray(bone.rest)||bone.rest.length!==16||!bone.rest.every(Number.isFinite))fail(`invalid bind: ${bone.id}`);
        const m=bone.rest;
        const determinant=m[0]*(m[5]*m[10]-m[6]*m[9])-m[1]*(m[4]*m[10]-m[6]*m[8])+m[2]*(m[4]*m[9]-m[5]*m[8]);
        if(determinant<=1e-8||Math.abs(m[12])+Math.abs(m[13])+Math.abs(m[14])+Math.abs(m[15]-1)>1e-6)fail(`singular/reflected/non-affine bind: ${bone.id}`);
        if(bone.parent&&!bones.has(bone.parent))fail(`parent must precede child: ${bone.id}`);
        if(bone.limits&&(!Array.isArray(bone.limits)||!bone.limits.every(Number.isFinite)||bone.limits.length!==2||bone.limits[0]>bone.limits[1]))fail(`invalid limits: ${bone.id}`);
        bones.set(bone.id,bone);
    }
    for(const [semantic,id] of Object.entries(rig.semantics??{}))if(!bones.has(id))fail(`missing semantic ${semantic}: ${id}`);
    if(!rig.semantics?.root)fail('root semantic required');
    if(bones.get(rig.semantics.root).parent)fail('root semantic must name a hierarchy root');
    const contacts=new Set();
    for(const contact of rig.contacts??[]){
        if(typeof contact.id!=='string'||!contact.id||contacts.has(contact.id)||!bones.has(contact.bone))fail(`invalid contact: ${contact.id}`);
        if(!['foot','palm','body','paw'].includes(contact.surface))fail(`invalid contact surface: ${contact.id}`);
        if(rig.absentBones?.includes(contact.bone))fail(`absent limb contact: ${contact.id}`);
        if(contact.chain){
            const c=contact.chain,upper=bones.get(c.upper),middle=bones.get(c.middle),end=bones.get(c.end);
            if(!upper||!middle||!end||middle.parent!==c.upper||end.parent!==c.middle||c.end!==contact.bone||c.bindSpace!=='rig-source')fail(`invalid contact chain: ${contact.id}`);
            if(![c.pole,c.restContactPoint].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))||!Array.isArray(c.limits)||c.limits.length!==2||!c.limits.every(Number.isFinite)||c.limits[0]<0||c.limits[1]>180||c.limits[0]>c.limits[1])fail(`invalid chain geometry: ${contact.id}`);
        }
        contacts.add(contact.id);
    }
    if(!contacts.size)fail('at least one actual surface contact required');
    for(const id of rig.absentBones??[])if(bones.has(id))fail(`absent bone still present: ${id}`);
    for(const socket of Object.values(rig.sockets??{}))if(!bones.has(socket.bone))fail('socket on missing bone');
    const directions=profile.facing?.directions;
    if(!Array.isArray(directions)||directions.length!==8||!directions.every(d=>typeof d==='string'&&d.length>0)||new Set(directions).size!==8)fail('eight unique facing rows required');
    if(!Number.isFinite(profile.locomotion?.stride)||!(profile.locomotion?.stride>0))fail('positive authored stride required');
    for(const [name,expected] of [['positive',1],['negative',-1]])if(profile.pivots?.[name]?.facingStep!=null&&profile.pivots[name].facingStep!==expected)fail(`source turn faces the wrong direction: ${name}`);
    const specs=[profile.locomotion,...Object.values(profile.actions??{}),...(profile.pivot?[profile.pivot]:[]),...Object.values(profile.pivots??{})];
    for(const clip of specs){
        if(typeof clip.clip!=='string'||!clip.clip||!Number.isSafeInteger(clip.frames)||clip.frames<1||!Number.isFinite(clip.fps)||!(clip.fps>0))fail('invalid clip dimensions/time');
        if(clip.poseGrid){
            const grid=clip.poseGrid;
            if(!Number.isSafeInteger(grid.phaseFrames)||grid.phaseFrames<2||!Number.isSafeInteger(grid.actionFrames)||grid.actionFrames<2||grid.phaseFrames*grid.actionFrames!==clip.frames||grid.order!=='action-major'||grid.phaseSampling!=='nearest'||grid.actionSampling!=='nearest')fail(`invalid pose grid: ${clip.clip}`);
        }
        if(clip.poseGrid?.travel!=null&&clip.poseGrid.travel!=='facing-projection')fail(`invalid grid travel mode: ${clip.clip}`);
        if(clip.poseGrid?.stanceVelocity&&![clip.poseGrid.stanceVelocity.x,clip.poseGrid.stanceVelocity.y].every(Number.isFinite))fail(`invalid stance velocity: ${clip.clip}`);
        if(clip.mode==='regions'&&!clip.coupledSupport)fail('region action requires authored coupledSupport');
        if(!Array.isArray(clip.samples)||clip.samples.length!==clip.frames)fail(`contact samples required: ${clip.clip}`);
        if(clip.reducedFrame!=null&&(!Number.isSafeInteger(clip.reducedFrame)||clip.reducedFrame<0||clip.reducedFrame>=clip.frames))fail('invalid reduced-motion source frame');
        if(clip.commitUntil!=null&&(!(clip.commitUntil>=0)||clip.commitUntil>1))fail('invalid commitment');
        if(clip.facingSamples){
            if(clip.contactSpace!=='projected-world-offset'||Object.keys(clip.facingSamples).length!==directions.length||!directions.every(d=>Array.isArray(clip.facingSamples[d])&&clip.facingSamples[d].length===clip.frames))fail(`invalid projected contacts: ${clip.clip}`);
        }
        if(clip.phaseSampling!=null&&clip.phaseSampling!=='nearest')fail(`invalid phase sampling: ${clip.clip}`);
        if(clip.stanceVelocityByDirection&&!directions.every(d=>{const v=clip.stanceVelocityByDirection[d];return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Math.hypot(v.x,v.y)>0;}))fail(`invalid projected stance velocity: ${clip.clip}`);
        if(clip.strideByDirection&&!directions.every(d=>Number.isFinite(clip.strideByDirection[d])&&clip.strideByDirection[d]>0))fail(`invalid projected strides: ${clip.clip}`);
        if(clip.poseGrid?.stanceVelocityByDirection&&!directions.every(d=>{const v=clip.poseGrid.stanceVelocityByDirection[d];return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Math.hypot(v.x,v.y)>0;}))fail(`invalid projected stance velocity: ${clip.clip}`);
        for(const sample of [clip.samples,...Object.values(clip.facingSamples??{})].flat()){
            if(sample.com!=null&&(!Array.isArray(sample.com)||sample.com.length!==2||!sample.com.every(Number.isFinite)))fail(`invalid mass projection: ${clip.clip}`);
            const ids=new Set();
            for(const c of sample.contacts??[]){
                if(!contacts.has(c.id)||ids.has(c.id)||![c.x,c.y].every(Number.isFinite))fail(`invalid sampled contact: ${c.id}`);
                ids.add(c.id);
            }
            if(!ids.size&&!['flight','catch','fall'].includes(sample.balance))fail(`unsupported pose lacks explicit momentum state: ${clip.clip}`);
        }
    }
    if(!(profile.maxRootOffset>=0)||profile.maxRootOffset>profile.unitsPerPixel)fail('root correction exceeds one source pixel');
    if(profile.sourceSupport){
        const s=profile.sourceSupport,b=s.groundBasis;
        if(s.version!==1||!directions.includes(s.facingZero)||!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||Math.abs(b[0]*b[3]-b[1]*b[2])<1e-8||!Array.isArray(s.heightProjection)||s.heightProjection.length!==2||!s.heightProjection.every(Number.isFinite)||!Number.isFinite(s.groundZ)||![s.strideMetres,s.turnRadiansPerSecond,s.turnCyclesPerRadian].every(n=>Number.isFinite(n)&&n>0)||s.seededPhase!=null&&typeof s.seededPhase!=='boolean')fail('invalid source support motion contract');
        if(s.contactCycles!=null){
            if(!Array.isArray(s.contactCycles)||!s.contactCycles.length||new Set(s.contactCycles.map(c=>c.id)).size!==s.contactCycles.length)fail('invalid source support cycles');
            for(const c of s.contactCycles)if(!contacts.has(c.id)||!Number.isFinite(c.phaseOffset)||c.phaseOffset<0||c.phaseOffset>=1||!Number.isFinite(c.stanceFraction)||c.stanceFraction<=0||c.stanceFraction>1||!Array.isArray(c.neutral)||c.neutral.length!==3||!c.neutral.every(Number.isFinite))fail('invalid source support cycles');
        }
        if(s.strideMetresByAxis!=null&&(!Array.isArray(s.strideMetresByAxis)||s.strideMetresByAxis.length!==2||!s.strideMetresByAxis.every(n=>Number.isFinite(n)&&n>0)))fail('invalid source stride axes');
        if(s.worldUnitsPerMetre!=null&&(!Number.isFinite(s.worldUnitsPerMetre)||s.worldUnitsPerMetre<=0))fail('invalid source world scale');
        if(s.orientationWarp){
            const w=s.orientationWarp;
            if(!bones.has(w.lowerRoot)||!Array.isArray(w.upperChain)||!w.upperChain.length||w.upperChain.length>4||!Number.isFinite(w.maxYawRadians)||w.maxYawRadians<=0||w.maxYawRadians>Math.PI/2||!Number.isFinite(w.maxRadiansPerCycle)||w.maxRadiansPerCycle<=0||w.maxRadiansPerCycle>Math.PI*4)fail('invalid source orientation warp');
            let parent=w.lowerRoot,total=0;
            for(const j of w.upperChain){
                if(bones.get(j.bone)?.parent!==parent||!Number.isFinite(j.weight)||j.weight<=0||j.weight>1)fail('invalid source counter-torque chain');
                for(const contact of rig.contacts){let bone=contact.bone;while(bone){if(bone===j.bone)fail('counter-torque chain may not contain a ground contact');bone=bones.get(bone)?.parent;}}
                parent=j.bone;total+=j.weight;
            }
            if(Math.abs(total-1)>1e-8)fail('source counter-torque must preserve the committed upper pose');
        }
        if(s.balanceJoint){
            const j=s.balanceJoint;if(!bones.has(j.bone)||!Number.isFinite(j.maxRadians)||j.maxRadians<=0||j.maxRadians>Math.PI/12)fail('invalid source balance joint');
            for(const c of rig.contacts){let b=c.bone;while(b){if(b===j.bone)fail('balance joint may not contain a ground contact');b=bones.get(b)?.parent;}}
        }
    }
    return profile;
}

/** Canonical JSON for hashed profiles, replay snapshots and source manifests. */
export function serializeAnimationData(value) {
    const active=new Set();
    function encode(item){
        if(item===null)return 'null';
        const kind=typeof item;
        if(kind==='string'||kind==='boolean')return JSON.stringify(item);
        if(kind==='number'&&Number.isFinite(item))return JSON.stringify(item);
        if(kind!=='object')throw new TypeError('Animation data must contain finite JSON values');
        if(active.has(item))throw new TypeError('Animation data cannot contain cycles');
        if(Object.getOwnPropertySymbols(item).length)throw new TypeError('Animation data cannot contain symbol keys');
        active.add(item);
        try{
            if(Array.isArray(item)){
                const result=[];
                for(let i=0;i<item.length;i++){
                    if(!Object.hasOwn(item,i))throw new TypeError('Animation data cannot contain sparse arrays');
                    result.push(encode(item[i]));
                }
                return '['+result.join(',')+']';
            }
            if(ArrayBuffer.isView(item)&&!(item instanceof DataView))return encode(Array.from(item));
            const proto=Object.getPrototypeOf(item);
            if(proto!==null&&proto!==Object.prototype)throw new TypeError('Animation data requires plain JSON objects');
            return '{'+Object.keys(item).sort().map(key=>{
                const descriptor=Object.getOwnPropertyDescriptor(item,key);
                if(!Object.hasOwn(descriptor,'value'))throw new TypeError('Animation data cannot contain accessors');
                return JSON.stringify(key)+':'+encode(descriptor.value);
            }).join(',')+'}';
        }finally{active.delete(item);}
    }
    return encode(value);
}

function seededIdentity(id){
    let hash=2166136261;
    for(const c of String(id)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
    return hash>>>0;
}
function contactPoint(c,world,yaw,scale=1){
    const a=yaw*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
    return {x:world.x+(c.x*cos-c.y*sin)*scale,y:world.y+(c.x*sin+c.y*cos)*scale};
}
function solvePresentationContacts(state,profile,spec,frame,world,yaw,actorScale,contactPhase=state.phase){
    const direction=profile.facing.directions[Math.round(yaw/45)%8];
    const authored=spec.facingSamples?.[direction]?.[frame]??spec.samples[frame],active=new Set(),errors=[];
    const localYaw=spec.facingSamples?0:yaw;
    let dx=0,dy=0,count=0;
    for(const c of authored.contacts??[]){
        active.add(c.id);const point=contactPoint(c,world,localYaw,actorScale);
        let anchor=state.contacts[c.id];
        if(!anchor){
            const grid=spec.poseGrid;
            const stanceVelocity=grid?.stanceVelocityByDirection?.[direction]??grid?.stanceVelocity??spec.stanceVelocityByDirection?.[direction];
            if(stanceVelocity){
                // A newly planted raster pose may precede/follow continuous travel.
                // Initialize its world anchor at the continuous source phase, then
                // measure the DRAWN pose against it. Never replace measured contacts
                // with interpolated contacts: the bounded correction moves the sprite.
                const sampledPhase=(frame%(grid?.phaseFrames??spec.frames))/(grid?.phaseFrames??spec.frames);
                const phaseError=(contactPhase-sampledPhase+1.5)%1-.5;
                anchor=contactPoint({x:c.x+phaseError*stanceVelocity.x,y:c.y+phaseError*stanceVelocity.y},world,localYaw,actorScale);
            }else anchor={x:point.x+state.rootOffset.x,y:point.y+state.rootOffset.y};
            state.contacts[c.id]=anchor;
        }
        dx+=anchor.x-point.x;dy+=anchor.y-point.y;count++;
    }
    for(const id of Object.keys(state.contacts))if(!active.has(id))delete state.contacts[id];
    if(count){dx/=count;dy/=count;}
    // Atlas sampling can require a subpixel translation; it never moves gameplay.
    const limit=profile.maxRootOffset*actorScale;
    const length=Math.hypot(dx,dy),scale=length>limit?limit/length:1;
    state.rootOffset={x:dx*scale,y:dy*scale};
    for(const c of authored.contacts??[]){
        const point=contactPoint(c,world,localYaw,actorScale),anchor=state.contacts[c.id];
        errors.push({id:c.id,slip:Math.hypot(point.x+state.rootOffset.x-anchor.x,point.y+state.rootOffset.y-anchor.y)});
    }
    return {measurementSpace:spec.facingSamples?'unsnapped-source-marker-world-projection':'legacy-actor-local-contact-approximation',contacts:state.contacts,errors,maxSlip:Math.max(0,...errors.map(c=>c.slip)),balance:authored.balance??'supported',
        com:authored.com??null,support:authored.contacts??[],correctionSaturated:length>limit};
}
function actionDuration(spec){return (spec.poseGrid?.actionFrames??spec.frames)/spec.fps;}
function poseGridFrame(spec,phase,progress){
    const grid=spec.poseGrid;
    return Math.min(grid.actionFrames-1,Math.round(progress*(grid.actionFrames-1)))*grid.phaseFrames+Math.round(phase*grid.phaseFrames)%grid.phaseFrames;
}
function updateContactAnimation(state,profile,input){
    if(!state.contactVersion){
        if(!Number.isFinite(input.timestamp)||!Number.isFinite(input.travel)||!input.world||input.entityId==null)
            throw new TypeError('MotionIntent requires stable entityId, timestamp, cumulative travel and world');
        Object.assign(state,{contactVersion:2,entityId:input.entityId,seed:seededIdentity(input.entityId),
            timestamp:input.timestamp,travel:input.travel,contacts:Object.create(null),rootOffset:{x:0,y:0},sequence:-1,
            facingIndex:Math.max(0,profile.facing.directions.indexOf(input.direction)),pivotTime:0});
    }
    if(state.entityId!==input.entityId)throw new TypeError('Animation state cannot be shared between entities');
    if(![input.timestamp,input.travel,input.world?.x,input.world?.y].every(Number.isFinite))throw new TypeError('Non-finite MotionIntent');
    if(input.timestamp<state.timestamp||input.travel<state.travel)throw new RangeError('Replay seek requires a fresh animation state');
    const actorScale=input.scale??1;
    if(!Number.isFinite(actorScale)||actorScale<=0)throw new RangeError('Positive actor scale required');
    if(profile.sourceSupport&&state.sourceScale!=null&&Math.abs(state.sourceScale-actorScale)>1e-9)throw new RangeError('Source skin scale change requires fresh state');
    if(input.velocity&&![input.velocity.x,input.velocity.y].every(Number.isFinite))throw new TypeError('Finite observed source velocity required');
    const stopped=Boolean(input.paused||input.frozen),wasStopped=Boolean(state.stopped);
    const dt=stopped||wasStopped?0:input.timestamp-state.timestamp;
    const distance=stopped||wasStopped?0:input.travel-state.travel;
    const previousWorld=state.previousWorld??input.world;
    const displacement=stopped||wasStopped?{x:0,y:0}:{x:input.world.x-previousWorld.x,y:input.world.y-previousWorld.y};
    state.previousWorld={...input.world};
    state.timestamp=input.timestamp;state.travel=input.travel;state.stopped=stopped;
    state.time+=dt;
    const stride=profile.locomotion.strideByDirection?.[profile.facing.directions[state.action?state.actionDirection:state.facingIndex]]??profile.locomotion.stride;
    let sourceCycleBefore=null;
    if(profile.sourceSupport){
        const s=profile.sourceSupport,zero=profile.facing.directions.indexOf(s.facingZero);
        const initializingSource=state.sourceYaw==null;
        if(state.sourceYaw==null){
            state.sourceYaw=(zero-state.facingIndex)*Math.PI/4;state.sourceScale=actorScale;
            if(s.seededPhase)state.phase=input.moving?(state.seed>>>0)/4294967296:(profile.locomotion.idleFrame??0)/profile.locomotion.frames;
            state.sourceSupportPhaseCycles=state.phase;
        }
        sourceCycleBefore=state.sourceSupportPhaseCycles;
        const cos=Math.cos(state.sourceYaw),sin=Math.sin(state.sourceYaw),b=s.groundBasis;
        const basis=[b[0]*cos+b[1]*sin,-b[0]*sin+b[1]*cos,b[2]*cos+b[3]*sin,-b[2]*sin+b[3]*cos];
        const det=basis[0]*basis[3]-basis[1]*basis[2],inverse=v=>[(basis[3]*v.x-basis[1]*v.y)/det/actorScale,(-basis[2]*v.x+basis[0]*v.y)/det/actorScale];
        const observed=Math.hypot(displacement.x,displacement.y)>1e-12?displacement:input.velocity??{x:0,y:0},source=inverse(observed),length=Math.hypot(...source);
        if(length>1e-10&&!stopped){
            const previous=state.sourceAxisWorld?inverse(state.sourceAxisWorld):[0,-1];
            const dot=source[0]*previous[0]+source[1]*previous[1];let sign=dot<-1e-10?-1:1;
            if(Math.abs(dot)<1e-10&&Array.isArray(s.contactCycles)&&s.contactCycles.length){
                const scores=s.contactCycles.map(c=>({c,ahead:c.neutral[0]*source[0]+c.neutral[1]*source[1]})),ahead=Math.max(...scores.map(c=>c.ahead));
                const leading=scores.filter(c=>Math.abs(c.ahead-ahead)<1e-8);
                let forward=0,reverse=0;
                for(const {c} of leading){const q=(state.phase+c.phaseOffset)%1;if(q<c.stanceFraction){forward-=c.stanceFraction-q;reverse-=q;}else{forward-=1-q;reverse-=q-c.stanceFraction;}}
                sign=reverse>forward?-1:1;
            }
            state.sourceAxisWorld={x:observed.x/Math.hypot(observed.x,observed.y)*sign,y:observed.y/Math.hypot(observed.x,observed.y)*sign};
            const delta=inverse(displacement),axes=s.strideMetresByAxis??[s.strideMetres,s.strideMetres],warp=state.sourceWarpYaw??0,cw=Math.cos(warp),sw=Math.sin(warp),localDelta=[cw*delta[0]+sw*delta[1],-sw*delta[0]+cw*delta[1]],advance=sign*Math.hypot(localDelta[0]/axes[0],localDelta[1]/axes[1]);
            if(s.orientationWarp){
                const w=s.orientationWarp,desired=Math.max(-w.maxYawRadians,Math.min(w.maxYawRadians,Math.atan2(source[0]*sign,-source[1]*sign))),step=Math.abs(advance)*w.maxRadiansPerCycle;
                state.sourceWarpYaw=initializingSource?desired:warp+Math.max(-step,Math.min(step,desired-warp));
            }
            state.sourceSupportPhaseCycles+=advance;if(advance)state.sourcePhaseDirection=Math.sign(advance);
        }
        state.sourceAxisWorld??={x:-basis[1],y:-basis[3]};
        state.phase=(state.sourceSupportPhaseCycles%1+1)%1;
        if(!input.moving&&!stopped&&!input.reducedMotion&&Math.hypot(displacement.x,displacement.y)<1e-10&&dt>0&&s.contactCycles?.length){
            const sign=state.sourcePhaseDirection??1;
            const swings=s.contactCycles.map(c=>({c,q:(state.phase+c.phaseOffset)%1})).filter(({c,q})=>q>=c.stanceFraction);
            if(swings.length){
                const landing=Math.max(...swings.map(({c,q})=>sign>0?1-q:q-c.stanceFraction+1e-8));
                state.sourceSupportPhaseCycles+=sign*Math.min(landing,dt*profile.locomotion.fps/profile.locomotion.frames);
                state.phase=(state.sourceSupportPhaseCycles%1+1)%1;
            }
        }
    }else if(!stopped){
        // Calibrated source motion consumes actual signed root displacement.
        // Cumulative path length remains the compatibility input for old packs.
        const v=profile.locomotion.stanceVelocityByDirection?.[profile.facing.directions[state.action?state.actionDirection:state.facingIndex]];
        const advance=v?-(displacement.x*v.x+displacement.y*v.y)/((v.x*v.x+v.y*v.y)*actorScale):distance/(stride*actorScale);
        state.phase=((state.phase+advance)%1+1)%1;
    }
    const signal=input.action,spec=signal&&Object.hasOwn(profile.actions,signal.name)?profile.actions[signal.name]:null;
    if(signal&&(!Number.isSafeInteger(signal.sequence)||signal.sequence<0||!((typeof signal.token==='string'&&signal.token.length>0)||Number.isSafeInteger(signal.token))))throw new TypeError('Action requires token and monotonic sequence');
    const current=state.action&&profile.actions[state.action.name];
    const progress=current?Math.min(1,(state.time-state.action.started)/actionDuration(current)):1;
    const committed=current&&progress<(current.commitUntil??0);
    let beganAction=false;
    const higher=spec&&(spec.priority??0)>(current?.priority??-1);
    if(spec&&signal.token!==state.lastToken&&signal.sequence>state.sequence&&(!stopped||spec.terminal)&&(!current||higher||(!committed&&!current.terminal))){
        beganAction=true;state.action={name:signal.name,token:signal.token,started:state.time,contactPhase:state.phase};state.sequence=signal.sequence;state.lastToken=signal.token;
        state.actionDirection=state.facingIndex;
        // Every action is full-body unless its source declares coupled regions.
        state.contacts=Object.create(null);
    }
    let actionSpec=state.action&&profile.actions[state.action.name];
    let actionProgress=actionSpec?Math.min(1,(state.time-state.action.started)/actionDuration(actionSpec)):null;
    if(profile.sourceSupport&&actionSpec?.poseGrid)state.action.contactPhase=state.phase;
    if(!profile.sourceSupport&&actionSpec?.poseGrid?.travel==='facing-projection'&&!beganAction){
        const yaw=state.actionDirection*Math.PI/4;
        const v=actionSpec.poseGrid.stanceVelocityByDirection?.[profile.facing.directions[state.actionDirection]];
        const length=v?Math.hypot(v.x,v.y):stride;
        const projected=v?-(displacement.x*v.x+displacement.y*v.y)/length:displacement.x*Math.cos(yaw)+displacement.y*Math.sin(yaw);
        state.action.contactPhase=((state.action.contactPhase+projected/(length*actorScale))%1+1)%1;
    }
    // Exit on the same support phase, including signed travel in the final
    // sample. Unsigned distance phase must not replace a reversing action gait.
    if(actionSpec?.poseGrid?.travel==='facing-projection')state.phase=state.action.contactPhase;
    if(actionSpec&&actionProgress>=1&&!actionSpec.hold){state.action=null;actionSpec=null;actionProgress=null;}
    let contactPhase=actionSpec?.poseGrid?.travel==='facing-projection'?state.action.contactPhase:state.phase;
    const target=profile.facing.directions.indexOf(input.direction);
    let sourceSupport=null;
    if(profile.sourceSupport){
        const s=profile.sourceSupport,zero=profile.facing.directions.indexOf(s.facingZero);
        const previousYaw=state.sourceYaw;
        if(!actionSpec&&!stopped&&target>=0){
            const desired=(zero-target)*Math.PI/4,difference=Math.atan2(Math.sin(desired-state.sourceYaw),Math.cos(desired-state.sourceYaw));
            const yawStep=Math.max(-s.turnRadiansPerSecond*dt,Math.min(s.turnRadiansPerSecond*dt,difference));
            state.sourceYaw+=yawStep;
            const motionAdvance=state.sourceSupportPhaseCycles-sourceCycleBefore,phaseSign=motionAdvance?Math.sign(motionAdvance):state.sourcePhaseDirection??1;
            // Translation and turning use the same step, rather than charging
            // two gait cycles for simultaneous motion of the same feet.
            state.sourceSupportPhaseCycles+=Math.max(0,Math.abs(yawStep)*s.turnCyclesPerRadian-Math.abs(motionAdvance))*phaseSign;
            state.phase=(state.sourceSupportPhaseCycles%1+1)%1;
        }
        const sourceAdvance=state.sourceSupportPhaseCycles-sourceCycleBefore;if(sourceAdvance)state.sourcePhaseDirection=Math.sign(sourceAdvance);
        if(s.orientationWarp){
            const limit=s.orientationWarp.maxYawRadians,warp=(state.sourceWarpYaw??0)-(state.sourceYaw-previousYaw);
            const relax=!input.moving?Math.abs(sourceAdvance)*s.orientationWarp.maxRadiansPerCycle:0;
            state.sourceWarpYaw=Math.max(-limit,Math.min(limit,warp-Math.sign(warp)*Math.min(Math.abs(warp),relax)));
        }
        state.facingIndex=((Math.round(zero-state.sourceYaw/(Math.PI/4))%8)+8)%8;
        contactPhase=state.phase;
        const cos=Math.cos(state.sourceYaw),sin=Math.sin(state.sourceYaw),b=s.groundBasis;
        if(dt>0&&!stopped&&Math.hypot(displacement.x,displacement.y)<1e-10&&!input.moving)state.sourceAxisWorld={x:b[0]*sin-b[1]*cos,y:b[2]*sin-b[3]*cos};
        sourceSupport={yaw:state.sourceYaw,warpYaw:state.sourceWarpYaw??0,phaseCycles:state.sourceSupportPhaseCycles,phaseAdvance:sourceAdvance,phaseDirection:state.sourcePhaseDirection??1,axisWorld:{...state.sourceAxisWorld},
            groundBasis:[b[0]*cos+b[1]*sin,-b[0]*sin+b[1]*cos,b[2]*cos+b[3]*sin,-b[2]*sin+b[3]*cos],reducedMotion:Boolean(input.reducedMotion)};
    }
    const locomotionFrame=profile.locomotion.phaseSampling==='nearest'?Math.round(state.phase*profile.locomotion.frames)%profile.locomotion.frames:Math.min(profile.locomotion.frames-1,Math.floor(state.phase*profile.locomotion.frames));
    const turning=!profile.sourceSupport&&!actionSpec&&target>=0&&target!==state.facingIndex;
    let pivotFrame=null;
    const turnDelta=(target-state.facingIndex+12)%8-4;
    if(turning&&state.pivotSign==null)state.pivotSign=turnDelta<0?-1:1;
    const pivotSpec=profile.pivots?.[state.pivotSign<0?'negative':'positive']??profile.pivot;
    if(turning&&pivotSpec&&!stopped){
        state.pivotTime+=dt;
        const duration=pivotSpec.frames/pivotSpec.fps;
        while(state.pivotTime>=duration){
            state.pivotTime-=duration;
            const delta=(target-state.facingIndex+12)%8-4;
            state.facingIndex=(state.facingIndex+state.pivotSign+8)%8;
            state.contacts=Object.create(null);
            if(state.facingIndex===target){state.pivotTime=0;state.pivotSign=null;break;}
        }
        if(state.facingIndex!==target)pivotFrame=Math.min(pivotSpec.frames-1,Math.floor(state.pivotTime*pivotSpec.fps));
    }else if(!turning){state.pivotTime=0;state.pivotSign=null;}
    if(actionSpec&&!profile.sourceSupport)state.facingIndex=state.actionDirection;
    // Completing the final support step must not replay pivot frame zero in
    // the new facing. Use the continuing gait in this very sample.
    const activePivot=turning&&pivotSpec&&state.facingIndex!==target;
    let clipSpec=actionSpec??(activePivot?pivotSpec:profile.locomotion);
    let frame=actionSpec?(actionSpec.poseGrid?poseGridFrame(actionSpec,contactPhase,actionProgress):Math.min(actionSpec.frames-1,Math.floor(actionProgress*actionSpec.frames))):
        pivotFrame??(input.moving?locomotionFrame:(profile.locomotion.idleFrame??locomotionFrame));
    if(stopped&&state.sample&&!actionSpec?.terminal){
        // A changed target while frozen cannot select a different source clip
        // under the retained frame number (which may even exceed its length).
        clipSpec=[profile.locomotion,...Object.values(profile.actions),...Object.values(profile.pivots??{}),profile.pivot].find(c=>c?.clip===state.sample.clip)??clipSpec;
        frame=state.sample.frame;
        state.facingIndex=profile.facing.directions.indexOf(state.sample.direction);
    }
    if(input.reducedMotion)frame=clipSpec.reducedFrame??0;
    if(sourceSupport)state.rootOffset={x:0,y:0};
    const debug=sourceSupport?{contacts:{},errors:[],maxSlip:null,balance:'supported',correctionSaturated:false,sourcePending:true}:solvePresentationContacts(state,profile,clipSpec,frame,input.world,state.facingIndex*45,actorScale,contactPhase);
    // A newly observed stance starts at continuous source phase, not at the
    // nearest raster frame. Otherwise each landing banks a quantization error.
    const phaseFrames=clipSpec.poseGrid?.phaseFrames??clipSpec.frames;
    const stanceVelocity=clipSpec.poseGrid?.stanceVelocityByDirection?.[profile.facing.directions[state.facingIndex]]??clipSpec.stanceVelocityByDirection?.[profile.facing.directions[state.facingIndex]];
    const phaseError=(contactPhase-(frame%phaseFrames)/phaseFrames+1.5)%1-.5;
    const sourcePhaseOffset=!sourceSupport&&!input.reducedMotion&&stanceVelocity&&(clipSpec.poseGrid||clipSpec.phaseSampling==='nearest')?
        {x:stanceVelocity.x*phaseError*actorScale,y:stanceVelocity.y*phaseError*actorScale}:{x:0,y:0};
    state.sample={baseClip:profile.locomotion.clip,baseFrame:locomotionFrame,phase:state.phase,clip:clipSpec.clip,frame,
        direction:profile.facing.directions[state.facingIndex],layered:false,actionToken:state.action?.token??null,
        actionProgress,contactPhase,sourcePhaseOffset,rootOffset:{...state.rootOffset},material:clipSpec.material??null,debug,seed:state.seed,...(sourceSupport?{sourceSupport}:{})};
    return state.sample;
}



