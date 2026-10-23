// Bounded character-art proof using the game's actual ground and actor renderers.
import { CELL, GROUND_ATLAS_URL, buildGroundQuiltAtlas, drawReferenceGroundBoard, drawGroundMaterialTransitions } from '../../js/arena-materials.js';
import { groundFoundationBoard } from '../../js/arena-ground-foundation.js';
import { drawMage } from '../../js/arena-mage.js';
import { loadArt } from '../../js/art-atlas.js';
import { preloadHollowSprites, createHollowState, drawHollowEnemy } from '../../js/hollow-sprites.js';
const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d'),base=new URL('../../art/review/ashfang-pixel-proof-001/',import.meta.url),cache=new Map();
let time=0,last=null,paused=false,behind=false,ready=false;const errors=[];let manifest,ground;
for(const d of ['E','SE','S','SW','W','NW','N','NE'])$('facing').add(new Option(d,d));$('facing').value='SE';
const hollow=createHollowState();hollow.entities.set(101,{clip:'walk',frame:0,direction:'SE',layered:false});
async function image(url){const im=new Image();im.src=url;await im.decode();return im}
function texture(path){if(!cache.has(path)){const im=new Image();im.onerror=()=>errors.push(path);im.src=new URL(path,base);cache.set(path,im)}return cache.get(path)}
async function initialize(){
 const response=await fetch(new URL('manifest.json',base));if(!response.ok)throw Error('Pixel proof manifest unavailable');manifest=await response.json();
 const [source,mage,hollowReady]=await Promise.all([image(GROUND_ATLAS_URL),loadArt(new URL('../../art/',import.meta.url).href),preloadHollowSprites()]);if(!mage||!hollowReady)throw Error('Game comparison artwork unavailable');
 const atlas=buildGroundQuiltAtlas(source,1204,undefined,false),board=groundFoundationBoard(1204,true);ground=document.createElement('canvas');ground.width=60*CELL;ground.height=96*CELL;const g=ground.getContext('2d');if(!drawReferenceGroundBoard(g,board,atlas,60,96,1204))throw Error('Actual arena ground failed');drawGroundMaterialTransitions(g,board,atlas,60,96,1204);ready=true;
}
function reset(){time=0;last=null;$('timeline').value=0}for(const id of ['look','clip','facing'])$(id).onchange=reset;
$('play').onclick=()=>{paused=!paused;$('play').textContent=paused?'Play':'Pause'};$('step').onclick=()=>{paused=true;time+=1/12;$('play').textContent='Play'};$('depth').onclick=()=>{behind=!behind;$('depth').textContent=behind?'Move mage in front':'Move mage behind'};
$('timeline').oninput=()=>{paused=true;$('play').textContent='Play';time=Number($('timeline').value)*manifest.variants[$('look').value].clips[$('clip').value].duration};
function draw(now){const dt=last==null?0:Math.min(.1,(now-last)/1000);last=now;if(!paused)time+=dt;const box=canvas.getBoundingClientRect(),w=Math.round(box.width),h=Math.round(box.height),dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==w*dpr||canvas.height!==h*dpr){canvas.width=w*dpr;canvas.height=h*dpr}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#202a22';ctx.fillRect(0,0,w,h);
 if(ready){ctx.drawImage(ground,-Math.round((ground.width-w)/2),-400);const variant=manifest.variants[$('look').value],clip=variant.clips[$('clip').value],phase=clip.loop?time%clip.duration:Math.min(time,clip.duration),index=Math.min(clip.frames-1,Math.floor(phase*12+1e-6)),facing=$('facing').value,dir=clip.facings[facing],r=dir.frames[index],im=texture(dir.image),scale=manifest.worldCell/variant.cell;
 const x=Math.round(w/2),y=Math.round(h*.66),mageX=x-67,mageY=y+(behind?-30:37),hollowX=x+93,hollowY=y+16;ctx.fillStyle='rgba(7,9,14,.30)';ctx.beginPath();ctx.ellipse(x,y+2,25,8,0,0,Math.PI*2);ctx.fill();
 const actors=[{depth:y,draw(){if(im.complete&&im.naturalWidth)ctx.drawImage(im,...r.rect,Math.round(x-r.pivot[0]*scale),Math.round(y-r.pivot[1]*scale),manifest.worldCell,manifest.worldCell)}},{depth:mageY+12,draw(){drawMage(ctx,{x:mageX,y:mageY,radius:12},null,false,false,null,0,'E')}},{depth:hollowY+10,draw(){drawHollowEnemy(ctx,{entityId:101,kind:0,x:hollowX,y:hollowY,radius:11},hollow)}}];actors.sort((a,b)=>a.depth-b.depth);for(const actor of actors)actor.draw();
 ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#e6dbc2';ctx.fillText('Mage',mageX,mageY+39);ctx.fillText('Hollow',hollowX,hollowY+31);ctx.textAlign='start';$('timeline').value=phase/clip.duration;$('status').textContent=`${$('look').selectedOptions[0].textContent} | ${$('clip').selectedOptions[0].textContent} | ${facing} | frame ${index+1}/${clip.frames}${errors.length?' | IMAGE ERROR':''}`;window.ashfangPixelProof={ready:true,variant:$('look').value,clip:$('clip').value,frame:index,facing,paused,behind,loaded:cache.size,errors,paletteColors:manifest.palette.length,worldCell:manifest.worldCell,groundSeed:1204,actualMage:true,actualHollow:true,depths:actors.map(a=>a.depth),runtimeIntegrated:false};}
 requestAnimationFrame(draw)}
initialize().catch(e=>{errors.push(e.message);$('status').textContent=e.message;console.error(e)});requestAnimationFrame(draw);
