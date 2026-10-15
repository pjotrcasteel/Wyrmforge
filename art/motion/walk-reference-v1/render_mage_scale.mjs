import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {drawView} from './render.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const canvas=createCanvas(720,480),ctx=canvas.getContext('2d');ctx.fillStyle='#111b1a';ctx.fillRect(0,0,720,480);
for(const [row,state] of ['cleaned','hurt','critical'].entries()){
 const d=JSON.parse(readFileSync(new URL(`./mage-${state}-motion.json`,import.meta.url)));
 ctx.fillStyle='#d7ddcc';ctx.font='14px sans-serif';ctx.fillText(['Healthy','Hurt','Critical'][row],12,row*150+23);
 for(let i=0;i<4;i++){
  const large=createCanvas(320,370),lc=large.getContext('2d');
  drawView(lc,d,i/4,{x:0,y:0,width:320,height:370,yaw:45,pitch:25,travel:false,contacts:false,label:''});
  // Crop the scene to exclude diagnostic captions; resample the body to ~75 px.
  ctx.drawImage(large,70,65,185,265,120+i*145,row*150+20,74,106);
 }
}
ctx.fillStyle='#a8b9ad';ctx.font='13px sans-serif';ctx.fillText('Game-size silhouette check · four stride phases · ~75 px body · carried staff',12,470);
writeFileSync(new URL('./mage-game-size.png',import.meta.url),canvas.toBuffer('image/png'));
