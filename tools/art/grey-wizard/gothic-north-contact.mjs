// v019: North game-speed run with short, analytically planted boot intervals.
// Source-only art QA: no claim of satisfactory in-Hunt visual contact.
import {
    project as base,staffTip,staffGrip,staffPoint,
    transform as baseTransform,
} from './gothic-north-run.mjs';

const fps=32;
const nativeTravelPerFrame=base.sourceStride/16;
const colors={outline:[60,55,56],shadow:[73,66,65],cloth:[103,91,84],light:[131,115,104]};
const contact=[-14,-14+nativeTravelPerFrame,-14+2*nativeTravelPerFrame];
// After toe-off the shoe is airborne, returning through the hem for its next
// support. The swing lasts thirteen frames; contact occupies only three.
export const footTravel=[...contact,12,10,8,6,4,1,-3,-7,-10,-12,-13,-14,-14];
export const footLift=[0,0,0,1,3,4,4,4,4,3,3,2,2,1,0,0];
const offset=(i,phase)=>({y:footTravel[(i+phase)%16],lift:footLift[(i+phase)%16]});

export const project={
    ...base,
    id:'grey-wizard-fire-north-run-v019',outputDirectory:'gothic-north-v019',
    status:'N fast 190-world-units/s 3-frame contact source study; Hunt and artist review OPEN',
    fps,previewBaseSpeed:190,sourceContactVerified:true,
    // A 13-pixel toe edge is briefly exposed alone beneath the robe as a
    // hidden shoe recovers. Suppress that genuine occlusion sliver, not pixels
    // from any neighbouring anatomical part.
    renderCleanIslandsMaxPixels:15,
    // Short contact intervals use real, separately isolated boot pigments.
    // The under-robe calf geometry is dynamically painted by this module.
    sourceContactScope:'source-root math only; not gameplay world-contact proof',
};

export const poses=Array.from({length:16},(_,i)=>{
    const left=offset(i,0),right=offset(i,8);
    const phase=2*Math.PI*i/16;
    const bob=1.35*Math.cos(4*phase)-1.35;
    const hem=2.2*Math.sin(phase);
    const staffX=1.8*Math.sin(phase);
    const staffY=bob-1.5+1.1*Math.sin(2*phase);
    return [0,bob,
        -.45*Math.sin(phase),left.y,left.lift,
        .45*Math.sin(phase),right.y,right.lift,
        hem,staffX,staffY,.02*Math.sin(phase)];
});
export const idle=Array(12).fill(0);
export {staffTip,staffGrip,staffPoint};

export function transform(name,x,y,p){
    if(name==='boot-left')return [x+p[2],y+p[3]-p[4]];
    if(name==='boot-right')return [x+p[5],y+p[6]-p[7]];
    if(name==='shin-left'||name==='shin-right')return [x,y];
    return baseTransform(name,x,y,p);
}

// A discrete authored trouser cuff, behind the *one-piece* robe and the shoe.
// It follows the actual shoe upper, never samples staff/robe/shoe pixels.
export function paintDynamicShins(dst,p){
    if(p.every(v=>v===0))return; // preserve the approved idle recomposition.
    for(const [hip,ankle,dx,dy,lift] of [
        [67,71,p[2],p[3],p[4]],
        [94,100,p[5],p[6],p[7]],
    ]){
        const soleTop=Math.round(127+dy-lift);
        for(let y=121;y<=Math.min(soleTop+4,157);y++){
            const t=Math.max(0,Math.min(1,(y-121)/(Math.max(1,soleTop-117))));
            const c=Math.round(hip+(ankle-hip)*t+dx*t*t-Math.sin(t*Math.PI)*.8);
            // Dark taper and uneven side silhouette: a pant leg with a folded
            // knee, not a pasted rectangular shoe-colored extrusion.
            const w=y>soleTop-2?3:y<126?3:Math.round(2.5+Math.sin(t*Math.PI));
            for(let x=c-w;x<=c+w;x++){
                const tone=x===c-w?colors.outline:x===c+w?colors.shadow:
                    x===c-1&&y%5===1?colors.cloth:colors.shadow;
                dst.set(x,y,[...tone,255]);
            }
        }
    }
}

export function sourceContacts(warp,layers,framePoses=poses){
    const records=[];
    for(const [name,frames] of [['boot-left',[0,1,2]],['boot-right',[8,9,10]]]){
        const worldSoles=frames.map(i=>{
            const b=warp(layers[name],name,framePoses[i]).opaqueBounds();
            return b.y+b.h-1+project.rootPerFrame[1]*i;
        });
        const spread=Math.max(...worldSoles)-Math.min(...worldSoles);
        if(spread>1)throw Error('Run support shoe skates in source frame: '+name+' '+spread);
        records.push({name,frames:[frames[0],frames.at(-1)],sourceRasterSoleWorldY:worldSoles,maxSpreadNativePixels:spread,
            scope:'isolated boot contact in source-root coordinates; not Hunt visual acceptance'});
    }
    return records;
}
