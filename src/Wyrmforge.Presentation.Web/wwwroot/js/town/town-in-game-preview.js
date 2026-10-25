// T2 opt-in integration seam. Real TownCrowd, native hotspots, progression,
// cutouts and established day/night settings remain authoritative.
// A failed WebGL initialization never hides the approved panorama.
import {initializeTown3DReview} from './town-canonical-review.js';

let current=null;
const sourceMode=image=>image?.src.includes('/day-active.webp')?'day':'night';
export async function mountTown3DInGamePreview(){
  if(current)return current.api.getState();
  const scene=document.querySelector('.refuge-canonical-scene');
  const canvas=scene?.querySelector('[data-town-3d-preview]');
  const status=scene?.querySelector('[data-town-3d-preview-status]');
  const painting=scene?.querySelector('.refuge-town-night-base');
  if(!scene||!canvas||!status||!painting)throw new Error('Missing canonical Town preview seam');
  const api=await initializeTown3DReview(canvas,status,
    {district:'center',mode:sourceMode(painting)});
  const fidelity=api.getState().referenceMae;
  if(!Number.isFinite(fidelity)||fidelity>=14){
    api.dispose();
    throw new Error('3D Town art mismatch: reference pixel MAE='+fidelity);
  }
  // Opt-in visual cutover only after the actual GPU output matches the old art.
  // All original actors and cropped foreground alpha layers still render above it.
  canvas.dataset.ready='true';
  const observer=new MutationObserver(()=>{
    const next=sourceMode(painting);
    if(api.getState().mode!==next){
      api.setMode(next);
      if((api.getState().referenceMae??Infinity)>=14)
        canvas.dataset.ready='false'; // fall back to the approved painting
      else canvas.dataset.ready='true';
    }
  });
  observer.observe(painting,{attributes:true,attributeFilter:['src']});
  current={api,observer,canvas,scene};
  window.__town3dInGamePreview={
    getState:()=>({
      ...api.getState(),
      existingNpcCount:scene.querySelectorAll('.refuge-town-citizen').length,
      existingHotspotCount:scene.querySelectorAll('.refuge-town-spot').length,
      approvedPaintingPreserved:!!scene.querySelector('.refuge-town-night-base'),
      cutoutCount:scene.querySelectorAll('.refuge-town-scenery-foreground').length
    })
  };
  return current.api.getState();
}
export function disposeTown3DInGamePreview(){
  if(!current)return;
  current.canvas.dataset.ready='false';
  current.observer.disconnect();
  current.api.dispose();
  current=null;
  delete window.__town3dInGamePreview;
}
