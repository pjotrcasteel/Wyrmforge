// Generic source-skin resource backend for LightingEngine. No animation clock.
import {invertSourceMatrix} from '../source-skin-pose.js';
export function validateSkinBinding(binding,geometry){
    if(!binding||!Array.isArray(binding.bones)||!binding.bones.length||binding.bones.length>128||![1,2,3,4].includes(binding.influenceSets??1))throw new TypeError('Bounded source skin binding required');
    const ids=new Set();
    for(const [i,b] of binding.bones.entries()){
        if(!b.id||ids.has(b.id)||!Number.isSafeInteger(b.parent)||b.parent<-1||b.parent>=i)throw new TypeError('Ordered source skin hierarchy required');
        invertSourceMatrix(b.rest);ids.add(b.id);
    }
    const count=geometry.attributes.position?.count;
    for(const suffix of Array.from({length:binding.influenceSets??1},(_,i)=>i?String(i+1):''))for(const name of ['skinIndex','skinWeight']){
        const a=geometry.attributes[name+suffix];if(!a||a.itemSize!==4||a.count!==count)throw new TypeError('Complete source skin attributes required');
    }
    return binding;
}
function extendSkinShader(T,material,sets,emission){
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey.bind(material);
    material.onBeforeCompile=function(shader,renderer){
        previous.call(this,shader,renderer);
        if(sets>1){
            const extraSets=Array.from({length:sets-1},(_,i)=>i+2);
            shader.vertexShader=extraSets.map(set=>`attribute vec4 skinIndex${set};\nattribute vec4 skinWeight${set};\n`).join('')+shader.vertexShader;
            const letters=['X','Y','Z','W'],channels=['x','y','z','w'];
            const fetch=extraSets.flatMap(set=>letters.map((letter,i)=>`mat4 boneMat${letter}${set} = mat4(0.0); if (skinWeight${set}.${channels[i]} > 0.0) boneMat${letter}${set} = getBoneMatrix(skinIndex${set}.${channels[i]});`)).join('\n');
            const base=T.ShaderChunk.skinbase_vertex.replace('#endif',fetch+'\n#endif');
            const normal=extraSets.flatMap(set=>letters.map((letter,i)=>`skinMatrix += skinWeight${set}.${channels[i]} * boneMat${letter}${set};`)).join('\n');
            const vertex=extraSets.flatMap(set=>letters.map((letter,i)=>`skinned += boneMat${letter}${set} * skinVertex * skinWeight${set}.${channels[i]};`)).join('\n');
            shader.vertexShader=shader.vertexShader.replace('#include <skinbase_vertex>',base)
                .replace('#include <skinnormal_vertex>',T.ShaderChunk.skinnormal_vertex.replace('skinMatrix = bindMatrixInverse',normal+'\nskinMatrix = bindMatrixInverse'))
                .replace('#include <skinning_vertex>',T.ShaderChunk.skinning_vertex.replace('transformed = ( bindMatrixInverse * skinned ).xyz;',vertex+'\ntransformed = ( bindMatrixInverse * skinned ).xyz;'));
        }
        if(emission){
            shader.vertexShader='attribute float sourceEmission;\nvarying float sourceEmissionFactor;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsourceEmissionFactor = sourceEmission;');
            shader.fragmentShader='varying float sourceEmissionFactor;\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= sourceEmissionFactor;');
        }
    };
    material.customProgramCacheKey=()=>previousKey()+`:source-skin-${sets*4}-${emission?1:0}`;
}
export function createSkinnedRenderable(T,geometry,material,binding){
    validateSkinBinding(binding,geometry);
    const rest=binding.bones.map(b=>new T.Matrix4().fromArray(b.rest)),bones=binding.bones.map(()=>new T.Bone());
    for(const [i,b] of binding.bones.entries()){
        bones[i].name=b.id;bones[i].matrixAutoUpdate=false;
        bones[i].matrix.copy(b.parent<0?rest[i]:rest[b.parent].clone().invert().multiply(rest[i]));
        if(b.parent>=0)bones[b.parent].add(bones[i]);
    }
    const skeleton=new T.Skeleton(bones,rest.map(m=>m.clone().invert()));
    const mesh=new T.SkinnedMesh(geometry,material);
    for(const [i,b] of binding.bones.entries())if(b.parent<0)mesh.add(bones[i]);
    mesh.updateMatrixWorld(true);mesh.bind(skeleton,new T.Matrix4());
    // Bounds are the source geometry plus an explicit bounded source motion
    // envelope, not a per-frame CPU walk over every skinned vertex.
    geometry.computeBoundingSphere();mesh.boundingSphere=geometry.boundingSphere.clone();mesh.boundingSphere.radius+=(binding.motionRadius??0);
    const sets=binding.influenceSets??1;
    extendSkinShader(T,material,sets,Boolean(geometry.attributes.sourceEmission)&&Boolean(material.isMeshStandardMaterial));
    mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:material.map,alphaTest:material.alphaTest,side:material.side});
    mesh.customDistanceMaterial=new T.MeshDistanceMaterial({map:material.map,alphaTest:material.alphaTest,side:material.side});
    extendSkinShader(T,mesh.customDepthMaterial,sets,false);extendSkinShader(T,mesh.customDistanceMaterial,sets,false);
    return {mesh,skeleton,bones,binding,globalPose:rest.map(m=>m.clone()),inverseScratch:new T.Matrix4()};
}
export function validateSkinPose(binding,matrices){
    if(!(Array.isArray(matrices)||ArrayBuffer.isView(matrices))||matrices.length!==binding.bones.length*16)throw new TypeError('Complete finite source skin pose required');
    for(let i=0;i<binding.bones.length;i++)invertSourceMatrix(Array.from(matrices.slice(i*16,i*16+16)));
}
export function applySourceSkinPose(resource,matrices){
    const {binding,bones,globalPose,inverseScratch}=resource;
    validateSkinPose(binding,matrices);
    for(let i=0;i<bones.length;i++){
        const m=globalPose[i].fromArray(matrices,i*16);
        if(m.determinant()<=1e-8||Math.abs(m.elements[3])+Math.abs(m.elements[7])+Math.abs(m.elements[11])+Math.abs(m.elements[15]-1)>1e-6)throw new RangeError('Proper affine source skin pose required');
    }
    for(let i=0;i<bones.length;i++){
        const parent=binding.bones[i].parent;
        if(parent<0)bones[i].matrix.copy(globalPose[i]);
        else bones[i].matrix.multiplyMatrices(inverseScratch.copy(globalPose[parent]).invert(),globalPose[i]);
        bones[i].matrixWorldNeedsUpdate=true;
    }
}
