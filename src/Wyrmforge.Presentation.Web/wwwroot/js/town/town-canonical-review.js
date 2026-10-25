// T2: the EXISTING GPU LightingEngine renders the approved Town on genuine
// metre-scale 3D depth and extruded semantic volumes. Not a competing renderer.
// Production uses a fixed camera. A side-orbit reveals the single-view
// reconstruction's limitations and is restricted to QA, never production.
import * as T from '../lighting/vendor/three.module.js';
import {LightingEngine} from '../lighting/engine.js';
import {FRAME,createTownProjection,townPaintedDepth} from './town-canonical-projection.js';

const VALID_MODES=new Set(['night','day','zero','relight']);
const VALID_DISTRICTS=new Set(['west','center','east']);
const DEFAULT_FACING='center';
function shaderMaterial(mode) {
  // The approved 1672x941 paintings provide the original surface detail,
  // while the shared GPU physical BRDF computes live lighting and shadows.
  // The single-view reconstruction is camera-authoritative, not a complete
  // de-lit material scan. Zero-light still disables ALL emission and lights.
  return {id:'town.canonical.approved-paint',color:'#ffffff',
    roughness:1,metalness:0,specular:.22,reflection:'off',
    emission:'#000000',emissionIntensity:0,
    albedo:mode==='day'?'town.canonical.day':'town.canonical.night',
    alphaCutoff:0,doubleSided:true};
}
function lightingObjects(projection,receivesLight) {
  const ids=[{id:'town.canonical.relief',geometry:'town.canonical.relief'},
    ...projection.volumes.map(v=>({id:v.id,geometry:v.id}))];
  return ids.map(obj=>({id:obj.id,ownerId:obj.id,geometry:obj.geometry,
    material:'town.canonical.approved-paint',position:[0,0,0],rotation:[0,0,0],
    scale:[1,1,1],receivesLight,receivesShadow:true,castsShadow:true}));
}
function referenceLights(mode,right,up,toward){
  if(mode==='zero')return [];
  const originX=FRAME.width/2,originY=FRAME.height/2,scale=1/FRAME.pixelsPerMetre;
  const pts=[[842,220,2.2,'#ffba67',18],[680,222,1.5,'#ffa251',8],
    [992,220,1.5,'#ffa251',8],[912,461,1.5,'#ffb570',14]];
  const strength=mode==='relight'?1:.1;
  return pts.map(([x,y,offset,color,intensity],i)=>{
    const position=right.clone().multiplyScalar((x-originX)*scale)
      .addScaledVector(up,(originY-y)*scale)
      .addScaledVector(toward,townPaintedDepth(x,y)+offset).toArray();
    return {id:'town.review.fixture.'+i,ownerId:'town.review.fixture.'+i,
      type:'point',enabled:true,position,direction:[0,0,-1],color,intensity:intensity*strength,
      range:8,coneAngle:.8,penumbra:.25,castsShadow:i===0,priority:10-i};
  });
}
export async function initializeTown3DReview(canvas,status,options={}) {
  if(!(canvas instanceof HTMLCanvasElement))throw new TypeError('Town 3D canvas expected');
  const params=new URLSearchParams(location.search);
  let mode=options.mode??params.get('mode')??'night';
  let district=options.district??params.get('district')??DEFAULT_FACING;
  let orbit=0,view='lit',disposed=false;
  if(!VALID_MODES.has(mode)||!VALID_DISTRICTS.has(district))
    throw new RangeError('Unknown Town lighting or district');
  const engine=new LightingEngine(canvas,{shadowViews:8,maxLights:8});
  // Match sRGB colors from the owner's painting without tone-map desaturation.
  // This changes only this engine instance, not the G1-G3 shared engine defaults.
  engine.renderer.toneMapping=T.NoToneMapping;
  engine.setCamera([0,0,0],2.5);
  engine.camera.updateMatrixWorld(true);
  const right=new T.Vector3().setFromMatrixColumn(engine.camera.matrixWorld,0);
  const up=new T.Vector3().setFromMatrixColumn(engine.camera.matrixWorld,1);
  const toward=new T.Vector3().setFromMatrixColumn(engine.camera.matrixWorld,2);
  const projection=createTownProjection(T,{right,up,toward});
  engine.registerGeometry('town.canonical.relief',projection.base);
  for(const part of projection.volumes)engine.registerGeometry(part.id,part.geometry);

  const assetBase=new URL('../../art/town/',import.meta.url);
  const textures={};
  for(const [name,file] of [['night','night-active.webp'],['day','day-active.webp']]){
    const texture=await new T.TextureLoader().loadAsync(new URL(file,assetBase).href);
    texture.minFilter=texture.magFilter=T.LinearFilter;
    texture.generateMipmaps=false;
    texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;
    engine.registerTexture('town.canonical.'+name,texture);
    textures[name]=texture;
  }
  let lastGeometry={...projection.stats};
  const cameraSourceWidth=()=>{
    const width=canvas.clientWidth||390,height=canvas.clientHeight||844;
    return FRAME.height*width/height;
  };
  function render(){
    if(disposed)return;
    const relit=mode==='relight',zero=mode==='zero';
    const {width:sourceWidth}=FRAME;
    const cameraIndex={west:0,center:1,east:2}[district];
    const full=params.get('full')==='1';
    const desiredWidth=full?sourceWidth:cameraSourceWidth();
    const visibleSourceWidth=canvas.clientWidth>=800?
      Math.max(sourceWidth,desiredWidth):desiredWidth;
    const centerX=full?FRAME.width/2:(cameraIndex+.5)*FRAME.width/3;
    const target=right.clone().multiplyScalar((centerX-FRAME.width/2)/FRAME.pixelsPerMetre).toArray();
    engine.apply({version:1,time:0,materials:[shaderMaterial(mode)],
      objects:lightingObjects(projection,!zero),
      lights:referenceLights(mode,right,up,toward),
      environment:{ambient:zero?0:relit?.15:mode==='day'?2.9:2.7,
        color:'#ffffff',exposure:1,emission:false}});
    engine.setCamera(target,visibleSourceWidth/(2*FRAME.pixelsPerMetre));
    if(orbit){engine.camera.position.addScaledVector(right,orbit);engine.camera.lookAt(...target);}
    engine.setDebugView(view);
    engine.render();
    let peak=0;const pixels=engine.pixels();
    for(let i=0;i<pixels.length;i+=4)peak=Math.max(peak,pixels[i],pixels[i+1],pixels[i+2]);
    // Pixel-accuracy acceptance uses the official source painting, not a redrawn mock-up.
    // gl.readPixels is bottom-up; the canonical image canvas is top-down.
    let referenceMae=null;
    if(!zero&&!relit&&!orbit&&canvas.width&&canvas.height){
      const source=textures[mode].image;
      const expected=document.createElement('canvas');
      expected.width=canvas.width;expected.height=canvas.height;
      const context=expected.getContext('2d',{willReadFrequently:true});
      context.imageSmoothingEnabled=true;
      context.drawImage(source,centerX-visibleSourceWidth/2,0,visibleSourceWidth,FRAME.height,
        0,0,canvas.width,canvas.height);
      const reference=context.getImageData(0,0,canvas.width,canvas.height).data;
      let total=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        const sourceIndex=(y*canvas.width+x)*4;
        const gpuIndex=((canvas.height-1-y)*canvas.width+x)*4;
        for(let channel=0;channel<3;channel++)
          total+=Math.abs(reference[sourceIndex+channel]-pixels[gpuIndex+channel]);
      }
      referenceMae=total/(canvas.width*canvas.height*3);
    }
    lastGeometry={...projection.stats,mode,district,orbit,framebuffer:[canvas.width,canvas.height],
      peakRgb:peak,referenceMae,objectCount:projection.volumes.length+1,
      drawCalls:engine.diagnostics().drawCalls,selectedCameraSourceWidth:visibleSourceWidth,
      renderer:engine.diagnostics().backend};
    status.textContent=JSON.stringify(lastGeometry);
    status.dataset.error='false';
    document.documentElement.dataset.town3dReady='true';
    document.documentElement.dataset.town3dPeakRgb=String(peak);
  }
  const observer=new ResizeObserver(render);
  observer.observe(canvas);
  const api={
    getState:()=>({ready:true,...lastGeometry}),
    setMode(next){if(!VALID_MODES.has(next))throw new RangeError('Invalid Town lighting');mode=next;render();},
    setDistrict(next){if(!VALID_DISTRICTS.has(next))throw new RangeError('Invalid Town district');district=next;render();},
    setOrbit(next){if(!Number.isFinite(next)||Math.abs(next)>2)throw new RangeError('Invalid review orbit');orbit=next;render();},
    setView(next){if(!['lit','geometry','normals','albedo'].includes(next))throw new RangeError('Invalid debug view');view=next;render();},
    pixelSample:()=>[...engine.pixels()],render,
    dispose(){disposed=true;observer.disconnect();engine.dispose();}
  };
  render();
  return api;
}
export async function mountTown3DReview(){
  const canvas=document.getElementById('town3d-canvas');
  const status=document.getElementById('town3d-status');
  try{
    const api=await initializeTown3DReview(canvas,status);
    window.__town3dReview=api;
    for(const [id,method] of [['town3d-mode','setMode'],['town3d-district','setDistrict'],
      ['town3d-view','setView']]){
      const element=document.getElementById(id);
      if(element){
        const initial=api.getState();
        if(id==='town3d-mode')element.value=initial.mode;
        if(id==='town3d-district')element.value=initial.district;
        element.addEventListener('change',event=>api[method](event.target.value));
      }
    }
    document.getElementById('town3d-orbit')?.addEventListener('input',event=>
      api.setOrbit(Number(event.target.value)));
    window.addEventListener('pagehide',()=>api.dispose(),{once:true});
  }catch(error){
    status.textContent='Town 3D preview failed: '+error.message;
    status.dataset.error='true';
    throw error;
  }
}
