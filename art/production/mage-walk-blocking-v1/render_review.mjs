import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {sourceRectangle} from './playback.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const atlas=JSON.parse(readFileSync(new URL('./atlas.json',import.meta.url))),output=process.argv[2];
if(!output)throw Error('Pass a scratch frame directory');mkdirSync(output,{recursive:true});
const images=await Promise.all(['healthy','critical'].map(s=>loadImage(new URL(`./${atlas.states[s].file}`,import.meta.url).pathname)));
for(let f=0;f<32;f++){
 const canvas=createCanvas(576,680),ctx=canvas.getContext('2d');ctx.fillStyle='#111b1a';ctx.fillRect(0,0,576,680);
 for(let state=0;state<2;state++){
  ctx.fillStyle='#d7ddcc';ctx.font='16px sans-serif';ctx.fillText(state?'Critical · same cadence':'Healthy · eight directions',12,state*330+24);
  atlas.directions.forEach((d,i)=>{
   const x=(i%4)*144,y=state*330+36+Math.floor(i/4)*142,r=sourceRectangle(atlas,d.name,f);
   ctx.fillStyle='#182523';ctx.fillRect(x+4,y,136,136);
   ctx.drawImage(images[state],r.x,r.y,r.width,r.height,x+8,y,128,128);
   ctx.fillStyle='#a9bbb0';ctx.font='12px sans-serif';ctx.fillText(d.name,x+16,y+18);
  });
 }
 ctx.fillStyle='#a9bbb0';ctx.font='12px sans-serif';ctx.fillText('Motion sprites · same model / staff hand / scale · painted art pending',12,673);
 writeFileSync(`${output}/frame-${String(f).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
 if(f===8)writeFileSync(new URL('./direction-review.png',import.meta.url),canvas.toBuffer('image/png'));
}
