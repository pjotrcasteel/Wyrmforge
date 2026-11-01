// v020 north run: pelvis weight transfer, shoulder counter-motion, a free-arm
// pendulum and delayed whole-robe folds. Foot contacts retain v019 exact math.
// Each semantic layer owns its original source pixels; added sleeve pigment
// lies behind its true arm only. This remains source-art review, not gameplay.
import {
    project as base,sourceContacts as sourceContactFromPose,staffTip,staffGrip,staffPoint,
    footTravel,footLift,
    paintDynamicShins,transform as baseTransform,
} from './gothic-north-contact.mjs';

const clamp=x=>Math.max(0,Math.min(1,x));
const armRows=Array.from({length:30},(_,i)=>[62+i,50+(i<7?2:0),64-(i>19?1:0)]);
const grey={outline:[60,55,56],edge:[96,86,83],leather:[103,91,84],highlight:[131,115,104]};
const freeIndex=base.drawOrder.indexOf('arm-free');

export const project={
    ...base,
    id:'grey-wizard-fire-north-run-v020',outputDirectory:'gothic-north-v020',
    status:'N 190world/s organic torso/arms/robe and source-root foot contacts; REVIEW ONLY',
    paintedUnderlays:[...base.paintedUnderlays,{
        name:'free-arm-underlay',colors:grey,rows:armRows,behind:['arm-free'],
    }],
    drawOrder:[...base.drawOrder.slice(0,freeIndex),'free-arm-underlay',...base.drawOrder.slice(freeIndex)],
    rigidPixelLayers:[...base.rigidPixelLayers,'hat','head-hair'],
};

// V019's exact 3-frame planted foot positions are preserved. Secondary motion
// uses actual leg phase, two weight transfers and two impacts per full cycle.
export const poses=Array.from({length:16},(_,i)=>{
    const phase=2*Math.PI*i/16;
    const left=footTravel[i];
    const leftLift=footLift[i];
    const rightIndex=(i+8)%16;
    const right=footTravel[rightIndex];
    const rightLift=footLift[rightIndex];
    const bob=-1.25*(1-Math.cos(2*phase));
    const torsoX=-1.5*Math.cos(phase);
    const counter=3.2*Math.sin(phase);
    const robeSway=2.3*Math.sin(phase-.34);
    // The staff remains in its true gripping hand. Carrying it allows some
    // forearm motion without a fake planted-tip constraint during a sprint.
    const staffX=torsoX+2.4*Math.sin(phase+.25);
    const staffY=bob-1.2+1.3*Math.sin(phase+.1);
    return [0,bob,
        -.5*Math.sin(phase),left,leftLift,
        .5*Math.sin(phase),right,rightLift,
        robeSway,staffX,staffY,.025*Math.sin(phase+.1),
        torsoX,counter,1.3*Math.sin(phase-.65),-1.3*Math.sin(phase+.65),
        -.65*Math.cos(2*phase-.35)];
});
export const idle=Array(12).fill(0);
export {staffTip,staffGrip,staffPoint,paintDynamicShins};
export function sourceContacts(warp,layers){return sourceContactFromPose(warp,layers,poses);}

export function transform(name,x,y,p){
    const torsoX=p[12]??0,armSwing=p[13]??0;
    if(name==='boot-left'||name==='boot-right'||name==='shin-left'||name==='shin-right')
        return baseTransform(name,x,y,p);
    if(name==='robe'){
        const q=baseTransform(name,x,y,p);
        const low=clamp((y-79)/59),upper=1-low;
        const left=clamp((82-x)/30),right=clamp((x-75)/30);
        const hemDrag=(p[14]??0)*left+(p[15]??0)*right;
        return [q[0]+torsoX*(.8+.12*upper)+.75*Math.sin(2*Math.PI*y/85)*low,
            q[1]+low*hemDrag];
    }
    if(name==='hat'||name==='head-hair'){
        // Both move as one rigid pixel object: no smeared brim or hair pixels.
        return [x+torsoX*.95,y+p[1]+(p[16]??0)];
    }
    if(name==='arm-free'){
        const k=clamp((y-63)/34);
        return [x+torsoX*.88-armSwing*k*.95,
            y+p[1]+.11*armSwing*k*(x-55)/10];
    }
    if(name==='free-arm-underlay')return [x+torsoX*.85,y+p[1]];
    if(name==='sleeve-underlay')return [x+torsoX*.75,y+p[1]];
    if(name==='arm-staff'){
        const q=baseTransform(name,x,y,p);
        const wrist=clamp((y-64)/40);
        return [q[0]+torsoX*.86*(1-wrist*.3),q[1]+.2*armSwing*wrist];
    }
    return baseTransform(name,x,y,p);
}
