// Fast normal-movement gait, distinct from the slow staff-planted walk.
// C# player speed remains 190 world units/s. The existing distance-driven
// sprite player therefore traverses one cycle per 95 world units: 2 Hz,
// 32 source frames/s over a 16-frame cycle. No fixed-time gameplay clock.
import {
    project as slow,staffTip,staffGrip,staffPoint,
    transform as slowTransform,
} from './gothic-north-arm.mjs';

const BASE_PLAYER_SPEED=190;
const RUN_CYCLES_PER_SECOND=2;
const SOURCE_FPS=32;
const WORLD_STRIDE=BASE_PLAYER_SPEED/RUN_CYCLES_PER_SECOND;
const NATIVE_STRIDE=WORLD_STRIDE*slow.exportCell/72.944643;
const ROOT_Y_PER_FRAME=-NATIVE_STRIDE/16;
const clamp=x=>Math.max(0,Math.min(1,x));
const trouser={outline:[60,55,56],edge:[73,66,65],leather:[103,91,84],highlight:[131,115,104]};
const hiddenRows=(first,last,left,right)=>Array.from({length:last-first+1},(_,i)=>[
    first+i,left+(i<3?1:0),right-(i<3?1:0),
]);

export const project={
    ...slow,
    id:'grey-wizard-fire-north-run-v018',outputDirectory:'gothic-north-v018',
    status:'N 190-world-units/s run cadence study; ground contacts and art unapproved',
    clipName:'run',fps:SOURCE_FPS,previewBaseSpeed:BASE_PLAYER_SPEED,
    sourceStride:NATIVE_STRIDE,runtimeWorldStride:WORLD_STRIDE,
    rootPerFrame:[0,ROOT_Y_PER_FRAME],walkingStick:false,staffPlantStart:null,
    sourceContactVerified:false,
    minUniqueFrames:16,
    // The slow-walk leather blocks exposed long rectangles at run cadence.
    // Repaint just the covered trouser cuffs, with narrowed shadow silhouettes.
    paintedUnderlays:[
        {name:'shin-left',colors:trouser,rows:hiddenRows(123,133,64,70)},
        {name:'shin-right',colors:trouser,rows:hiddenRows(122,132,91,98)},
        ...slow.paintedUnderlays.filter(part=>part.name==='sleeve-underlay'),
    ],
    rigidPixelLayers:['boot-left','boot-right','shin-left','shin-right'],
};

// An artifact-safe fast-gait rehearsal. We explicitly do *not* claim that the
// modest source shoe travel is physically planted against the full game root.
// A failed 13px-per-frame contact experiment exposed missing knee/hem anatomy;
// preserve the original clean footwear rather than ship long floating shins.
export const poses=Array.from({length:16},(_,i)=>{
    const first=i<8,t=(i%8)/7,step=4;
    const leftY=first?step*t:step*(1-t),rightY=first?step*(1-t):step*t;
    const leftLift=first?0:2*Math.sin(Math.PI*t);
    const rightLift=first?2*Math.sin(Math.PI*t):0;
    const bodyY=-.8*(1-Math.cos(2*Math.PI*i/8))/2;
    const phase=2*Math.PI*i/16;
    const staffX=1.2*Math.sin(phase),staffY=bodyY-1+.7*Math.sin(2*phase);
    return [0,bodyY,first?0:-1.2*Math.sin(Math.PI*t),leftY,leftLift,
        first?1.2*Math.sin(Math.PI*t):0,rightY,rightLift,
        1.5*Math.sin(phase),staffX,staffY,.016*Math.sin(phase)];
});
export const idle=Array(12).fill(0);
export {staffTip,staffGrip,staffPoint};

export function transform(name,x,y,p){
    if(name==='shin-left'||name==='shin-right')return [x,y];
    if(name==='boot-left')return [x+p[2],y+p[3]-p[4]];
    if(name==='boot-right')return [x+p[5],y+p[6]-p[7]];
    if(name==='robe'){
        const q=slowTransform(name,x,y,p);
        return [q[0],q[1]+p[1]];
    }
    if(name==='hat'||name==='head-hair'||name==='arm-free'||name==='sleeve-underlay')
        return [x,y+p[1]];
    if(name==='arm-staff'){
        const q=slowTransform(name,x,y,p);
        const nearWrist=clamp((x-98)/13)*clamp((90-y)/31);
        return [q[0],q[1]+p[1]*(1-nearWrist*.5)];
    }
    return slowTransform(name,x,y,p);
}

export function sourceContacts(){return [];} // Ground-grid contact is NOT accepted.
