/** Portable scene data. No DOM, Three.js or gameplay types. X/Y ground, Z up, metres. */
export type Vector3 = [number, number, number];
/** Source-rig binding registered once with geometry; no animation clock. */
export interface SourceSkinBinding {
    bones: {id:string;parent:number;rest:number[]}[];
    influenceSets?:1|2|3|4;
    /** Must match the saved Armature deformation mode. Missing means legacy linear. */
    skinningMode?:'linear'|'dual-quaternion';
    motionRadius?:number;
}
export interface LightEmitter {
    id: string; ownerId: string; type: 'point' | 'spot' | 'directional'; enabled: boolean;
    position: Vector3; direction: Vector3; color: string; intensity: number; range: number;
    coneAngle: number; penumbra: number; castsShadow: boolean; priority: number;
    expiresAt?: number;
}
export interface LitMaterial {
    id: string; color: string; albedo?: string; normal?: string; roughnessMap?: string;
    roughness: number; metalness: number; specular: number; reflection: 'off' | 'direct' | 'probe';
    /** Registered cube texture for probe tier; no probe is generated implicitly. */
    reflectionProbe?: string;
    /** G3 optional maps and controls; existing G1/G2 snapshots remain valid. */
    aoMap?: string; aoIntensity?: number; emissiveMap?: string;
    normalScale?: number; foliageTransmission?: number;
    /** 0 = authored dry roughness, 1 = wet microfacet response; never emits light. */
    wetness?: number;
    /** Source mesh shading; authored smooth normals remain the default. */
    flatShading?:boolean;
    emission: string; emissionIntensity: number; alphaCutoff: number; doubleSided: boolean;
}
export interface LitRenderable {
    id: string; ownerId: string; geometry: string; material: string;
    position: Vector3; rotation: Vector3; scale: Vector3;
    castsShadow: boolean; receivesShadow: boolean; receivesLight: boolean;
    /** Optional independent authored caster. Normal maps alone are NOT casters. */
    occluderGeometry?: string;
    /** Same normalized atlas region for albedo/normal and shadow alpha. */
    frame?: { offset: [number, number]; repeat: [number, number] };
    /** Complete source-rig global matrices; geometry registration owns the bind. */
    skinPose?:number[]|Float32Array;
}
export interface LightingSnapshot {
    version: 1; time: number; lights: LightEmitter[]; materials: LitMaterial[]; objects: LitRenderable[];
    environment: { ambient: number; color: string; exposure: number; emission: boolean;
        /** Atmospheric distance fog, suppressed when ambient illumination is zero. */
        fog?: { color: string; near: number; far: number };
    };
}
