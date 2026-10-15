import {frameAtTime,sourceRectangle} from './playback.mjs';
const atlas=await fetch('atlas.json').then(r=>r.json());
const images=Object.fromEntries(await Promise.all(Object.entries(atlas.states).map(async([state,entry])=>{
 const image=new Image();image.src=entry.file;await image.decode();return [state,image];
})));
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let elapsed=0,last=performance.now(),playing=true;
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';};
document.querySelector('#phase').oninput=e=>{elapsed=Number(e.target.value)/atlas.framesPerSecond;playing=false;document.querySelector('#play').textContent='Play';};
function draw(now){
 if(playing)elapsed+=Math.min(.1,(now-last)/1000);last=now;
 const image=images[document.querySelector('#state').value],frame=frameAtTime(elapsed,atlas);
 ctx.fillStyle='#111b1a';ctx.fillRect(0,0,576,328);
 atlas.directions.forEach((direction,i)=>{
  const x=i%4*144,y=Math.floor(i/4)*160,rect=sourceRectangle(atlas,direction.name,frame);
  ctx.fillStyle='#1c2a28';ctx.fillRect(x+4,y+4,136,152);
  ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,x+8,y+20,128,128);
  ctx.fillStyle='#c7d3c8';ctx.font='13px sans-serif';ctx.fillText(direction.name,x+14,y+22);
 });
 document.querySelector('#phase').value=frame;document.querySelector('#frame').textContent=`${frame+1}/32`;
 requestAnimationFrame(draw);
}requestAnimationFrame(draw);
