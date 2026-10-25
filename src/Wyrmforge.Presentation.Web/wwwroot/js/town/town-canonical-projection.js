// T1/T2: camera-matched 3D relief and semantic volumes of the approved Town painting.
// Existing night-active.webp/day-active.webp remain the single source of visible color.
// The Town camera is fixed in production. Orbit is diagnostic only: this is a
// single-view reconstruction, not an arbitrary-angle photogrammetric scan.
export const FRAME = Object.freeze({width:1672,height:941,pixelsPerMetre:94.1,columns:216,rows:122});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const rect=(x,y,l,t,r,b,w=22)=>1-smooth(0,w,Math.hypot(Math.max(l-x,0,x-r),Math.max(t-y,0,y-b)));
const oval=(x,y,cx,cy,rx,ry)=>1-smooth(.94,1.04,Math.hypot((x-cx)/rx,(y-cy)/ry));
export function townPaintedDepth(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y))throw new RangeError('Invalid source painting coordinate');
  let depth=-3.8+1.7*smooth(50,880,y)+2.5*smooth(120,540,y);
  const gate=rect(x,y,605,32,1070,347,48)*(1-smooth(315,360,y));
  const turrets=Math.max(rect(x,y,610,12,736,245,18),rect(x,y,955,12,1070,245,18));
  depth+=(.85*gate+1.2*turrets)*(1-.6*oval(x,y,841,221,127,151));
  depth+=.95*oval(x,y,841,487,115,83)+1.1*rect(x,y,774,379,912,463,12);
  depth+=1.4*rect(x,y,0,300,475,820,40)*(1-smooth(480,650,x));
  depth+=1.4*rect(x,y,1250,290,1672,820,40)*smooth(1080,1220,x);
  depth+=1.15*rect(x,y,0,0,440,290,55)+1.15*rect(x,y,1230,0,1672,310,55);
  return depth+1.5*rect(x,y,0,810,1672,940,90);
}
const volume=(id,depth,thickness,points)=>({id,depth,thickness,points});
export const TOWN_SEMANTIC_VOLUMES=Object.freeze([
  volume('arcane-nexus-walls',1.75,1.55,[[0,122],[67,82],[94,88],[124,57],[171,32],[203,43],[217,111],[260,130],[300,184],[310,331],[264,345],[202,362],[120,342],[51,364],[0,339]]),
  volume('arcane-nexus-roof',2.1,1.2,[[125,79],[133,48],[168,14],[196,0],[236,21],[258,91],[241,118],[205,119],[164,109]]),
  volume('arcane-nexus-portal',2.45,.3,[[370,212],[393,183],[420,166],[451,190],[477,240],[468,285],[412,305],[380,274]]),
  volume('blacksmith-facade',2.25,1.3,[[0,507],[40,447],[102,434],[151,447],[204,493],[226,581],[188,631],[0,652]]),
  volume('blacksmith-roof',2.5,.85,[[0,457],[32,430],[112,390],[182,402],[242,463],[242,509],[178,484],[79,478],[0,509]]),
  volume('hall-of-fame-facade',1.85,1.6,[[1153,167],[1188,128],[1252,98],[1292,54],[1325,20],[1384,48],[1431,111],[1534,121],[1655,94],[1672,149],[1672,386],[1559,404],[1503,376],[1308,390],[1205,339]]),
  volume('hall-of-fame-roof',2.25,1,[[1170,114],[1196,70],[1272,76],[1320,24],[1347,0],[1381,11],[1420,72],[1504,84],[1541,112],[1564,68],[1653,35],[1672,68],[1672,159],[1593,180],[1507,167],[1352,144],[1260,191]]),
  volume('codex-facade',2.65,1.75,[[1100,518],[1142,430],[1190,406],[1263,376],[1335,328],[1402,359],[1474,399],[1530,435],[1625,452],[1672,495],[1672,814],[1579,841],[1470,826],[1354,813],[1214,790],[1123,696]]),
  volume('codex-roof',3,.95,[[1101,477],[1177,405],[1216,376],[1315,325],[1363,315],[1427,374],[1488,415],[1570,408],[1672,463],[1672,534],[1548,503],[1463,493],[1327,438],[1238,454],[1133,535]]),
  volume('world-gate-west',1.45,.75,[[606,50],[630,32],[650,44],[735,43],[735,251],[708,266],[605,266]]),
  volume('world-gate-east',1.45,.75,[[947,45],[1010,40],[1073,56],[1070,268],[966,278],[944,253]]),
  volume('world-gate-arch',1.58,.9,[[722,40],[956,40],[960,174],[931,167],[918,146],[893,117],[841,95],[789,117],[755,160],[734,190],[724,213]]),
  volume('world-gate-west-banner',1.75,.045,[[655,81],[696,81],[700,202],[677,223],[657,203]]),
  volume('world-gate-east-banner',1.75,.045,[[986,80],[1027,81],[1024,204],[1008,224],[988,201]]),
  volume('world-gate-west-foreground',2.05,.7,[[576,234],[637,236],[635,379],[577,374]]),
  volume('world-gate-east-foreground',2.05,.7,[[1040,233],[1105,241],[1097,377],[1035,376]]),
  // Trace the SAME polygons as the accepted nexus-v2-well-foreground.svg.
  volume('well-roof',3.62,.26,[[818,439],[823,426],[830,411],[832,401],[841,400],[854,404],[871,408],[888,412],[905,417],[916,418],[927,433],[931,441],[926,448],[917,444],[906,466],[898,463],[884,456],[867,448],[852,445],[833,440]]),
  volume('well-west-post',3.62,.13,[[833,444],[839,447],[838,507],[831,508],[831,455]]),
  volume('well-east-post',3.62,.13,[[890,458],[896,460],[896,512],[888,514],[887,470]]),
  volume('well-masonry',3.73,.35,[[819,508],[831,501],[844,503],[866,503],[884,505],[898,510],[907,519],[909,528],[905,537],[895,541],[851,544],[826,540],[818,533],[816,520]]),
  // Trace the same boundaries as nexus-v2-noticeboard-foreground.svg.
  volume('noticeboard-panel',3.9,.22,[[731,454],[731,449],[738,445],[757,442],[775,437],[793,433],[799,431],[802,433],[803,437],[803,486],[799,492],[739,507],[733,505]]),
  volume('noticeboard-west-post',3.9,.12,[[733,505],[739,503],[740,532],[734,534]]),
  volume('noticeboard-east-post',3.9,.12,[[797,435],[801,431],[805,435],[806,439],[807,525],[800,528],[797,525]])
]);
export function createTownProjection(T,basis) {
  const right=basis.right,up=basis.up,toward=basis.toward;
  const scale=1/FRAME.pixelsPerMetre,originX=FRAME.width/2,originY=FRAME.height/2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function point(x,y,depth) {
    return right.clone().multiplyScalar((x-originX)*scale)
       .addScaledVector(up,(originY-y)*scale).addScaledVector(toward,depth);
  }
  const position=[],uv=[],index=[];
  const columns=FRAME.columns,rows=FRAME.rows;
  let min=Infinity,max=-Infinity;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const x=i/columns*FRAME.width,y=j/rows*FRAME.height,d=townPaintedDepth(x,y);
    min=Math.min(d,min);max=Math.max(d,max);
    position.push(...point(x,y,d).toArray());uv.push(x/FRAME.width,1-y/FRAME.height);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;
    index.push(a,c,b,b,c,d);
  }
  const base=new T.BufferGeometry();
  base.setAttribute('position',new T.Float32BufferAttribute(position,3));
  base.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  base.setIndex(index);base.computeVertexNormals();
  const volumes=TOWN_SEMANTIC_VOLUMES.map(mask=>{
    const outline=new T.Shape();
    for(const [i,[x,y]] of mask.points.entries()){
      if(i===0)outline.moveTo((x-originX)*scale,(originY-y)*scale);
      else outline.lineTo((x-originX)*scale,(originY-y)*scale);
    }
    outline.closePath();
    const geometry=new T.ExtrudeGeometry(outline,{depth:mask.thickness,bevelEnabled:false,curveSegments:1,steps:1});
    const verts=geometry.getAttribute('position'),coords=geometry.getAttribute('uv');
    for(let i=0;i<verts.count;i++){
      const x=verts.getX(i),y=verts.getY(i),d=mask.depth-verts.getZ(i);
      const world=right.clone().multiplyScalar(x).addScaledVector(up,y).addScaledVector(toward,d);
      verts.setXYZ(i,world.x,world.y,world.z);
      coords.setXY(i,clamp(originX+x/scale,0,FRAME.width)/FRAME.width,
         1-clamp(originY-y/scale,0,FRAME.height)/FRAME.height);
    }
    verts.needsUpdate=true;coords.needsUpdate=true;geometry.computeVertexNormals();
    return {id:'town.canonical.'+mask.id,geometry,thickness:mask.thickness,depth:mask.depth};
  });
  return {base,volumes,stats:Object.freeze({sourcePixels:[FRAME.width,FRAME.height],
    vertices:position.length/3,triangles:index.length/3,depthMin:min,depthMax:max,
    volumeCount:volumes.length,nonPlanar:true})};
}
