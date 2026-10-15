import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {drawView} from './render.mjs';
import {blendMotion} from './blend_motion.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const healthy=JSON.parse(readFileSync(new URL('./mage-cleaned-motion.json',import.meta.url)));
const critical=JSON.parse(readFileSync(new URL('./mage-critical-motion.json',import.meta.url)));
const output=process.argv[2];if(!output)throw Error('Pass output directory');mkdirSync(output,{recursive:true});
for(let i=0;i<128;i++){
 const w=(1-Math.cos(2*Math.PI*i/128))/2,data=blendMotion(healthy,critical,w);
 const canvas=createCanvas(640,370),ctx=canvas.getContext('2d');
 const phase=(i/32)%1,cycles=Math.floor(i/32);
 for(const [x,d,label] of [[0,healthy,'Healthy reference'],[320,data,'Injury appearance → recovery']])
  drawView(ctx,d,phase,{x,y:0,width:320,height:340,yaw:45,pitch:25,travel:true,contacts:false,cycles,label});
 ctx.fillStyle='#111b1a';ctx.fillRect(0,340,640,30);ctx.fillStyle='#b9c4b7';ctx.font='12px sans-serif';
 ctx.fillText('Same travel and cadence · visual pose blend only · gameplay unaffected',12,359);
 writeFileSync(`${output}/frame-${String(i).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
}
