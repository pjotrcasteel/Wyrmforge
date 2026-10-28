// Source-skin backend of the shared animation owner. Consumes its sample;
// never advances a clock, chooses an action, or changes the gameplay root.
import {sampleSourceSkinSurface,sourceSkinPoseMatrices,orientSourceSkinPose} from './source-skin-pose.js';
import {updateSourceContactTargets,sourceGroundPointFromPixel,solveSupportedSourcePose} from './sprite-contact-kinematics.js';
export function updateSourceSkinSupport(state,surface,profile,sample,intent){
    const support=sample.sourceSupport,config=profile.sourceSupport;
    if(!support||!config)throw new TypeError('Shared source-support sample required');
    const scale=intent.scale??1;
    if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Positive source actor scale required');
    const clip=surface.clips[sample.clip],grid=clip.poseGrid;
    const gaitPhase=support.reducedMotion?(sample.frame%(grid?.phaseFrames??clip.frames))/(grid?.phaseFrames??clip.frames):sample.contactPhase;
    const actionProgress=support.reducedMotion&&grid?Math.floor(sample.frame/grid.phaseFrames)/(grid.actionFrames-1):sample.actionProgress??0;
    const base=orientSourceSkinPose(surface,sampleSourceSkinSurface(surface,{clip:sample.clip,gaitPhase,actionProgress}),support.warpYaw??0,config.orientationWarp);
    const b=support.groundBasis,h=config.heightProjection,z=config.groundZ;
    const projection=[b[0],b[1],h[0],-h[0]*z,b[2],b[3],h[1],-h[1]*z];
    const det=b[0]*b[3]-b[1]*b[2],axis=support.axisWorld;
    let travel=[(b[3]*axis.x-b[1]*axis.y)/det,(-b[2]*axis.x+b[0]*axis.y)/det];
    const length=Math.hypot(...travel);travel=travel.map(n=>n/length);
    const warp=support.warpYaw??0,cos=Math.cos(warp),sin=Math.sin(warp),localTravel=[cos*travel[0]+sin*travel[1],-sin*travel[0]+cos*travel[1]];
    const axes=config.strideMetresByAxis??[config.strideMetres,config.strideMetres],strideScale=1/Math.hypot(localTravel[0]/axes[0],localTravel[1]/axes[1])/config.strideMetres;
    // Rotate stride around each anatomical lane, never the stance width.
    const directed={...base,projection,sourceContacts:Object.fromEntries(Object.entries(base.sourceContacts).map(([id,c])=>{
        const cycle=surface.contactCycles.find(p=>p.id===id),step=(-sin*c.sourceContact[0]+cos*c.sourceContact[1]-cycle.neutral[1])*strideScale;
        const neutral=[cos*cycle.neutral[0]-sin*cycle.neutral[1],sin*cycle.neutral[0]+cos*cycle.neutral[1]];
        return [id,{...c,sourceContact:[neutral[0]-travel[0]*step,neutral[1]-travel[1]*step,c.sourceContact[2]]}];
    }))};
    if(state.reducedMotion!==Boolean(support.reducedMotion))state.contacts={};
    state.contacts??={};state.reducedMotion=Boolean(support.reducedMotion);
    const targets=updateSourceContactTargets(state.contacts,directed,{...intent,pixelScale:scale,anchor:[0,0],sourceYaw:support.yaw,groundZ:z,sourcePhaseDirection:support.phaseDirection,smoothSwing:true});
    // Forced transport is an explicit exception, never a planted-foot claim.
    const transported=Object.values(targets).some(t=>t.transported)||support.reducedMotion;
    const local=Object.fromEntries(Object.entries(targets).map(([id,t])=>{
        const c=base.sourceContacts[id],angle=t.orientationWorld-support.yaw-c.sourceYaw,cos=Math.cos(angle),sin=Math.sin(angle);
        return [id,{point:sourceGroundPointFromPixel([(t.x-intent.world.x)/scale,(t.y-intent.world.y)/scale],t.z,projection),planted:t.planted,rotation:[cos,-sin,0,sin,cos,0,0,0,1]}];
    }));
    const weights=surface.contactCycles.every(c=>c.loadRampFraction>0)?Object.fromEntries(surface.contactCycles.map(c=>{
        const q=((sample.contactPhase+c.phaseOffset)%1+1)%1;
        return [c.id,local[c.id].planted?Math.max(0,Math.min(1,q/c.loadRampFraction,(c.stanceFraction-q)/c.loadRampFraction)):0];
    })):null;
    if(config.balanceJoint&&!state.balanceJoint){
        const root=surface.bones.findIndex(b=>b.id===config.balanceJoint.bone),indices=new Set([root]);
        for(let i=root+1;i<surface.bones.length;i++)if(indices.has(surface.bones[i].parent))indices.add(i);
        state.balanceJoint={...config.balanceJoint,descendants:[...indices].map(i=>surface.bones[i].id)};
    }
    const posed=transported?{...base,sourceContacts:Object.fromEntries(Object.entries(base.sourceContacts).map(([id,c])=>[id,{...c,planted:false}]))}:solveSupportedSourcePose(base,local,{massWeights:surface.massWeights,rootBone:surface.rootBone,...surface.authoringEnvelope,minimumSupportMargin:surface.minimumSupportMarginMetres,fitReach:true,fitSwingReach:true,supportWeights:weights,balanceJoint:state.balanceJoint});
    if(!transported)for(const [id,c] of Object.entries(posed.sourceContacts))if(!c.planted){
        const p=c.sourceContact,t=state.contacts.targets[id];
        t.x=intent.world.x+(projection[0]*p[0]+projection[1]*p[1]+projection[2]*p[2]+projection[3])*scale;
        t.y=intent.world.y+(projection[4]*p[0]+projection[5]*p[1]+projection[6]*p[2]+projection[7])*scale;t.z=p[2];
    }
    const matrices=sourceSkinPoseMatrices(surface,base,posed);
    let maxSlip=transported?null:0;
    const patches=Object.fromEntries(Object.entries(posed.sourceContacts).map(([id,c])=>{
        const points=c.footprint.map(p=>[intent.world.x+(projection[0]*p[0]+projection[1]*p[1]+projection[2]*p[2]+projection[3])*scale,intent.world.y+(projection[4]*p[0]+projection[5]*p[1]+projection[6]*p[2]+projection[7])*scale,p[2]]),old=state.patches?.[id];
        if(!transported&&c.planted&&old?.planted&&old.points.length===points.length)for(let i=0;i<points.length;i++)maxSlip=Math.max(maxSlip,Math.hypot(...points[i].map((n,k)=>n-old.points[i][k])));
        return [id,{planted:c.planted&&!transported,points}];
    }));
    state.patches=patches;
    state.lastMatrices=matrices;
    return {...sample,skinPose:matrices,sourcePose:posed,rootOffset:{x:0,y:0},debug:{...sample.debug,sourcePending:false,transported,contacts:targets,maxSlip,support:posed.sourceRepose?.support??null}};
}

