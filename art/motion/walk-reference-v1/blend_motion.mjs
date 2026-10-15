// Blend bone directions through the hierarchy, preserving the shared skeleton.
export function blendMotion(from, to, weight) {
    const t=Math.max(0,Math.min(1,weight));
    if(t===0) return from;
    if(t===1) return to;
    const frames=to.frames.map((target,i)=>{
        const source=from.frames[i],pose=[];
        pose[0]=target[0].map((v,k)=>source[0][k]*(1-t)+v*t);
        for(const [parent,child] of to.bones){
            const a=source[child].map((v,k)=>v-source[parent][k]);
            const b=target[child].map((v,k)=>v-target[parent][k]);
            const la=Math.hypot(...a),lb=Math.hypot(...b);
            const d=a.map((v,k)=>v/la*(1-t)+b[k]/lb*t),length=Math.hypot(...d);
            if(length<1e-8) throw Error('Opposing bone directions require an explicit rotation arc');
            pose[child]=d.map((v,k)=>pose[parent][k]+v/length*(la*(1-t)+lb*t));
        }
        return pose;
    });
    // Injury phase warp is zero: every state uses identical locomotion timing.
    return {...to,frames};
}
