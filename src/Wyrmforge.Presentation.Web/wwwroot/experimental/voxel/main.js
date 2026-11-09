import { VoxelWorld, MATERIAL, COLORS } from './world.js';
const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d', { alpha: false });
const stats = document.querySelector('#stats');
let world = new VoxelWorld(42);
let cameraX = 0, cameraY = 0, zoom = 1, cutaway = false, last = performance.now(), fps = 60;
let pointer = null, dirty = true;
const TILE_W = 36, TILE_H = 18, ELEVATION = 5;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  dirty = true;
}
addEventListener('resize', resize);
function project(x, y, z) {
  return { x: innerWidth / 2 + ((x - cameraX) - (y - cameraY)) * TILE_W * zoom / 2,
    y: innerHeight * .42 + ((x - cameraX) + (y - cameraY)) * TILE_H * zoom / 2 - (z - 20) * ELEVATION * zoom };
}
function polygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fill();
}
function shade(hex, factor) {
  const n = parseInt(hex.slice(1),16);
  const c = k => Math.max(0,Math.min(255,Math.round(k*factor)));
  return `rgb(${c(n>>16)},${c((n>>8)&255)},${c(n&255)})`;
}
function drawColumn(x,y) {
  const top = world.top(x,y);
  if(top.z<0)return;
  const z = top.z + 1;
  const a=project(x,y,z),b=project(x+1,y,z),c=project(x+1,y+1,z),d=project(x,y+1,z);
  const color=COLORS[top.material];
  const neighborX=world.top(x+1,y).z+1, neighborY=world.top(x,y+1).z+1;
  if(neighborX<z) {
    const low=Math.max(neighborX,0);
    const b2=project(x+1,y,low),c2=project(x+1,y+1,low);
    polygon([b,c,c2,b2],shade(color,.67));
  }
  if(neighborY<z) {
    const low=Math.max(neighborY,0);
    const c2=project(x+1,y+1,low),d2=project(x,y+1,low);
    polygon([d,c,c2,d2],shade(color,.78));
  }
  polygon([a,b,c,d],color);
}
function drawSlice() {
  const x0=-14, x1=14, y=0;
  const cell=12*zoom, left=innerWidth/2-14*cell, bottom=innerHeight*.79;
  for(let x=x0;x<x1;x++)for(let z=0;z<32;z++){
    const m=world.get(x,y,z);
    if(m===MATERIAL.AIR)continue;
    ctx.fillStyle=COLORS[m];
    ctx.fillRect(left+(x-x0)*cell,bottom-(z+1)*cell,Math.ceil(cell),Math.ceil(cell));
  }
}
function draw() {
  ctx.fillStyle='#182431';ctx.fillRect(0,0,innerWidth,innerHeight);
  if(cutaway){drawSlice();return;}
  // Prototype deliberately draws a bounded neighborhood; chunk culling comes next.
  const radius=17;
  const minX=Math.floor(cameraX)-radius,maxX=Math.floor(cameraX)+radius;
  const minY=Math.floor(cameraY)-radius,maxY=Math.floor(cameraY)+radius;
  for(let sum=minX+minY;sum<=maxX+maxY;sum++)
    for(let x=minX;x<=maxX;x++){
      const y=sum-x;
      if(y<minY||y>maxY)continue;
      drawColumn(x,y);
    }
}
function frame(now) {
  const dt=Math.min(now-last,1000);last=now;
  fps=fps*.92+(1000/Math.max(dt,1))*.08;
  if(dirty){draw();dirty=false;}
  stats.textContent=`${Math.round(fps)} FPS · ${world.chunks.size} chunks · ${world.revision} edits`;
  requestAnimationFrame(frame);
}
function blast(x,y){
  const z=world.top(Math.round(x),Math.round(y)).z;
  const removed=world.explode(Math.round(x),Math.round(y),z,4);
  world.consumeDirty();
  dirty=true;
  stats.textContent=`${removed} voxels removed`;
}
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!pointer)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(Math.abs(dx)+Math.abs(dy)>2)pointer.moved=true;
  cameraX+=dx/(TILE_W*zoom)+dy/(TILE_H*zoom);
  cameraY+=dy/(TILE_H*zoom)-dx/(TILE_W*zoom);
  pointer.x=e.clientX;pointer.y=e.clientY;dirty=true;
});
canvas.addEventListener('pointerup',e=>{
  if(!pointer)return;
  if(!pointer.moved && !cutaway) {
    const sx=(e.clientX-innerWidth/2)/(TILE_W*zoom/2);
    const sy=(e.clientY-innerHeight*.42)/(TILE_H*zoom/2);
    blast(cameraX+(sx+sy)/2,cameraY+(sy-sx)/2);
  }
  pointer=null;
});
document.querySelector('#reset').onclick=()=>{world=new VoxelWorld(42);dirty=true;};
document.querySelector('#explode').onclick=()=>blast(cameraX,cameraY);
document.querySelector('#cutaway').onclick=e=>{cutaway=!cutaway;e.target.textContent=`Cross-section: ${cutaway?'on':'off'}`;dirty=true;};
resize();requestAnimationFrame(frame);
