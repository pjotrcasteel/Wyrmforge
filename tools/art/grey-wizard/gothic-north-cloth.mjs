// v021: fix garment cracks at their actual cause (forward mesh raster holes),
// then add height-delayed cloth inertia to one continuous embroidered robe.
// No separate cape is created. Every garment output pixel comes from its own
// semantic source layer; no cross-part paint sampling or alpha-hole patching.
import {
    project as base,poses as organicPoses,staffTip,staffGrip,staffPoint,
    paintDynamicShins,sourceContacts as organicContacts,
    transform as organicTransform,
} from './gothic-north-organic.mjs';

const clamp=x=>Math.max(0,Math.min(1,x));
const TAU=Math.PI*2;
const wood={
    outline:[40,25,16],edge:[88,53,36],
    leather:[73,47,33],highlight:[111,62,39],
};
const hiddenWoodRows=[
    ...Array.from({length:14},(_,i)=>[99+i,108,111]),
    ...Array.from({length:11},(_,i)=>[113+i,105,109]),
    ...Array.from({length:5},(_,i)=>[124+i,103,107]),
];
const robeIndex=base.drawOrder.indexOf('robe');
export const project={
    ...base,
    id:'grey-wizard-fire-north-run-v021',outputDirectory:'gothic-north-v021',
    status:'N native-layer inverse cloth deformation, physically timed legs; owner visual review OPEN',
    staffStrictWoodGuard:true,
    paintedUnderlays:[...base.paintedUnderlays,{
        name:'staff-occluded',colors:wood,rows:hiddenWoodRows,behind:['robe'],
    }],
    drawOrder:[...base.drawOrder.slice(0,robeIndex),'staff-occluded',...base.drawOrder.slice(robeIndex)],
    inversePixelLayers:[
        'robe','arm-free','arm-staff','free-arm-underlay','sleeve-underlay',
        'staff','staff-hand','wrist-cuff','staff-occluded',
    ],
};
export const poses=organicPoses.map((p,i)=>[...p,TAU*i/16]);
export const idle=Array(12).fill(0);
export {staffTip,staffGrip,staffPoint,paintDynamicShins};
export function sourceContacts(warp,layers){return organicContacts(warp,layers);}

export function transform(name,x,y,p){
    if(name==='staff-occluded')return staffPoint(x,y,p);
    const q=organicTransform(name,x,y,p);
    if(name!=='robe')return q;
    if(p.length<18)return q; // exact reference idle: no animated cloth lag.
    // Weight is borne at shoulders and drags behind toward the scalloped hem.
    // Fold travel is delayed further down the garment and across its width.
    const low=clamp((y-74)/67),hem=low*low;
    const across=clamp((x-55)/48)*2-1;
    const phase=(p[17]??0)-.58*low-.18*across;
    const waveX=hem*(1.05+.3*Math.abs(across))*Math.sin(phase);
    const waveY=hem*(.72*Math.cos(phase*2-across)-.35*Math.sin(phase));
    return [q[0]+waveX,q[1]+waveY];
}
