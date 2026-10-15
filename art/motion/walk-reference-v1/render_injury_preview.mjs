import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {drawView} from './render.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const variants=['cleaned','hurt','critical'].map(n=>JSON.parse(readFileSync(new URL(`./${process.argv[3] === 'mage' ? 'mage-' : ''}${n}-motion.json`,import.meta.url))));
const output=process.argv[2]; if(!output) throw Error('Pass output directory'); mkdirSync(output,{recursive:true});
// Equal cadence and travel: three synchronized strides at all injury levels.
for(let i=0;i<96;i++){
 const canvas=createCanvas(960,400),ctx=canvas.getContext('2d');
 variants.forEach((d,j)=>drawView(ctx,d,(i/30/d.duration)%1,{x:j*320,y:0,width:320,height:370,yaw:45,pitch:25,travel:false,contacts:true,label:['Healthy','Hurt · left leg','Critical · left leg'][j]}));
 ctx.fillStyle='#111b1a';ctx.fillRect(0,370,960,30);ctx.fillStyle='#a8b9ad';ctx.font='13px sans-serif';ctx.fillText(process.argv[3] === 'mage' ? 'Mage blocking study · healthy / hurt / critical · staff carried, not planted' : 'Body mechanics study · healthy / hurt / critical',16,390);
 writeFileSync(`${output}/frame-${String(i).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
}
