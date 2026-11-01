// v017 N arm follow-up: preserve v016 garment/boot/staff source ownership and
// author a separate wrist cuff plus occluded shoulder pigment. This is still
// offline sprite animation, not a runtime skeleton or gameplay subsystem.
import {
    project as base,poses,idle,staffTip,staffGrip,staffPoint,
    sourceContacts,transform as baseTransform,
} from './gothic-north-rebuild.mjs';

const hex=s=>[0,2,4].map(i=>parseInt(s.slice(i,i+2),16));
const grey={
    outline:hex('3c3738'),edge:hex('605653'),
    leather:hex('675b54'),highlight:hex('837368'),
};
const armIndex=base.masks.findIndex(mask=>mask.name==='arm-staff');
const cuff={name:'wrist-cuff',polygon:[
    [104,60],[111,61],[113,68],[111,78],[105,78],[102,70],
]};
const rows=Array.from({length:24},(_,i)=>[59+i,100,111]);

export const project={
    ...base,
    id:'grey-wizard-fire-north-walk-v017',outputDirectory:'gothic-north-v017',
    status:'N shoulder/wrist source articulation review; not artistically or runtime accepted',
    masks:[...base.masks.slice(0,armIndex),cuff,...base.masks.slice(armIndex)],
    paintedUnderlays:[...base.paintedUnderlays,{
        name:'sleeve-underlay',colors:grey,rows,
        behind:['arm-staff','wrist-cuff'],
    }],
    drawOrder:[...base.drawOrder.slice(0,base.drawOrder.indexOf('arm-staff')),
        'sleeve-underlay','arm-staff','wrist-cuff','staff','staff-hand'],
};

export {poses,idle,staffTip,staffGrip,staffPoint,sourceContacts};
const clamp=x=>Math.max(0,Math.min(1,x));
export function transform(name,x,y,p){
    if(name==='wrist-cuff')return staffPoint(x,y,p);
    if(name==='arm-staff'){
        // Upper shoulder stays planted in the robe. The forearm drape bends
        // softly toward the travelling grip, while painted occluded grey cloth
        // supports the vacated surface beneath the real cuff pixels.
        const nearWrist=clamp((x-98)/13)*clamp((90-y)/31);
        return [x+p[9]*.6*nearWrist,y+p[10]*.65*nearWrist];
    }
    if(name==='sleeve-underlay')return [x,y];
    return baseTransform(name,x,y,p);
}
