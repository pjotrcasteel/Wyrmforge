// v023: turn the last exposed vertical trouser strips into short, articulated
// lower-leg silhouettes. Their source pixels are newly authored as cloth;
// boots, fire staff and embroidered robe retain independent ownership.
import {
    project as base,poses,idle,sourceContacts,staffTip,staffGrip,staffPoint,
    transform,
} from './gothic-north-drape.mjs';

const clamp=x=>Math.max(0,Math.min(1,x));
const palette={outline:[60,55,56],shadow:[73,66,65],cloth:[103,91,84],highlight:[131,115,104]};

export const project={
    ...base,
    id:'grey-wizard-fire-north-run-v023',outputDirectory:'gothic-north-v023',
    status:'N shaded jointed trouser cuffs under physics-timed single robe; art review OPEN',
};
export {poses,idle,sourceContacts,staffTip,staffGrip,staffPoint,transform};

export function paintDynamicShins(dst,p){
    if(p.every(v=>v===0))return; // never recolor the accepted resting source.
    const phase=p[17]??0;
    for(const [hip,ankle,dx,dy,lift,side] of [
        [67,71,p[2],p[3],p[4],1],
        [94,100,p[5],p[6],p[7],-1],
    ]){
        const bootUpper=Math.round(127+dy-lift),end=Math.min(bootUpper+4,157);
        for(let y=121;y<=end;y++){
            const t=clamp((y-121)/Math.max(1,bootUpper-118));
            const kneeOffset=side*2.1*Math.sin(phase+.6)*Math.sin(Math.PI*t);
            const c=Math.round(hip+(ankle-hip)*t+dx*t*t+kneeOffset);
            // A narrower shin, broader slightly bent cloth knee and sewn cuff.
            const radius=t<.3?3:t<.75?2:3;
            const seam=Math.floor(y+phase*1.6+side*2)%7;
            for(let x=c-radius;x<=c+radius;x++){
                const boundary=x===c-radius||x===c+radius;
                const stitch=(x===c-1&&seam===0)||(x===c&&seam===1);
                const tone=boundary?palette.outline:stitch?palette.cloth:
                    x<c?palette.shadow:palette.outline;
                dst.set(x,y,[...tone,255]);
            }
        }
    }
}
