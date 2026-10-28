// Preserve-volume backend math. Pose ownership remains in sprite-animation.js.
export function createDualQuaternionSkin(T,binding){
    const data=new Float32Array(binding.bones.length*8);
    const texture=new T.DataTexture(data,binding.bones.length*2,1,T.RGBAFormat,T.FloatType);
    texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;
    const inverse=binding.bones.map(b=>new T.Matrix4().fromArray(b.rest).invert());
    const matrix=new T.Matrix4(),q=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
    const update=globals=>{
        const next=new Float32Array(data.length);
        for(let i=0;i<inverse.length;i++){
            matrix.multiplyMatrices(globals[i],inverse[i]);matrix.decompose(position,q,scale);
            const e=matrix.elements;
            if(Math.max(...['x','y','z'].map(k=>Math.abs(scale[k]-1)))>1e-4||Math.abs(e[0]*e[4]+e[1]*e[5]+e[2]*e[6])+Math.abs(e[0]*e[8]+e[1]*e[9]+e[2]*e[10])+Math.abs(e[4]*e[8]+e[5]*e[9]+e[6]*e[10])>1e-4)throw new RangeError('Dual-quaternion skin requires rigid bone deformation');
            q.normalize();const {x,y,z}=position,o=i*8;
            next.set([q.x,q.y,q.z,q.w,.5*(x*q.w+y*q.z-z*q.y),.5*(y*q.w+z*q.x-x*q.z),.5*(z*q.w+x*q.y-y*q.x),-.5*(x*q.x+y*q.y+z*q.z)],o);
        }
        data.set(next);texture.needsUpdate=true;
    };
    const transform=(geometry,index,vector)=>{
        const real=[0,0,0,0],dual=[0,0,0,0];let reference;
        for(let set=0;set<(binding.influenceSets??1);set++){
            const suffix=set?String(set+1):'',ids=geometry.attributes['skinIndex'+suffix],weights=geometry.attributes['skinWeight'+suffix];
            for(let c=0;c<4;c++){
                const w=weights.array[index*4+c];if(!w)continue;const o=ids.array[index*4+c]*8,r=data.subarray(o,o+4);
                reference??=r;const sign=r.reduce((s,n,k)=>s+n*reference[k],0)<0?-1:1;
                for(let k=0;k<4;k++){real[k]+=w*sign*r[k];dual[k]+=w*sign*data[o+4+k];}
            }
        }
        const length=Math.hypot(...real);if(length<1e-8)throw new RangeError('Degenerate dual-quaternion blend');
        for(let k=0;k<4;k++){real[k]/=length;dual[k]/=length;}
        q.set(...real);vector.applyQuaternion(q);
        vector.x+=2*(real[3]*dual[0]-dual[3]*real[0]+real[1]*dual[2]-real[2]*dual[1]);
        vector.y+=2*(real[3]*dual[1]-dual[3]*real[1]+real[2]*dual[0]-real[0]*dual[2]);
        vector.z+=2*(real[3]*dual[2]-dual[3]*real[2]+real[0]*dual[1]-real[1]*dual[0]);return vector;
    };
    return {texture,update,transform};
}
export function patchDualQuaternionShader(shader,skin,sets){
    shader.uniforms.sourceDualQuaternions={value:skin.texture};shader.uniforms.sourceDualQuaternionWidth={value:skin.texture.image.width};
    const suffixes=Array.from({length:sets},(_,i)=>i?String(i+1):'');
    const declarations=suffixes.slice(1).map(s=>`attribute vec4 skinIndex${s}; attribute vec4 skinWeight${s};`).join('\n');
    shader.vertexShader=declarations+`
uniform sampler2D sourceDualQuaternions;
uniform float sourceDualQuaternionWidth;
vec3 sourceRotate(vec4 q,vec3 v){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
void sourceAccumulate(float index,float weight,inout vec4 realSum,inout vec4 dualSum,inout vec4 reference){
 if(weight<=0.0)return;
 vec4 r=texture2D(sourceDualQuaternions,vec2((index*2.0+0.5)/sourceDualQuaternionWidth,0.5));
 vec4 d=texture2D(sourceDualQuaternions,vec2((index*2.0+1.5)/sourceDualQuaternionWidth,0.5));
 if(dot(reference,reference)==0.0)reference=r;
 float signedWeight=dot(reference,r)<0.0?-weight:weight;
 realSum+=r*signedWeight;dualSum+=d*signedWeight;
}
`+shader.vertexShader;
    const accumulate=suffixes.flatMap(s=>['x','y','z','w'].map(c=>`sourceAccumulate(skinIndex${s}.${c},skinWeight${s}.${c},sourceReal,sourceDual,sourceReference);`)).join('\n');
    shader.vertexShader=shader.vertexShader.replace('#include <skinbase_vertex>',`vec4 sourceReal=vec4(0.0),sourceDual=vec4(0.0),sourceReference=vec4(0.0);\n${accumulate}\nfloat sourceLength=length(sourceReal);sourceReal/=sourceLength;sourceDual/=sourceLength;`)
        .replace('#include <skinnormal_vertex>',`objectNormal=sourceRotate(sourceReal,objectNormal);\n#ifdef USE_TANGENT\nobjectTangent=sourceRotate(sourceReal,objectTangent);\n#endif`)
        .replace('#include <skinning_vertex>',`transformed=sourceRotate(sourceReal,transformed)+2.0*(sourceReal.w*sourceDual.xyz-sourceDual.w*sourceReal.xyz+cross(sourceReal.xyz,sourceDual.xyz));`);
}
