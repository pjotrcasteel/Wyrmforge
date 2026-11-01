// Independent north source repair after rejected v015. An arbitrary robe split
// and broad staff polygon moved actual garment pixels with the stick. This
// project does not import or distribute that rejected animation.

const hex=s=>[0,2,4].map(i=>parseInt(s.slice(i,i+2),16));
const leather={outline:hex('2e1a11'),edge:hex('4a3429'),leather:hex('5a4336'),highlight:hex('795037')};
const rows=(start,end,shape)=>Array.from({length:end-start+1},(_,index)=>[start+index,...shape(start+index)]);
const shaftBands=[
    [68,76,110,117], [77,90,110,116], [91,100,109,115],
    [101,112,107,113], [113,125,105,111], [126,128,103,108],
];
const staffRows=shaftBands.flatMap(([first,last,left,right])=>
    Array.from({length:last-first+1},(_,i)=>[first+i,left,right]));

export const project={
    id:'grey-wizard-fire-north-walk-v016',outputDirectory:'gothic-north-v016',
    source:'gothic-directions-v005/N.png',sourceCell:[160,160],exportCell:160,
    offset:[0,0],sourcePivot:[77,136],direction:'N',frames:16,fps:12,
    paletteSize:96,cleanIslandsMaxPixels:6,
    noBleedLayers:['boot-left','boot-right'],noBleedBelowSourceY:124,
    protectStaffFootprint:true,walkingStick:true,
    clothReviewCrop:[59,65,93,109],
    // Source concept fades the shaft before sole height. Extend only the same
    // wooden stick with its own native pigment; never sample garment pixels.
    extendStaffToGround:{fromY:129,toY:141,left:102,right:105,donorY:131,donorRows:1},
    status:'N semantic source rebuild in art review; not locomotion/material/phone accepted',
    fallbackLayer:'robe',bleed:0,cleanIslandsMaxPixels:6,
    // Subpixel staff/foot plant samples can repeat the preceding raster; never
    // invent deformation merely to force 16 mathematically distinct images.
    minUniqueFrames:12,
    sourceStride:8,rootPerFrame:[0,-.5],staffPlantStart:8,
    // The dark shaft uses explicit small rows; reject grey sleeve pixels even
    // where they touch the old staff polygon.
    staffRows,staffMaterialGuard:{fromY:68,darkMax:0,strictFromY:98,minRedLead:13},
    masks:[
        {name:'boot-left',polygon:[[58,129],[73,127],[78,132],[76,141],[65,144],[59,141]]},
        {name:'boot-right',polygon:[[88,128],[102,126],[104,135],[101,143],[88,143],[86,135]]},
        {name:'staff-hand',polygon:[[109,57],[118,56],[118,66],[114,71],[107,70],[106,63]]},
        {name:'staff',polygon:[[110,29],[119,28],[122,42],[118,53],[115,62],
            [114,76],[112,91],[110,107],[108,123],[105,130],[103,139],
            [99,139],[99,127],[104,107],[107,83],[108,65],[108,45]]},
        {name:'hat',polygon:[[70,14],[86,14],[92,23],[94,28],[104,31],
            [105,40],[94,45],[62,45],[57,38],[65,29]]},
        {name:'head-hair',polygon:[[64,40],[98,40],[101,48],[95,57],[69,57],[62,49]]},
        {name:'arm-free',polygon:[[51,60],[64,59],[65,83],[60,95],[49,93],[45,82]]},
        {name:'arm-staff',polygon:[[96,59],[108,59],[113,68],[113,89],
            [108,104],[97,99],[91,84]]},
    ],
    // Real occluded body parts, drawn *behind* the single continuous robe.
    // These columns follow boot position but are never sampled from a shoe or
    // repeated across the cloak. Each row is an intentional leather brush.
    paintedUnderlays:[
        {name:'shin-left',colors:leather,rows:rows(117,132,y=>{
            const taper=y<121?1:0;return [64+taper,70];
        })},
        {name:'shin-right',colors:leather,rows:rows(116,132,y=>{
            const taper=y<121?1:0;return [91+taper,97+(y>125?1:0)];
        })},
    ],
    drawOrder:['shin-left','shin-right','boot-left','boot-right','robe',
        'arm-free','head-hair','hat','arm-staff','staff','staff-hand'],
};

// A compact eight-pixel source stride. Support soles advance only four pixels
// while the opposing boot recovers beneath the hem; the staff is planted in
// world space through the second support half, rather than translating 8px.
export const poses=Array.from({length:16},(_,i)=>{
    const first=i<8,t=(i%8)/7,step=3.5;
    const leftY=first?step*t:step*(1-t),rightY=first?step*(1-t):step*t;
    const leftLift=first?0:1.5*Math.sin(Math.PI*t);
    const rightLift=first?1.5*Math.sin(Math.PI*t):0;
    const staffY=first?-1.5*Math.sin(Math.PI*t):step*t;
    return [0,0,
        first?0:-.7*Math.sin(Math.PI*t),leftY,leftLift,
        first?.7*Math.sin(Math.PI*t):0,rightY,rightLift,
        1.35*Math.sin(2*Math.PI*i/16),
        first?.8*Math.sin(Math.PI*t):0,staffY,
        first?-.012*Math.sin(Math.PI*t)-.01*t:0];
});
export const idle=Array(12).fill(0);
export const staffTip=[103.5,141],staffGrip=[112,64];
const clamp=x=>Math.max(0,Math.min(1,x));
export function staffPoint(x,y,p){
    const a=p[11],dx=x-staffTip[0],dy=y-staffTip[1];
    return [staffTip[0]+dx*Math.cos(a)-dy*Math.sin(a)+p[9],
        staffTip[1]+dx*Math.sin(a)+dy*Math.cos(a)+p[10]];
}
export function transform(name,x,y,p){
    if(name==='boot-left'||name==='shin-left'||name==='boot-right'||name==='shin-right'){
        const left=name.endsWith('left');
        return [x+(left?p[2]:p[5]),y+(left?p[3]-p[4]:p[6]-p[7])];
    }
    if(name==='staff'||name==='staff-hand')return staffPoint(x,y,p);
    // A moving sleeve mesh makes a horizontal hole at the shoulder. Until an
    // actual elbow/cuff underlay is drawn, the sleeve remains native and only
    // its independently selected hand follows the staff. No false warping.
    if(name==='arm-staff')return [x,y];
    if(name==='robe'){
        // One continuous piece of cloth, including embroidered back panel.
        // Shoulder folds remain anchored; the weighted hem follows the gait.
        const hem=clamp((y-76)/64);
        return [x+p[8]*hem*hem,y];
    }
    return [x,y];
}
export function sourceContacts(warp,layers){
    const records=[];
    for(const [name,start] of [['boot-left',0],['boot-right',8]]){
        const sole=[];
        for(let i=start;i<start+8;i++){
            const b=warp(layers[name],name,poses[i]).opaqueBounds();
            sole.push(b.y+b.h-1+project.rootPerFrame[1]*i);
        }
        const drift=Math.max(...sole)-Math.min(...sole);
        records.push({name,frames:[start,start+7],sourceRasterSoleWorldY:sole,maxSpreadNativePixels:drift});
    }
    const tips=[];
    for(let i=project.staffPlantStart;i<16;i++){
        const q=staffPoint(...staffTip,poses[i]);
        tips.push([q[0],q[1]+project.rootPerFrame[1]*i]);
    }
    const spread=Math.max(...tips.map(p=>p[1]))-Math.min(...tips.map(p=>p[1]));
    if(spread>1e-8)throw Error('Planted north staff tip has world drift');
    records.push({name:'staff-tip',frames:[project.staffPlantStart,15],sourceWorldTipXY:tips,
        maxSpreadNativePixels:spread,analyticalDrift:spread,staffHandGripError:0,
        scope:'source-root planted contact, C# speed unverified'});
    return records;
}
