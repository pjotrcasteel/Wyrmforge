// Editable offline 2D source specification. No runtime engine or 3D dependency.
export const project={
    id:'grey-wizard-fire-south-gothic-v003',source:'gothic-sampling-v002/gothic-128px.png',
    sourceCell:[72,136],exportCell:160,offset:[20,10],sourcePivot:[36,131],
    paletteSize:96,bleed:2,direction:'S',frames:16,fps:12,sourceStride:32,
    status:'appearance/motion study; NOT artistically or runtime approved',
    // Ordered masks are drawn source coordinates; first matching layer owns pixel.
    // Remaining pixels become the inner robe/torso. Textures remain editable PNGs.
    masks:[
        {name:'boot-left',polygon:[[20,115],[28,115],[30,122],[30,129],[26,133],[16,133],[16,128],[20,123]]},
        {name:'boot-right',polygon:[[43,115],[51,115],[53,123],[57,128],[57,133],[45,133],[41,129],[43,122]]},
        {name:'staff-hand',polygon:[[8,48],[14,48],[15,55],[12,57],[8,55]]},
        {name:'staff',polygon:[[8,12],[15,13],[17,28],[15,36],[14,47],[15,64],[16,92],[16,132],[10,132],[11,104],[10,78],[9,58],[7,42],[6,29],[6,20]]},
        {name:'hat',polygon:[[16,2],[51,2],[55,23],[52,27],[43,27],[30,27],[18,26],[14,23]]},
        {name:'beard',polygon:[[29,29],[40,29],[41,36],[38,43],[34,49],[31,43],[29,37]]},
        {name:'head-hair',polygon:[[23,22],[43,22],[46,30],[45,36],[40,39],[28,39],[22,34]]},
        {name:'arm-staff',polygon:[[23,33],[26,38],[23,45],[22,52],[18,58],[13,58],[11,56],[15,48],[18,41],[19,36]]},
        {name:'arm-free',polygon:[[50,42],[54,46],[58,56],[61,65],[64,72],[63,79],[59,82],[55,78],[55,70],[51,65]]},
        {name:'cloak-left',polygon:[[24,41],[30,43],[28,62],[26,81],[27,99],[25,116],[21,123],[15,123],[12,116],[5,116],[3,107],[6,93],[10,79],[14,63],[18,49]]},
        {name:'cloak-right',polygon:[[42,38],[49,38],[53,44],[54,60],[57,73],[60,86],[64,99],[69,115],[66,124],[57,126],[51,122],[48,120],[46,106],[44,87],[44,63]]},
    ],
    drawOrder:['boot-left','boot-right','torso','cloak-left','cloak-right','arm-staff','arm-free','head-hair','beard','hat','staff','staff-hand'],
};

// Authored translation/rotation/cloth control keys. Feet alternate contact/pass;
// the body and cloth use a deforming 2D grid rather than one rigid cutout.
// [bodyX,bodyY,leftFootX,leftFootY,leftAngle,rightFootX,rightFootY,rightAngle,
//  freeHandY,staffHandY,staffAngle,beardLag,hemLag]
export const poses=[
    [-.7,0,-.6,8,0,.6,-6,.08,1.2,-.5,-.018,.3,-.6],
    [-.9,.5,-.6,6,0,.6,-7,.1,.6,-.8,-.016,.5,-.3],
    [-1,1,-.4,4,0,.4,-5,.08,0,-1,-.012,.6,0],
    [-.8,1,-.2,2,0,.2,-2,.04,-.6,-.8,-.008,.5,.3],
    [-.5,.5,0,0,0,0,2,-.02,-1,-.4,-.004,.3,.5],
    [-.2,0,.2,-2,0,-.2,5,-.04,-1.2,0,0,0,.6],
    [0,-.3,.4,-4,0,-.4,7,-.02,-1,.4,.006,-.3,.5],
    [.3,-.2,.6,-6,.02,-.6,8,0,-.6,.8,.012,-.5,.3],
    [.7,0,.6,-6,.08,-.6,8,0,-1.2,.5,.018,-.3,.6],
    [.9,.5,.6,-7,.1,-.6,6,0,-.6,.8,.016,-.5,.3],
    [1,1,.4,-5,.08,-.4,4,0,0,1,.012,-.6,0],
    [.8,1,.2,-2,.04,-.2,2,0,.6,.8,.008,-.5,-.3],
    [.5,.5,0,2,-.02,0,0,0,1,.4,.004,-.3,-.5],
    [.2,0,-.2,5,-.04,.2,-2,0,1.2,0,0,0,-.6],
    [0,-.3,-.4,7,-.02,.4,-4,0,1,-.4,-.006,.3,-.5],
    [-.3,-.2,-.6,8,0,.6,-6,.02,.6,-.8,-.012,.5,-.3],
];
export const idle=Array(13).fill(0);
