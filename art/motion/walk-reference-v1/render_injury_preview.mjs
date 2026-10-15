import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {drawView} from './render.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const variants=['cleaned','hurt','critical'].map(n=>JSON.parse(readFileSync(new URL(`./${n}-motion.json`,import.meta.url))));
const output=process.argv[2]; if(!output) throw Error('Pass output directory'); mkdirSync(output,{recursive:true});
// 6.4 seconds closes all three periods: 6 healthy, 5 hurt, 4 critical strides.
for(let i=0;i<192;i++){
 const canvas=createCanvas(960,400),ctx=canvas.getContext('2d');
 variants.forEach((d,j)=>drawView(ctx,d,(i/30/d.duration)%1,{x:j*320,y:0,width:320,height:370,yaw:45,pitch:25,travel:false,contacts:true,label:['Healthy','Hurt · left leg','Critical · left leg'][j]}));
 ctx.fillStyle='#111b1a';ctx.fillRect(0,370,960,30);ctx.fillStyle='#a8b9ad';ctx.font='13px sans-serif';ctx.fillText('Injury timing + guarded posture study · same skeleton · mage / staff retargeting pending',16,390);
 writeFileSync(`${output}/frame-${String(i).padStart(3,'0')}.png`,canvas.toBuffer('image/png'));
}
