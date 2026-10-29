/** Presentation contracts. C# remains authoritative for all gameplay outcomes. */
export type Vector2={x:number;y:number};
export type Balance='supported'|'catch'|'flight'|'fall';
export interface ContactSample {id:string;x:number;y:number}
export interface SourcePose {contacts:ContactSample[];com?:[number,number];balance:Balance}
export interface PoseGrid {stanceVelocityByDirection?:Record<string,Vector2>;travel?:'facing-projection';stanceVelocity?:Vector2;phaseFrames:number;actionFrames:number;order:'action-major';phaseSampling:'nearest';actionSampling:'nearest'}
export interface ClipProfile {facingStep?:-1|1;contactSpace?:'projected-world-offset';facingSamples?:Record<string,SourcePose[]>;strideByDirection?:Record<string,number>;stanceVelocityByDirection?:Record<string,Vector2>;phaseSampling?:'nearest';poseGrid?:PoseGrid;clip:string;frames:number;fps:number;samples:SourcePose[];mode?:'fullBody'|'regions';coupledSupport?:boolean;priority?:number;commitUntil?:number;hold?:boolean;terminal?:boolean;reducedFrame?:number}
export interface ContactChain {upper:string;middle:string;end:string;pole:[number,number,number];restContactPoint:[number,number,number];limits:[number,number];bindSpace:'rig-source'}
export interface SourceContactCycle {id:string;phaseOffset:number;stanceFraction:number;neutral:[number,number,number];liftMetres:number;loadRampFraction?:number}
export interface SourceOrientationWarp {lowerRoot:string;upperChain:{bone:string;weight:number}[];maxYawRadians:number;maxRadiansPerCycle:number}
export interface SourceSupportProfile {version:1;worldUnitsPerMetre?:number;facingZero:string;groundBasis:[number,number,number,number];heightProjection:[number,number];groundZ:number;strideMetres:number;strideMetresByAxis?:[number,number];turnRadiansPerSecond:number;turnCyclesPerRadian:number;seededPhase?:boolean;contactCycles?:SourceContactCycle[];orientationWarp?:SourceOrientationWarp;balanceJoint?:{bone:string;maxRadians:number}}
export interface CreatureRigProfile {
 schemaVersion:2;coordinateSpace:'actor-xy-ground-z-up';unitsPerPixel:number;maxRootOffset:number;
 rig:{signature?:string;sourceSpace?:{coordinateSpace:'blender-armature-xyz-metres';toActor:number[]};bodyPlan:string;bones:{id:string;parent?:string|null;length:number;rest:number[];limits?:[number,number]}[];
 semantics:Record<string,string>;absentBones?:string[];contacts:{id:string;bone:string;surface:'foot'|'palm'|'body'|'paw';chain?:ContactChain}[];
 sockets?:Record<string,{bone:string}>};
 facing:{directions:string[];transition?:'row'|'source-pivot'};locomotion:ClipProfile&{stride:number;idleFrame?:number};actions:Record<string,ClipProfile>;
 pivot?:ClipProfile;pivots?:{positive:ClipProfile;negative:ClipProfile};
 sourceSupport?:SourceSupportProfile;
}
/** timestamp = monotonic presentation sample time; travel = cumulative C# world displacement.
 * Freeze/paused snapshots are sampled too; first resumed sample does not catch up.
 * A seek/teleport creates fresh state. Sequence is monotonically increasing per entity;
 * one action token always identifies the same source action. Proximity cues are visual only.
 */
export interface MotionIntent {
 entityId:string|number;scale?:number;timestamp:number;travel:number;world:Vector2;velocity?:Vector2;direction:string;moving:boolean;
 paused?:boolean;frozen?:boolean;reducedMotion?:boolean;
 action?:{name:string;token:string|number;sequence:number}|null;
}
export interface SemanticSpritePart {clip:string;frame:number;direction:string;region:string;transform:[number,number,number,number,number,number]}
export interface PoseSample {parts?:SemanticSpritePart[];
 skinPose?:Float32Array;sourceSupport?:{yaw:number;warpYaw:number;phaseCycles:number;phaseAdvance:number;phaseDirection:1|-1;axisWorld:Vector2;groundBasis:number[];reducedMotion:boolean};
 clip:string;frame:number;direction:string;baseClip:string;baseFrame:number;phase:number;layered:boolean;
 actionToken:string|number|null;actionProgress:number|null;contactPhase:number;rootOffset:Vector2;seed:number;
 material:unknown;debug:{contacts:Record<string,Vector2>;maxSlip:number|null;sourcePending?:boolean;transported?:boolean;support?:unknown;errors:{id:string;slip:number}[];balance:Balance;correctionSaturated:boolean};
}
