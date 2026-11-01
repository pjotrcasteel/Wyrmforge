// v022: a stride-driven hem that catches up with each advancing boot instead
// of leaving tall, square trouser columns below a stationary robe edge.
// This is one continuous robe mesh with two tension areas, not split panels.
import {
    project as base,poses,idle,sourceContacts,staffTip,staffGrip,staffPoint,
    transform as clothTransform,
} from './gothic-north-cloth.mjs';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=t=>{const x=clamp(t);return x*x*(3-2*x);};
const shadow=[60,55,56],mid=[73,66,65],fold=[103,91,84],lit=[131,115,104];

export const project={
    ...base,
    id:'grey-wizard-fire-north-run-v022',outputDirectory:'gothic-north-v022',
    status:'N physical-cadence draped hem and articulated hidden trouser source; owner review OPEN',
};
export {poses,idle,sourceContacts,staffTip,staffGrip,staffPoint};

// The robe's bottom follows the leading knee/boot more than the shoulders.
// The fold influence is smooth across the fabric, delayed by the step phase.
// No source pixel from the foot is moved into the continuous garment layer.
export function transform(name,x,y,p){
    const q=clothTransform(name,x,y,p);
    if(name!=='robe'||p.length<18)return q;
    const hem=smooth((y-100)/37),left=smooth(1-Math.abs(x-67)/21),right=smooth(1-Math.abs(x-96)/21);
    const leftTravel=p[3]-p[4],rightTravel=p[6]-p[7];
    const leftCarry=smooth((leftTravel+3)/15)*7.3;
    const rightCarry=smooth((rightTravel+3)/15)*7.3;
    const phase=p[17];
    const shear=hem*(left-right)*.9*Math.sin(phase-.35);
    const trailing=hem*(left*leftCarry+right*rightCarry);
    return [q[0]+shear,q[1]+trailing];
}

// Author the missing dark trouser fabric as a tapered, bent calf. Its ankle
// meets the actual separately rendered boot upper. The travelling robe covers
// its knee, so only a brief articulated cuff is visible in the support phase.
// Exact native palette shades are used; never tile staff, robe or boot pixels.
export function paintDynamicShins(dst,p){
    if(p.every(v=>v===0))return;
    const phase=p[17]??0;
    for(const [hip,ankle,dx,dy,lift,sign] of [
        [67,71,p[2],p[3],p[4],1],
        [94,100,p[5],p[6],p[7],-1],
    ]){
        const upper=Math.round(127+dy-lift),last=Math.min(upper+4,157);
        if(last<121)continue;
        for(let y=121;y<=last;y++){
            const t=clamp((y-121)/Math.max(1,upper-118));
            const bend=sign*1.55*Math.sin(phase+Math.PI*t)*Math.sin(Math.PI*t);
            const center=Math.round(hip*(1-t)+ankle*t+dx*t*t+bend);
            const radius=Math.max(2,Math.round(2.2+1.35*Math.sin(Math.PI*t)-.35*t));
            for(let x=center-radius;x<=center+radius;x++){
                const edge=x===center-radius||x===center+radius;
                const crease=(y+Math.round(phase*3)+sign*2)%6===0&&x===center-1;
                const tone=edge?shadow:crease?lit:x<center?fold:mid;
                dst.set(x,y,[...tone,255]);
            }
        }
    }
}
